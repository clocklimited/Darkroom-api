var dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , darkroom = require('darkroom')
  , path = require('path')
  , config = require('con.figure')(require('../config')())
  , StoreStream = dp.StoreStream
  , fs = require('fs')
  , temp = require('temp')

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

  info.on('error', function (e) {
    req.log.error(e, 'info.error')
  })

  res.on('finish', function (error) {
    fs.rename(tempName, req.cachePath, function() {
      return next(error)
    })
  })
}