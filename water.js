// Simulated water network data for the dashboard
const LIMITS = { minPressure: 2.0, maxPressure: 5.0, minReservoir: 25 };
const PRIORITY = { Critical: 1, High: 2, Medium: 3, Low: 4 };

const zones = [
  { id: 'Z01', name: 'North',   reservoir: 78, supply: 1200, consumption: 1100, pressure: 3.4, timing: '06:00-09:00, 18:00-20:00' },
  { id: 'Z02', name: 'South',   reservoir: 22, supply: 980,  consumption: 890,  pressure: 1.6, timing: '05:00-08:00, 17:00-19:00' },
  { id: 'Z03', name: 'East',    reservoir: 64, supply: 1450, consumption: 1380, pressure: 3.8, timing: '06:00-10:00, 18:00-21:00' },
  { id: 'Z04', name: 'West',    reservoir: 47, supply: 1100, consumption: 1020, pressure: 5.7, timing: '05:30-08:30, 17:30-20:00' },
  { id: 'Z05', name: 'Central', reservoir: 85, supply: 1700, consumption: 1610, pressure: 4.1, timing: '06:00-10:00, 18:00-22:00' }
];

const leaks = [
  { id: 'LK-101', zoneId: 'Z02', severity: 'Critical', detected: '22-10-2026 06:40', status: 'Team dispatched' },
  { id: 'LK-102', zoneId: 'Z04', severity: 'High',     detected: '22-10-2026 07:05', status: 'Inspection scheduled' },
  { id: 'LK-103', zoneId: 'Z01', severity: 'Low',      detected: '22-10-2026 05:30', status: 'Resolved' }
];

// Pressure must stay between 2 and 5 bar, reservoir must stay at 25% or above
function getAlerts(zone) {
  const alerts = [];
  if (zone.pressure < LIMITS.minPressure) {
    alerts.push({ zone: zone.name, priority: 'Critical', message: 'Low pressure ' + zone.pressure + ' bar, check for leakage' });
  }
  if (zone.pressure > LIMITS.maxPressure) {
    alerts.push({ zone: zone.name, priority: 'High', message: 'High pressure ' + zone.pressure + ' bar, check the control valve' });
  }
  if (zone.reservoir < LIMITS.minReservoir) {
    alerts.push({ zone: zone.name, priority: 'Critical', message: 'Reservoir at ' + zone.reservoir + '%, below 25%' });
  }
  return alerts;
}

function getStatus(zone) {
  return getAlerts(zone).length > 0 ? 'Alert' : 'Normal';
}

function filterZones(zoneId) {
  return zoneId === 'all' ? zones : zones.filter(z => z.id === zoneId);
}

function zoneName(zoneId) {
  return zones.find(z => z.id === zoneId).name;
}

// Leakage incidents for the selected zone, most severe first
function getLeaks(zoneId) {
  return leaks
    .filter(l => zoneId === 'all' || l.zoneId === zoneId)
    .sort((a, b) => PRIORITY[a.severity] - PRIORITY[b.severity]);
}

function totalSupply(list) {
  return list.reduce((sum, z) => sum + z.supply, 0);
}

function highestConsumption(list) {
  return list.reduce((top, z) => (top === null || z.consumption > top.consumption ? z : top), null);
}

if (typeof module !== 'undefined') {
  module.exports = { LIMITS, PRIORITY, zones, leaks, getAlerts, getStatus, filterZones, zoneName, getLeaks, totalSupply, highestConsumption };
}
