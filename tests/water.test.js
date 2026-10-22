const { test } = require('node:test');
const assert = require('node:assert');
const w = require('../water.js');

test('dashboard has five zones with all readings', () => {
  assert.strictEqual(w.zones.length, 5);
  for (const z of w.zones) {
    assert.ok(z.name && z.timing);
    assert.strictEqual(typeof z.reservoir, 'number');
    assert.strictEqual(typeof z.supply, 'number');
    assert.strictEqual(typeof z.pressure, 'number');
  }
});

test('pressure of 2 and 5 bar is normal', () => {
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 2, reservoir: 50 }).length, 0);
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 5, reservoir: 50 }).length, 0);
});

test('pressure outside 2 to 5 bar raises an alert', () => {
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 1.9, reservoir: 50 })[0].priority, 'Critical');
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 5.1, reservoir: 50 })[0].priority, 'High');
});

test('reservoir below 25% raises an alert', () => {
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 3, reservoir: 24 }).length, 1);
  assert.strictEqual(w.getAlerts({ name: 'T', pressure: 3, reservoir: 25 }).length, 0);
});

test('total supply and highest consumption', () => {
  assert.strictEqual(w.totalSupply(w.zones), 6430);
  assert.strictEqual(w.highestConsumption(w.zones).name, 'Central');
});

test('zone filter returns one zone and its leakages', () => {
  assert.strictEqual(w.filterZones('Z02').length, 1);
  assert.strictEqual(w.totalSupply(w.filterZones('Z02')), 980);
  assert.deepStrictEqual(w.getLeaks('Z02').map(l => l.id), ['LK-101']);
  assert.strictEqual(w.getLeaks('Z03').length, 0);
});

test('leakages are sorted by severity', () => {
  assert.deepStrictEqual(w.getLeaks('all').map(l => l.severity), ['Critical', 'High', 'Low']);
});
