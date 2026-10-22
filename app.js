function render() {
  // Zone table
  document.getElementById('zoneRows').innerHTML = zones.map(z => `
    <tr>
      <td>${z.id} - ${z.name}</td>
      <td>${z.reservoir}%</td>
      <td>${z.supply}</td>
      <td>${z.pressure.toFixed(1)}</td>
      <td>${z.timing}</td>
      <td>${getStatus(z) === 'Alert' ? '<b>Alert</b>' : 'Normal'}</td>
    </tr>`).join('');

  // Alerts, highest priority first
  const alerts = zones.flatMap(getAlerts).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority]);
  document.getElementById('alertList').innerHTML = alerts.length
    ? alerts.map(a => `<li>[${a.priority}] ${a.zone}: ${a.message}</li>`).join('')
    : '<li>No active alerts</li>';

  document.getElementById('updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
}

document.getElementById('refreshBtn').addEventListener('click', render);
render();
