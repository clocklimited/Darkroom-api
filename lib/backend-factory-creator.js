const MongoBackend = require('./backends/MongoBackend')
const FsBackend = require('./backends/FsBackend')

const createBackendFactory = (serviceLocator, cb) => {
  const { config, logger } = serviceLocator
  let backend
  if (config.databaseUri) {
    logger.info('Using MongoDB backend')
    backend = new MongoBackend(config)
  } else {
    logger.info('Using FS backend')
    backend = new FsBackend(config)
  }
  cb(null, backend)
}

module.exports = createBackendFactory
