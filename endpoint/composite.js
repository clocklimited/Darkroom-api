var darkroom = require('darkroom')
  , config = require('con.figure')(require('../config')())
  , path = require('path')
  , dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , StoreStream = dp.StoreStream
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')

module.exports = function (req, res, next) {
  req.body = JSON.parse(req.body)
  var baseSrcPath = path.join(config.paths.data(), req.body.baseSrc, 'image')
    , topSrcPath = path.join(config.paths.data(), req.body.topSrc, 'image')
    , streamOptions =
        { url: req.body.baseSrc
        , path: baseSrcPath
        }
    , composite = new darkroom.composite(topSrcPath, req.body.opacityPercentage)
    , compositeFolderLocation = filePath(req.body, config.paths.data())
    , compositeFileLocation = path.join(compositeFolderLocation, 'image')

  res.on('close', function () {
    next()
  })

  mkdirp(compositeFolderLocation, function() {
    var store = new StoreStream(compositeFileLocation)

    store.once('error', function (error) {
      return showError(req, error, next)
    })

    composite.once('error', function (error) {
      return showError(req, error, next)
    })

    store.once('end', function () {
      res.json(200, { compositeSrc: path.basename(compositeFolderLocation) })
    })

    retrieve(streamOptions, { isFile: true })
      .pipe(composite)
      .pipe(store)

  })
}


function showError(req, error, callback) {
  req.log.error(error)
  return callback(new restify.BadDigestError(error.message))
}
