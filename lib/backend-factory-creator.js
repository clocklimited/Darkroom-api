const MongoBackend = require('./backends/MongoBackend')

const createBackendFactory = (serviceLocator, cb) => {
  const { config, logger } = serviceLocator
  let backend

  logger.info('Using MongoDB backend')
  backend = new MongoBackend(config)

  cb(null, backend)
}

module.exports = createBackendFactory
