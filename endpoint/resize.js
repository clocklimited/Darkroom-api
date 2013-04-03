var darkroom = require('darkroom')
  , config = require('con.figure')(require('../config')())
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , retrieve = dp.RetrieveStream
  , filePath = require('../lib/filePath')
  , path = require('path')
  , fs = require('fs')
  , stream = require('stream')
  , mkdirp = require('mkdirp')

exports.width = function (req, res, next) {
  req.params.crop = false
  res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
  return resizeImage.call(this, req, res, next)
}

exports.both = function (req, res, next) {
  res.set('X-Application-Method', 'Resize both dimensions')
  return resizeImage.call(this, req, res, next)
}

var resizeImage = function (req, res, next) {
  req.params.width = req.params.width || req.params[0]
  req.params.height = req.params.height || req.params[1]
  req.params.path = filePath(req.params, path.join(config.paths.cache(), req.params.data))

  // Currently resize images only deals with pngs
  res.set('Content-Type', 'image/png')
  fs.exists(req.params.path, function (exists) {
    mkdirp(config.paths.cache() + req.params.data, function() {
      var re = new darkroom.resize()
        , store = exists ? new stream.PassThrough() : new StoreStream(req.params.path)

      store.on('error', function (error) {
        req.log.error('StoreStream:', error.message)
      })

      retrieve(req.params, { isFile: exists })
        .pipe(re)
        .pipe(store,
          { width: +req.params.width
          , height: +req.params.height
          , crop: req.params.crop
          }
        )
        .pipe(res)

      res.on('finish', function(error) {
        return next(error)
      })
    })
  })

}