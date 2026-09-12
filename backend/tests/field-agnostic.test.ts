import assert from 'node:assert/strict';
import { ThingSpeakService } from '../src/services/thingspeak.service.js';
import { ExportService } from '../src/modules/export/export.service.js';
import { ThingSpeakChannelMeta, ThingSpeakRawFeed } from '../src/types/thingspeak.types.js';
import { DeviceFieldMapping } from '../src/types/mapping.types.js';

async function runFieldAgnosticTests() {
  console.log('====================================================');
  console.log('--- Running Field-Agnostic Architecture Tests ---');
  console.log('====================================================');

  const tsService = new ThingSpeakService();
  const exportService = new ExportService();

  // ----------------------------------------------------
  // TEST LAYOUT A: Cold + Cold (Field 1 = Cold Fold 1, Field 2 = Cold Fold 2)
  // ----------------------------------------------------
  console.log('\nTest A: Layout Cold + Cold (2 Cold Fields)...');
  const channelMetaA: ThingSpeakChannelMeta = {
    id: 101,
    name: 'Dual Cold Bag',
    field1: 'Cold Fold 1',
    field2: 'Cold Fold 2',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const discoveredA = tsService.discoverChannelFields(channelMetaA);
  assert.equal(discoveredA.length, 2, 'Layout A must discover exactly 2 fields');
  assert.equal(discoveredA[0].label, 'Cold Fold 1');
  assert.equal(discoveredA[1].label, 'Cold Fold 2');
  assert.equal(discoveredA[0].zone, 'cold');
  assert.equal(discoveredA[1].zone, 'cold');

  const rawFeedA: ThingSpeakRawFeed = {
    created_at: '2026-09-12T10:00:00Z',
    entry_id: 1,
    field1: '4.2',
    field2: '5.1',
  };

  const normA = tsService.normalizeFeed(rawFeedA, 101, discoveredA);
  assert.equal(normA.fieldValues?.['field1'], 4.2);
  assert.equal(normA.fieldValues?.['field2'], 5.1);
  assert.equal(normA.coldTemperature, 4.2); // Derived legacy field
  console.log('✓ Test A passed: Cold + Cold layout preserved both fields.');

  // ----------------------------------------------------
  // TEST LAYOUT B: Hot + Hot (Field 1 = Hot Top, Field 2 = Hot Bottom)
  // ----------------------------------------------------
  console.log('\nTest B: Layout Hot + Hot (2 Hot Fields)...');
  const channelMetaB: ThingSpeakChannelMeta = {
    id: 102,
    name: 'Dual Hot Bag',
    field1: 'Hot Top',
    field2: 'Hot Bottom',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const discoveredB = tsService.discoverChannelFields(channelMetaB);
  assert.equal(discoveredB.length, 2);
  assert.equal(discoveredB[0].label, 'Hot Top');
  assert.equal(discoveredB[1].label, 'Hot Bottom');
  assert.equal(discoveredB[0].zone, 'hot');
  assert.equal(discoveredB[1].zone, 'hot');

  const rawFeedB: ThingSpeakRawFeed = {
    created_at: '2026-09-12T10:00:00Z',
    entry_id: 2,
    field1: '62.5',
    field2: '65.8',
  };

  const normB = tsService.normalizeFeed(rawFeedB, 102, discoveredB);
  assert.equal(normB.fieldValues?.['field1'], 62.5);
  assert.equal(normB.fieldValues?.['field2'], 65.8);
  assert.equal(normB.hotTemperature, 62.5);
  console.log('✓ Test B passed: Hot + Hot layout preserved both fields.');

  // ----------------------------------------------------
  // TEST LAYOUT G: Custom Arbitrary Fields (Battery, Door Status, Pressure, pH)
  // ----------------------------------------------------
  console.log('\nTest G: Layout Custom Arbitrary Fields (Battery, Door, Pressure, pH)...');
  const channelMetaG: ThingSpeakChannelMeta = {
    id: 107,
    name: 'Smart Container G',
    field1: 'Battery Voltage',
    field2: 'Door Status',
    field3: 'Barometric Pressure',
    field4: 'pH Level',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const discoveredG = tsService.discoverChannelFields(channelMetaG);
  assert.equal(discoveredG.length, 4);
  assert.equal(discoveredG[0].label, 'Battery Voltage');
  assert.equal(discoveredG[0].unit, 'V');
  assert.equal(discoveredG[1].label, 'Door Status');
  assert.equal(discoveredG[2].label, 'Barometric Pressure');
  assert.equal(discoveredG[2].unit, 'hPa');
  assert.equal(discoveredG[3].label, 'pH Level');

  const rawFeedG: ThingSpeakRawFeed = {
    created_at: '2026-09-12T10:00:00Z',
    entry_id: 7,
    field1: '12.4',
    field2: '1.0',
    field3: '1013.25',
    field4: '7.2',
  };

  const normG = tsService.normalizeFeed(rawFeedG, 107, discoveredG);
  assert.equal(normG.fieldValues?.['field1'], 12.4);
  assert.equal(normG.fieldValues?.['field2'], 1.0);
  assert.equal(normG.fieldValues?.['field3'], 1013.25);
  assert.equal(normG.fieldValues?.['field4'], 7.2);
  console.log('✓ Test G passed: Custom arbitrary fields preserved cleanly.');

  // ----------------------------------------------------
  // TEST LAYOUT H: 8 Fields Max Capacity
  // ----------------------------------------------------
  console.log('\nTest H: Layout 8 Configured Fields...');
  const channelMetaH: ThingSpeakChannelMeta = {
    id: 108,
    name: '8-Sensor Multi Bag',
    field1: 'Cold Compartment 1',
    field2: 'Cold Compartment 2',
    field3: 'Hot Compartment 1',
    field4: 'Hot Compartment 2',
    field5: 'Ambient Humidity',
    field6: 'Battery Level',
    field7: 'Door Status',
    field8: 'CO2 Concentration',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const discoveredH = tsService.discoverChannelFields(channelMetaH);
  assert.equal(discoveredH.length, 8, 'Must discover all 8 fields');
  assert.equal(discoveredH[7].label, 'CO2 Concentration');

  const rawFeedH: ThingSpeakRawFeed = {
    created_at: '2026-09-12T10:00:00Z',
    entry_id: 8,
    field1: '4.1',
    field2: '4.3',
    field3: '61.0',
    field4: '63.2',
    field5: '45.0',
    field6: '98.0',
    field7: '0.0',
    field8: '420.0',
  };

  const normH = tsService.normalizeFeed(rawFeedH, 108, discoveredH);
  assert.equal(Object.keys(normH.fieldValues || {}).length, 8);
  assert.equal(normH.fieldValues?.['field8'], 420.0);
  console.log('✓ Test H passed: All 8 dynamic fields preserved without dropping any.');

  // ----------------------------------------------------
  // TEST DISCOVERY FROM SAMPLE FEED WHEN LABELS ARE ABSENT
  // ----------------------------------------------------
  console.log('\nTest Unlabeled Channel Discovery from Feed Entries...');
  const channelMetaUnlabeled: ThingSpeakChannelMeta = {
    id: 999,
    name: 'Unlabeled Raw Channel',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };
  const sampleFeed: ThingSpeakRawFeed = {
    created_at: '2026-09-12T10:00:00Z',
    entry_id: 99,
    field1: '10.5',
    field2: '20.5',
    field3: '30.5',
  };

  const discoveredUnlabeled = tsService.discoverChannelFields(channelMetaUnlabeled, sampleFeed);
  assert.equal(discoveredUnlabeled.length, 3, 'Must discover 3 active fields from sample feed');
  assert.equal(discoveredUnlabeled[0].label, 'Field 1');
  assert.equal(discoveredUnlabeled[1].label, 'Field 2');
  assert.equal(discoveredUnlabeled[2].label, 'Field 3');
  console.log('✓ Test Unlabeled passed: Unlabeled channels discover active fields dynamically.');

  console.log('====================================================');
  console.log('✓ ALL FIELD-AGNOSTIC ARCHITECTURE TESTS PASSED!');
  console.log('====================================================');
}

runFieldAgnosticTests().catch((err) => {
  console.error('Field-agnostic unit test failed:', err);
  process.exit(1);
});
