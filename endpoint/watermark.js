var darkroom = require('darkroom')
  , path = require('path')
  , dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , StoreStream = dp.StoreStream
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')

module.exports = function (config) {
  return function (req, res, next) {
    req.body = JSON.parse(req.body)
    var baseSrcPath = path.join(config.paths.data(), req.body.baseSrc, 'image')
      , watermarkSrcPath = path.join(config.paths.data(), req.body.watermarkSrc, 'image')
      , streamOptions =
          { url: req.body.baseSrc
          , path: baseSrcPath
          }
      , opts =
      { opacity: req.body.opacityPercentage }
      , watermark = new darkroom.Watermark(watermarkSrcPath, opts)
      , watermarkFolderLocation = filePath(req.body, config.paths.data())
      , watermarkFileLocation = path.join(watermarkFolderLocation, 'image')

    res.on('close', function () {
      next()
    })

    mkdirp(watermarkFolderLocation, function() {
      var store = new StoreStream(watermarkFileLocation)

      store.once('error', function (error) {
        return showError(req, error, next)
      })

      watermark.once('error', function (error) {
        return showError(req, error, next)
      })

      store.once('end', function () {
        res.json(200, { compositeSrc: path.basename(watermarkFolderLocation) })
      })

      retrieve(streamOptions, { isFile: true })
        .on('error', function () {
          console.log(111, arguments)
        })
        .pipe(watermark)
        .pipe(store)
    })
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restify.BadDigestError(error.message))
  }
}
