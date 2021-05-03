const serviceLocator = require('service-locator')()
const createLogger = require('@serby/logger')
const env = process.env.NODE_ENV || 'development'
const inDevelopmentMode = env === 'development'
const logLevel = process.env.LOG_LEVEL || (inDevelopmentMode ? 'debug' : 'info')
const createServer = require('./server')
const config = require('con.figure')(require('./config')())
const clustered = require('clustered')
const clusterSize = process.env.API_PROCESSES || config.apiProcesses
const port = process.env.PORT || config.http.port
const createBackendFactory = require('./lib/backend-factory-creator')
const logger = createLogger('darkroom', { logLevel })

serviceLocator
  .register('name', 'darkroom')
  .register('env', env)
  .register('config', config)
  .register('logger', logger)

createBackendFactory(serviceLocator, (error, factory) => {
  if (error) {
    logger.fatal(error, 'Error starting darkroom')
    return process.exit(1)
  }

  factory.setup(function () {
    const app = createServer(serviceLocator, factory)

    if (process.env.NODE_ENV === undefined) {
      logger.fatal('NODE_ENV (env) not set, process may crash.')
    }

    if (isNaN(clusterSize)) {
      logger.fatal(
        'Invalid cluster size: "%s", please set/update API_PROCESSES (env) or config.apiProcesses',
        clusterSize
      )
      return process.exit(1)
    }

    clustered(
      function () {
        app.listen(port, function () {
          logger.info(`${serviceLocator.name} listening at http://127.0.0.1:${port}`)
        })
      },
      { logger, size: clusterSize }
    )
  })
})
