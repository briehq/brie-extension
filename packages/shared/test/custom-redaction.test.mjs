import assert from 'node:assert/strict';
import test from 'node:test';

import {
  redactCustomPatterns,
  validateCustomRedactionPattern,
} from '../dist/lib/utils/custom-redaction-pattern.util.js';
import { deepRedactSensitiveInfo } from '../dist/lib/utils/redact-sensitive-info.util.js';

test('validates literal and raw custom patterns', () => {
  assert.deepEqual(validateCustomRedactionPattern('/api[_-]?key=[^&]+/gi'), {
    valid: true,
    parsed: { source: 'api[_-]?key=[^&]+', flags: 'gi' },
  });
  assert.deepEqual(validateCustomRedactionPattern('session-secret-[a-z0-9]+'), {
    valid: true,
    parsed: { source: 'session-secret-[a-z0-9]+', flags: 'gi' },
  });
});

test('rejects empty matches, backreferences, and nested quantifiers', () => {
  assert.equal(validateCustomRedactionPattern('/a*/g').valid, false);
  assert.equal(validateCustomRedactionPattern('/(a+)+$/g').valid, false);
  assert.equal(validateCustomRedactionPattern('/(secret)\\1/g').valid, false);
  assert.equal(validateCustomRedactionPattern('/(?<secret>token)\\k<secret>/g').valid, false);
});

test('redacts every nested match without mutating the captured record', () => {
  const record = {
    url: 'https://example.com/?api_key=abc123',
    storage: [{ key: 'custom', value: 'session-secret-deadbeef' }],
  };
  const safe = redactCustomPatterns(record, ['/api[_-]?key=[^&]+/gi', '/session-secret-[a-z0-9]+/gi']);

  assert.equal(record.url, 'https://example.com/?api_key=abc123');
  assert.equal(safe.url, 'https://example.com/?[REDACTED_BY_BRIE]');
  assert.equal(safe.storage[0].value, '[REDACTED_BY_BRIE]');
});

test('runs custom patterns after the built-in capture redactor', () => {
  const safe = deepRedactSensitiveInfo(
    { password: 'built-in-secret', note: 'tenant-code-customer-42' },
    'https://app.example.com',
    [],
    ['/tenant-code-[a-z0-9-]+/gi'],
  );

  assert.deepEqual(safe, {
    password: '[REDACTED_BY_BRIE]',
    note: '[REDACTED_BY_BRIE]',
  });
});
