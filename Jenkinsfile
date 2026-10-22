def rolloutFailed = false

pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
    }

    parameters {
        string(name: 'RELEASE', defaultValue: '1.0', description: 'Release number shown on the dashboard')
        booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Push to Docker Hub and deploy to Kubernetes')
    }

    environment {
        DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
        DOCKER_CONFIG = "${WORKSPACE}\\.docker-ci"
        PATH = "C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python313;C:\\Program Files\\nodejs;C:\\Program Files\\Docker\\Docker\\resources\\bin;C:\\ProgramData\\chocolatey\\bin;${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                bat 'git log -1 --oneline'
                bat 'if not exist reports mkdir reports'
            }
        }

        stage('Validate') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        bat 'node --test --test-reporter=spec --test-reporter=junit --test-reporter-destination=stdout --test-reporter-destination=reports/unit-tests.xml tests/water.test.js'
                    }
                }
                stage('Manifest Check') {
                    steps {
                        withCredentials([file(credentialsId: 'assessment10-kubeconfig', variable: 'KUBECONFIG')]) {
                            bat 'python scripts/ci.py validate'
                        }
                    }
                }
            }
        }

        stage('Build Image') {
            steps { bat 'python scripts/ci.py build' }
        }

        stage('Test Container') {
            steps { bat 'python scripts/ci.py test' }
        }

        stage('Push to Docker Hub') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    bat 'python scripts/ci.py push'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([file(credentialsId: 'assessment10-kubeconfig', variable: 'KUBECONFIG')]) {
                    script {
                        rolloutFailed = bat(returnStatus: true, script: 'python scripts/ci.py deploy') != 0
                        if (rolloutFailed) {
                            catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                                error('Rollout failed. Rolling back to the previous stable release.')
                            }
                        }
                    }
                }
            }
        }

        stage('Automatic Rollback') {
            when { expression { rolloutFailed } }
            steps {
                withCredentials([file(credentialsId: 'assessment10-kubeconfig', variable: 'KUBECONFIG')]) {
                    bat 'python scripts/ci.py rollback'
                }
            }
        }

        stage('Verify Application') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([file(credentialsId: 'assessment10-kubeconfig', variable: 'KUBECONFIG')]) {
                    bat 'python scripts/ci.py verify'
                }
            }
        }
    }

    post {
        always {
            junit testResults: 'reports/unit-tests.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true, fingerprint: true
            bat 'if exist .docker-ci rmdir /s /q .docker-ci'
        }
    }
}
