var darkroom = require('darkroom')
  , PassThrough = require('stream').PassThrough

module.exports = function (config, backEndFactory) {
  return function (req, res, next) {
    var info = new darkroom.Info()
      , store = backEndFactory.createCacheStream(req.cacheKey)

    store.on('error', function (error) {
      req.log.error('Cache:', error.message)
    })

    var passThrough = new PassThrough()
    passThrough.pipe(store)

    backEndFactory.getDataStream(req.params.data)
      .pipe(info)
      .pipe(passThrough
        , { width: Number(req.params.width)
          , height: Number(req.params.height)
          , crop: req.params.crop
          }
      )
      .pipe(res)

    info.on('error', function (e) {
      req.log.error(e, 'info.error')
      return next(e)
    })
  }
}
