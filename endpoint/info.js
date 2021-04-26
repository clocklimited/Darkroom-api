const darkroom = require('@clocklimited/darkroom')
const { PassThrough } = require('stream')
const debug = require('debug')('darkroom-api:info')
const restifyErrors = require('restify-errors')

module.exports = function (config, backEndFactory) {
  return function (req, res, next) {
    const info = new darkroom.Info()
    const store = backEndFactory.createCacheWriteStream(req.cacheKey)

    store.on('error', function (error) {
      req.log.error('Cache:', error.message)
      debug(error.message)
    })

    const passThrough = new PassThrough()
    passThrough.pipe(store)
    debug('info for', req.params.data)
    const stream = backEndFactory.createDataReadStream(req.params.data)
    stream.pipe(info).pipe(passThrough).pipe(res)

    stream.on('notFound', function () {
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })

    info.on('error', function (e) {
      req.log.error(e, 'info.error')
      debug(e.message)
      return next(e)
    })
  }
}
