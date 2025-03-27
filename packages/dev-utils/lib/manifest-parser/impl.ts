import type { ManifestParserInterface, Manifest } from './type';

export const ManifestParserImpl: ManifestParserInterface = {
  convertManifestToString: (manifest, env) => {
    if (env === 'firefox') {
      manifest = convertToFirefoxCompatibleManifest(manifest);
    }
    return JSON.stringify(manifest, null, 2);
  },
};

function convertToFirefoxCompatibleManifest(manifest: Manifest) {
  const manifestCopy = {
    ...manifest,
  } as { [key: string]: unknown };

  manifestCopy.background = {
    scripts: [manifest.background?.service_worker],
    type: 'module',
  };
  manifestCopy.options_ui = {
    page: manifest.options_page,
    browser_style: false,
  };
  manifestCopy.content_security_policy = {
    extension_pages: "script-src 'self'; object-src 'self'",
  };
  manifestCopy.browser_specific_settings = {
    gecko: {
      /**
       * @todo add it to env
       * Must be unique to your extension to upload to addons.mozilla.org
       * (you can delete if you only want a chrome extension)
       */
      id: 'ion.leu@gmail.com',
      strict_min_version: '109.0',
    },
  };
  delete manifestCopy.options_page;
  return manifestCopy as Manifest;
}
