const zoneFilter = document.getElementById('zoneFilter');

function render() {
  const selected = zoneFilter.value;
  const list = filterZones(selected);

  // Zone table
  document.getElementById('zoneRows').innerHTML = list.map(z => `
    <tr>
      <td>${z.id} - ${z.name}</td>
      <td>${z.reservoir}%</td>
      <td>${z.supply}</td>
      <td>${z.consumption}</td>
      <td>${z.pressure.toFixed(1)}</td>
      <td>${z.timing}</td>
      <td>${getStatus(z) === 'Alert' ? '<b>Alert</b>' : 'Normal'}</td>
    </tr>`).join('');

  // Alerts, highest priority first
  const alerts = list.flatMap(getAlerts).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
  document.getElementById('alertList').innerHTML = alerts.length
    ? alerts.map(a => `<li>[${a.priority}] ${a.zone}: ${a.message}</li>`).join('')
    : '<li>No active alerts</li>';

  // Zone analytics
  const top = highestConsumption(list);
  document.getElementById('totalSupply').textContent = totalSupply(list) + ' kL';
  document.getElementById('highestZone').textContent = top ? `${top.name} (${top.consumption} kL)` : '-';

  // Leakage incidents
  const leakList = getLeaks(selected);
  document.getElementById('openLeaks').textContent = leakList.filter(l => l.status !== 'Resolved').length;
  document.getElementById('leakRows').innerHTML = leakList.length
    ? leakList.map(l => `
    <tr>
      <td>${l.id}</td>
      <td>${zoneName(l.zoneId)}</td>
      <td>${l.severity}</td>
      <td>${l.detected}</td>
      <td>${l.status}</td>
    </tr>`).join('')
    : '<tr><td colspan="5">No leakage incidents in this zone</td></tr>';

  document.getElementById('updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
}

zones.forEach(z => zoneFilter.add(new Option(z.name, z.id)));
zoneFilter.addEventListener('change', render);
document.getElementById('refreshBtn').addEventListener('click', render);
render();
