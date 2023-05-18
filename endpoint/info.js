const darkroom = require('@clocklimited/darkroom')
const { PassThrough } = require('stream')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backEndFactory) {
  const { logger } = serviceLocator
  return function (req, res, next) {
    const info = new darkroom.Info()
    const store = backEndFactory.createCacheWriteStream(req.cacheKey)

    res.set('X-Application-Method', 'Image information')
    res.set('Content-Type', 'application/json')

    store.on('error', function (error) {
      logger.error(error, 'Cache error')
    })

    const passThrough = new PassThrough()
    passThrough.pipe(store)
    logger.debug('info for', req.params.data)
    const stream = backEndFactory.createDataReadStream(req.params.data)

    stream.on('meta', (meta) => {
      const infoPipe = stream.pipe(info)

      infoPipe.on('data', (data) => {
        res.json({ ...JSON.parse(data.toString()), ...meta })
      })
      infoPipe.on('error', () => {
        res.json(meta)
      })
    })

    stream.on('notFound', function () {
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })

    stream.on('error', function (e) {
      logger.error(e, 'stream.error')
      return next(e)
    })
  }
}
