const MongoBackend = require('./backends/MongoBackend')
const S3Backend = require('./backends/S3Backend')

const createBackendFactory = (backendType, serviceLocator, cb) => {
  const { config, logger } = serviceLocator
  let backend

  logger.info('Using MongoDB backend')
  backend = new MongoBackend(config)
  if (backendType === 'S3')
    backend = new S3Backend({
      accessKeyId: 'AKIAYYOMLWSRNHQGIRP5',
      secretAccessKey: '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',
      region: 'eu-west-2',
      bucket: 'darkroom-test'
    })

  cb(null, backend)
}

module.exports = createBackendFactory
