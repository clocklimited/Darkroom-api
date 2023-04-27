const MongoBackend = require('./backends/MongoBackend')
const S3Backend = require('./backends/S3Backend')

const createBackendFactory = (serviceLocator, cb) => {
  const { config, logger } = serviceLocator
  let backend

  if (!config.backend || config.backend === 'mongo') {
    logger.info('Using MongoDB backend')
    backend = new MongoBackend(config)
  } else if (config.backend === 'S3') {
    logger.info('Using S3 backend')
    backend = new S3Backend(config)
  }

  cb(null, backend)
}

module.exports = createBackendFactory
