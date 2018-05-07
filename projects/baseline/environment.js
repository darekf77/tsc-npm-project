
const path = require('path');
const { environmentName, LOCAL_ENVIRONMENT_NAME } = require('morphi')

const config = {

  productionBuild: false,
  aot: false,
  isBaseline: true,
  useRouter: () => config.name !== LOCAL_ENVIRONMENT_NAME,
  name: environmentName(__filename, LOCAL_ENVIRONMENT_NAME),
  db: {
    database: 'tmp/db.sqlite3',
    type: 'sqlite',
    synchronize: true,
    dropSchema: false,
    logging: false
  },
  host: (packageName) => {
    console.log('packageName', packageName)
    const c = config.routes.find(({ project }) => project === packageName);
    if (!c) {
      throw new Error(`Bad routing config for: ${packageName}`)
    }
    if (config.useRouter()) {
      if (c.url) {
        return url;
      }
    }
    return `http://localhost:${c.localEnvPort}`
  },
  routes: [
    {
      url: '/components',
      project: 'ss-common-ui',
      localEnvPort: 4201
    },
    {
      url: '/api',
      project: 'ss-common-logic',
      localEnvPort: 4000
    },
    {
      url: '/mobile',
      project: 'ss-mobileapp',
      localEnvPort: 4202
    },
    {
      url: '/admin',
      project: 'ss-admin-webapp',
      localEnvPort: 4201
    },
    {
      url: '/',
      project: 'ss-webapp',
      localEnvPort: 4200
    }
  ]

}

module.exports = exports = config;


