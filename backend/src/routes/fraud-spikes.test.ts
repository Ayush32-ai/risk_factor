import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFallbackDashboardResponse, buildFallbackTrendsResponse, buildLiveFraudSpikeDashboard } from './fraud-spikes';

test('dashboard fallback returns a valid payload when AI engine is unavailable', () => {
  const dashboard = buildFallbackDashboardResponse();

  assert.equal(typeof dashboard.totalSpikes, 'number');
  assert.ok(Array.isArray(dashboard.recentSpikes));
  assert.equal(typeof dashboard.attackContext.activeAttack, 'boolean');
});

test('live dashboard reflects the active attack simulation', () => {
  const dashboard = buildLiveFraudSpikeDashboard({
    scenario: 'Distributed Account Network',
    generation: 12,
    detection_rate: 21.4,
    blind_spot_discovered: true,
    transactions_count: 84291,
  });

  assert.equal(dashboard.attackContext.activeAttack, true);
  assert.equal(dashboard.attackContext.attackScenario, 'Distributed Account Network');
  assert.ok(dashboard.totalSpikes > 0);
  assert.ok(Array.isArray(dashboard.recentSpikes));
  assert.ok(dashboard.recentSpikes.length > 0);
  assert.ok(dashboard.recentSpikes[0].timeframe.includes('Gen') || dashboard.recentSpikes[0].timeframe.includes('minutes'));
});

test('trends fallback returns hourly data when AI engine is unavailable', () => {
  const trends = buildFallbackTrendsResponse();

  assert.ok(Array.isArray(trends.hourlyTrends));
  assert.equal(trends.hourlyTrends.length, 24);
  assert.ok(typeof trends.hourlyTrends[0].hour === 'string');
});
