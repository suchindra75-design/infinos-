import assert from 'node:assert/strict';
import { updateDeviceSchema } from '../src/modules/device/device.validation.js';

console.log('====================================================');
console.log('--- Running Bag Archiving Unit Tests ---');
console.log('====================================================');

// Test 1: Zod validation for archiving
console.log('Test 1: Validating updateDeviceSchema with isArchived boolean...');
const validArchiveInput = updateDeviceSchema.parse({ isArchived: true });
assert.equal(validArchiveInput.isArchived, true, 'isArchived should parse as true');

const validUnarchiveInput = updateDeviceSchema.parse({ isArchived: false });
assert.equal(validUnarchiveInput.isArchived, false, 'isArchived should parse as false');

const invalidArchiveInput = updateDeviceSchema.safeParse({ isArchived: 'invalid' });
assert.equal(invalidArchiveInput.success, false, 'isArchived must be a boolean');

console.log('✓ Test 1 passed: updateDeviceSchema handles isArchived flag correctly.');

console.log('====================================================');
console.log('✓ ALL BAG ARCHIVING UNIT TESTS PASSED!');
console.log('====================================================');
