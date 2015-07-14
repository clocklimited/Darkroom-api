var darkroom = require('darkroom')
  , path = require('path')
  , dp = require('darkroom-persistence')
  , retrieve = dp.RetrieveStream
  , StoreStream = dp.StoreStream
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')
  , dataHasher = require('../lib/data-hasher')

module.exports = function (config) {
  return function (req, res, next) {
    req.body = JSON.parse(req.body)

    var baseSrc = path.join(config.paths.data(), req.body.src.substring(0,3), req.body.src)
      , streamOptions =
          { url: req.body.src
          , path: baseSrc
          }
      , circleOptions = { x0: req.body.x0, y0: req.body.y0, x1: req.body.x1, y1: req.body.y1, colour: req.body.colour }
      , circle = new darkroom.Circle(circleOptions)

      , circleFolderLocation = filePath(req.body, config.paths.data())
      , circleFileLocation = path.join(circleFolderLocation, dataHasher(req.body))

    res.on('close', function () {
      next()
    })

    mkdirp(circleFolderLocation, function() {
      var store = new StoreStream(circleFileLocation)

      store.once('error', function (error) {
        return showError(req, error, next)
      })

      circle.once('error', function (error) {
        return showError(req, error, next)
      })

      store.once('end', function () {
        res.json(200, { circleSrc: path.basename(circleFileLocation) })
      })

      retrieve(streamOptions, { isFile: true })
        .on('error', function (err) {
          return next(err)
        })
        .pipe(circle)
        .pipe(store)
    })
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restify.BadDigestError(error.message))
  }
}
