var dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , darkroom = require('darkroom')
  , path = require('path')
  , config = require('con.figure')(require('../config')())
  , StoreStream = dp.StoreStream
  , temp = require('temp')
  , mv = require('mv')

module.exports = function (req, res, next) {
  var info = new darkroom.info()
    , tempName = temp.path({suffix: '.darkroom'})
    , store = new StoreStream(tempName)

  req.params.path = path.join(config.paths.data(), req.params.data, 'image')

  store.on('error', function (error) {
    req.log.error('StoreStream:', error.message)
  })

  retrieve(req.params, { isFile: true })
    .pipe(info)
    .pipe(store,
      { width: +req.params.width
      , height: +req.params.height
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