var darkroom = require('darkroom')
  , config = require('con.figure')(require('../config')())
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , retrieve = dp.RetrieveStream
  , path = require('path')
  , fs = require('fs')
  , restify = require('restify')
  , temp = require('temp')

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
  if (+req.params.height === 0 || +req.params.width === 0) {
    req.params.crop = false
  }
  var tempName = temp.path({suffix: '.darkroom'})
  // console.log(req.params)
  req.params.path = path.join(config.paths.data(), req.params.data, 'image')

  // Currently resize images only deals with jpeg
  // res.set('Content-Type', 'image/jpeg')
  fs.exists(req.params.path, function (exists) {
    if (!exists) {
      req.log.error(new restify.BadDigestError(req.params.path + ' not found'))
      if (req.params.data === 'http')
        return next(new restify.BadDigestError('Cannot use a remote resource'))
      return next(new restify.BadDigestError('Image does not exist'))
    }
      var re = new darkroom.resize()
        // , store = exists ? new stream.PassThrough() : new StoreStream(path.join(config.paths.cache(), req.url))
        , store = new StoreStream(tempName)

      store.on('error', function (error) {
        req.log.error('StoreStream:', error.message)
      })

      retrieve(req.params, { isFile: true })
        .pipe(re)
        .pipe(store,
          { width: +req.params.width
          , height: +req.params.height
          , crop: req.params.crop
          }
        )
        .pipe(res)

      res.on('finish', function(error) {
        fs.rename(tempName, req.cachePath, function() {
          return next(error)
        })
      })
    })

}