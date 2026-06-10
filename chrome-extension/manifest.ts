import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'ion.leu@gmail.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: ['<all_urls>'],
  permissions: ['webRequest', 'webNavigation', 'storage', 'tabs', 'activeTab', 'contextMenus', 'identity'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'brie-logo.png',
  },
  icons: {
    128: 'brie-icon-128x128.png',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content/index.iife.js'],
      run_at: 'document_start',
    },
    {
      matches: ['<all_urls>'],
      js: ['content-ui/index.iife.js'],
    },
    {
      matches: ['<all_urls>'],
      css: ['content.css'],
    },
  ],
  web_accessible_resources: [
    {
      resources: [
        '*.js',
        '*.css',
        '*.svg',
        '*.png',
        'content/extend.iife.js',
        'auth-identity.html',
        'content-ui/rrweb/*',
        'content-ui/ffmpeg/*',
        'content-ui/ffmpeg/*.wasm',
      ],
      matches: ['*://*/*'],
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },
} satisfies chrome.runtime.ManifestV3;

export default manifest;
