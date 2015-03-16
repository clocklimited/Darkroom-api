var dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , darkroom = require('darkroom')
  , path = require('path')
  , StoreStream = dp.StoreStream
  , temp = require('temp')
  , mv = require('mv')

module.exports = function (config) {
  return function (req, res, next) {
    var info = new darkroom.Info()
      , tempName = temp.path({ suffix: '.darkroom' })
      , store = new StoreStream(tempName)

    req.params.path = path.join(config.paths.data(), req.params.data.substring(0,3), req.params.data)

    store.on('error', function (error) {
      req.log.error('StoreStream:', error.message)
    })

    retrieve(req.params, { isFile: true })
      .pipe(info)
      .pipe(store
        , { width: Number(req.params.width)
          , height: Number(req.params.height)
          , crop: req.params.crop
          }
      )
      .pipe(res)

    var errorOccurred = false

    info.on('error', function (e) {
      req.log.error(e, 'info.error')
      errorOccurred = true
      return next(e)
    })

    var closed = false

    res.on('close', function () {
      if (errorOccurred)
        return
      closed = true
      return next(new Error('Response was closed before end.'))
    })

    res.on('finish', function () {
      if (closed || errorOccurred)
        return false
      mv(tempName, req.cachePath, function(error) {
        if (error) req.log.warn(error, 'info.cacheStore')
        return next()
      })
    })
  }
}
