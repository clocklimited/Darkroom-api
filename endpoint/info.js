const darkroom = require('@clocklimited/darkroom')
const { PassThrough } = require('stream')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backEndFactory) {
  const { logger } = serviceLocator
  return function (req, res, next) {
    const info = new darkroom.Info()
    const store = backEndFactory.createCacheWriteStream(req.cacheKey)

    store.on('error', function (error) {
      logger.error(error, 'Cache error')
    })

    const passThrough = new PassThrough()
    passThrough.pipe(store)
    logger.debug('info for', req.params.data)
    const stream = backEndFactory.createDataReadStream(req.params.data)
    stream.pipe(info).pipe(passThrough).pipe(res)

    stream.on('notFound', function () {
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })

    info.on('error', function (e) {
      logger.error(e, 'info.error')
      return next(e)
    })
  }
}
