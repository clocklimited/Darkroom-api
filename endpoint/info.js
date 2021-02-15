var darkroom = require('@clocklimited/darkroom')
  , PassThrough = require('stream').PassThrough
  , debug = require('debug')('darkroom-api:info')
  , restify = require('restify')

module.exports = function (config, backEndFactory) {
  return function (req, res, next) {
    var info = new darkroom.Info()
      , store = backEndFactory.createCacheWriteStream(req.cacheKey)

    store.on('error', function (error) {
      req.log.error('Cache:', error.message)
      debug(error.message)
    })

    var passThrough = new PassThrough()
    passThrough.pipe(store)
    debug('info for', req.params.data)
    var stream = backEndFactory.createDataReadStream(req.params.data)
    stream
      .pipe(info)
      .pipe(passThrough
        , { width: Number(req.params.width)
          , height: Number(req.params.height)
          , crop: req.params.crop
          }
      )
      .pipe(res)

    stream.on('notFound', function () {
      next(new restify.ResourceNotFoundError('Not Found'))
    })

    info.on('error', function (e) {
      req.log.error(e, 'info.error')
      debug(e.message)
      return next(e)
    })
  }
}
