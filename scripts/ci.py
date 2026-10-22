"""Build, test, push, deploy and rollback helper called by the Jenkinsfile."""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ACTION = sys.argv[1]
REPO = 'pdgamersg/smart-water-monitor'
RELEASE = os.environ.get('RELEASE', '1.0')
BUILD = os.environ.get('BUILD_NUMBER', 'local')
IMAGE = f'{REPO}:{RELEASE}-b{BUILD}'
NAMESPACE = 'water-monitoring'
REPORTS = Path('reports')
REPORTS.mkdir(exist_ok=True)
STATE = REPORTS / 'release.json'


def log(text):
    print(text, flush=True)
    with open(REPORTS / f'{ACTION}.txt', 'a', encoding='utf-8') as f:
        f.write(text + '\n')


def run(cmd, check=True):
    log('> ' + ' '.join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    log((result.stdout + result.stderr).strip())
    if check and result.returncode != 0:
        raise RuntimeError(f'command failed with exit code {result.returncode}')
    return result


def kubectl(*args, check=True):
    return run(['kubectl', '--context=docker-desktop', '-n', NAMESPACE, *args], check)


def get(url):
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, ''


def wait_for(url):
    for _ in range(30):
        try:
            return get(url)
        except OSError:
            time.sleep(1)
    raise RuntimeError('no response from ' + url)


def deployed_image():
    out = kubectl('get', 'deployment', 'smart-water', '-o', 'jsonpath={.spec.template.spec.containers[0].image}', check=False)
    return out.stdout.strip() if out.returncode == 0 else None


def validate():
    for name in ['index.html', 'Dockerfile', 'Jenkinsfile', 'deployment.yaml']:
        assert Path(name).is_file(), name + ' is missing'
    kubectl('apply', '--dry-run=server', '-f', 'deployment.yaml')
    log('Required files present and deployment.yaml is valid.')


def build():
    run(['docker', 'build', '--build-arg', f'RELEASE={RELEASE}', '-t', IMAGE, '.'])
    run(['docker', 'image', 'ls', REPO])


def test():
    name = f'water-test-{BUILD}'
    run(['docker', 'rm', '-f', name], check=False)
    run(['docker', 'run', '-d', '--name', name, '-p', '127.0.0.1:18095:8080', IMAGE])
    try:
        code, body = wait_for('http://127.0.0.1:18095/')
        assert code == 200 and 'Smart Water Distribution Dashboard' in body
        assert f'Release {RELEASE}' in body
        for asset in ['style.css', 'water.js', 'app.js']:
            assert get('http://127.0.0.1:18095/' + asset)[0] == 200, asset
        log(f'Container test passed: dashboard and assets return HTTP 200 (Release {RELEASE}).')
    finally:
        run(['docker', 'rm', '-f', name], check=False)


def push():
    login = subprocess.run(['docker', 'login', '-u', os.environ['DOCKER_USER'], '--password-stdin'],
                           input=os.environ['DOCKER_PASS'], capture_output=True, text=True)
    if login.returncode != 0:
        raise RuntimeError('Docker Hub login failed')
    log('Logged in to Docker Hub as ' + os.environ['DOCKER_USER'])
    run(['docker', 'push', IMAGE])


def deploy():
    previous = deployed_image()
    STATE.write_text(json.dumps({'candidate': IMAGE, 'previous': previous}, indent=2))
    log(f'Current stable image: {previous}')
    log(f'Deploying new image:  {IMAGE}')
    manifest = Path('deployment.yaml').read_text().replace(f'{REPO}:latest', IMAGE)
    (REPORTS / 'deployment-applied.yaml').write_text(manifest)
    kubectl('apply', '-f', str(REPORTS / 'deployment-applied.yaml'))
    status = kubectl('rollout', 'status', 'deployment/smart-water', '--timeout=90s', check=False)
    if status.returncode != 0:
        log('ROLLOUT FAILED: the new pods did not become ready.')
        kubectl('get', 'pods', '-l', 'app=smart-water', '-o', 'wide', check=False)
        kubectl('describe', 'deployment', 'smart-water', check=False)
        kubectl('get', 'events', '--field-selector', 'reason=Unhealthy', check=False)
        raise RuntimeError('rollout of ' + IMAGE + ' failed')
    log('Rollout successful. Both replicas are ready.')


def rollback():
    previous = json.loads(STATE.read_text())['previous']
    if not previous:
        raise RuntimeError('there is no previous release to roll back to')
    kubectl('rollout', 'undo', 'deployment/smart-water')
    kubectl('rollout', 'status', 'deployment/smart-water', '--timeout=90s')
    restored = deployed_image()
    assert restored == previous, f'expected {previous}, found {restored}'
    log('ROLLBACK COMPLETE: restored ' + restored)


def verify():
    image = deployed_image()
    kubectl('get', 'deployment,pods,svc', '-o', 'wide')
    kubectl('rollout', 'history', 'deployment/smart-water')
    forward = subprocess.Popen(['kubectl', '--context=docker-desktop', '-n', NAMESPACE, 'port-forward',
                                'svc/smart-water', '18096:80'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        health, _ = wait_for('http://127.0.0.1:18096/healthz')
        code, body = get('http://127.0.0.1:18096/')
        assert health == 200, f'health check returned {health}'
        assert code == 200 and 'Leakage Incidents' in body
        release = body.split('Release ')[1].split('<')[0]
        log(f'APPLICATION VERIFIED: {image} | dashboard HTTP {code} | /healthz HTTP {health} | Release {release}')
    finally:
        forward.terminate()


if __name__ == '__main__':
    actions = {'validate': validate, 'build': build, 'test': test, 'push': push,
               'deploy': deploy, 'rollback': rollback, 'verify': verify}
    try:
        actions[ACTION]()
    except Exception as error:
        log(f'ERROR: {error}')
        sys.exit(1)
