var darkroom = require('@clocklimited/darkroom')
  , path = require('path')
  , fs = require('fs')
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')
  , dataHasher = require('../lib/data-hasher')

module.exports = function (config) {
  return function (req, res, next) {
    req.body = JSON.parse(req.body)

    var baseSrcPath = path.join(config.paths.data(), req.body.baseSrc.substring(0,3), req.body.baseSrc)
      , watermarkSrcPath = path.join(config.paths.data(), req.body.watermarkSrc.substring(0,3), req.body.watermarkSrc)
      , streamOptions =
          { url: req.body.baseSrc
          , path: baseSrcPath
          }
      , opts =
      { opacity: req.body.opacityPercentage }
      , watermark = new darkroom.Watermark(watermarkSrcPath, opts)
      , watermarkFolderLocation = filePath(req.body, config.paths.data())
      , watermarkFileLocation = path.join(watermarkFolderLocation, dataHasher(req.body))

    res.on('close', function () {
      next()
    })

    mkdirp(watermarkFolderLocation, function() {
      var store = fs.createWriteStream(watermarkFileLocation)

      store.once('error', function (error) {
        return showError(req, error, next)
      })

      watermark.once('error', function (error) {
        return showError(req, error, next)
      })

      store.once('close', function () {
        res.json(200, { compositeSrc: path.basename(watermarkFileLocation) })
      })

      fs.createReadStream(streamOptions.path)
        .on('error', next)
        .pipe(watermark)
        .pipe(store)
    })
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restify.BadDigestError(error.message))
  }
}
