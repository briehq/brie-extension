// Pre-compile a single case-insensitive regex per list — keyMatches runs on every key of every
// network record, so the per-call `new RegExp(...)` cost was multiplied across thousands of calls.
const buildListRegex = (list: string[]): RegExp =>
  new RegExp(`(^|[^a-z0-9])(?:${list.map(s => s.replace(/_/g, '[_-]?')).join('|')})([^a-z0-9]|$)`, 'i');

const compiledListRegexes = new WeakMap<string[], RegExp>();
const getListRegex = (list: string[]): RegExp => {
  let re = compiledListRegexes.get(list);
  if (!re) {
    re = buildListRegex(list);
    compiledListRegexes.set(list, re);
  }
  return re;
};

const STRONG_KEYS = [
  'okta',
  'authorization',
  'oai-sc',
  'access_token',
  'refresh_token',
  'secret',
  'password',
  'api_key',
  'passcode',
  'otp',
  'token',
  'auth_token',
  'id_token',
  'oauth_token',
  'jwt',
  'private_key',
  'public_key',
  'session_token',
  'csrf_token',
  'sso_token',
  'encryption_key',
  'decryption_key',
  'social_security_number',
  'ssn',
  'card_number',
  'cc_number',
  'credit_card',
  'cvv',
  'bank_account',
  'routing_number',
  'iban',
  'bic',
  'pin',
  'api_secret',
  'auth_secret',
  'client_id',
  'client_secret',
  'aws_access_key',
  'aws_secret_key',
  'azure_key',
  'gcp_key',
  'stripe_key',
  'webhook_secret',
  'master_key',
  'vault_key',
  'sid',
  'sidcc',
  'gmail_at',
];

// Explicitly DO NOT redact these by name
const EXEMPT_KEYS = ['username', 'user_name', 'email', 'e-mail', 'login', 'user', 'user_id', 'userid'];

// Non-sensitive/date-ish by default
const NON_SENSITIVE_KEYS = [
  'date',
  'start_date',
  'end_date',
  'start-date',
  'end-date',
  'created_at',
  'updated_at',
  'dob',
  'birthday',
  'expiration_date',
];

const keyMatches = (k: string | undefined | null, list: string[]) => !!k && getListRegex(list).test(k);

export { STRONG_KEYS, EXEMPT_KEYS, NON_SENSITIVE_KEYS, keyMatches };
