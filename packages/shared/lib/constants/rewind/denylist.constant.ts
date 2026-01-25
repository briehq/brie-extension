import type { BlockRule } from '../../interfaces/rewind/index.js';

export const BASELINE_DENYLIST: BlockRule[] = [
  // Google / Apple / Microsoft ID
  {
    reason: 'identity',
    hosts: [
      { type: 'exact', host: 'accounts.google.com' },
      { type: 'exact', host: 'myaccount.google.com' },
      { type: 'exact', host: 'appleid.apple.com' },
      { type: 'exact', host: 'login.microsoftonline.com' },
      { type: 'exact', host: 'account.microsoft.com' },
      { type: 'exact', host: 'login.live.com' },
    ],
  },
  // Enterprise SSO / IdPs
  {
    reason: 'auth',
    hosts: [
      { type: 'suffix', suffix: 'okta.com' },
      { type: 'suffix', suffix: 'onelogin.com' },
      { type: 'suffix', suffix: 'auth0.com' },
      { type: 'suffix', suffix: 'duo.com' },
    ],
  },
  // Auth / Login subdomain heuristics
  {
    reason: 'auth',
    hosts: [
      { type: 'prefix', prefix: 'login' },
      { type: 'prefix', prefix: 'auth' },
      { type: 'prefix', prefix: 'sso' },
      { type: 'prefix', prefix: 'idp' },
      { type: 'prefix', prefix: 'secure' },
    ],
    paths: [
      { type: 'contains', value: '/login' },
      { type: 'contains', value: '/signin' },
      { type: 'contains', value: '/oauth' },
      { type: 'contains', value: '/authorize' },
      { type: 'contains', value: '/saml' },
      { type: 'contains', value: '/mfa' },
      { type: 'contains', value: '/2fa' },
    ],
  },
  // Payments / Checkout
  {
    reason: 'payment',
    hosts: [
      { type: 'exact', host: 'checkout.stripe.com' },
      { type: 'suffix', suffix: 'stripe.com' },
      { type: 'suffix', suffix: 'paypal.com' },
      { type: 'suffix', suffix: 'squareup.com' },
    ],
    paths: [
      { type: 'contains', value: '/checkout' },
      { type: 'contains', value: '/pay' },
    ],
  },
  // Password managers / vaults
  {
    reason: 'vault',
    hosts: [
      { type: 'suffix', suffix: '1password.com' },
      { type: 'suffix', suffix: 'lastpass.com' },
      { type: 'suffix', suffix: 'bitwarden.com' },
    ],
  },
];
