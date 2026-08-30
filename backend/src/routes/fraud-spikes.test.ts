import test from 'node:test';
import assert from 'node:assert/strict';

import { buildFallbackDashboardResponse, buildFallbackTrendsResponse } from './fraud-spikes';

test('dashboard fallback returns a valid payload when AI engine is unavailable', () => {
  const dashboard = buildFallbackDashboardResponse();

  assert.equal(typeof dashboard.totalSpikes, 'number');
  assert.ok(Array.isArray(dashboard.recentSpikes));
  assert.equal(typeof dashboard.attackContext.activeAttack, 'boolean');
});

test('trends fallback returns hourly data when AI engine is unavailable', () => {
  const trends = buildFallbackTrendsResponse();

  assert.ok(Array.isArray(trends.hourlyTrends));
  assert.equal(trends.hourlyTrends.length, 24);
  assert.ok(typeof trends.hourlyTrends[0].hour === 'string');
});
