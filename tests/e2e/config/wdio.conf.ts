export const config: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: '../tsconfig.json',
  specs: ['../specs/**/*.ts'],
  exclude: [],
  maxInstances: 10,
  capabilities: [],
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
};
