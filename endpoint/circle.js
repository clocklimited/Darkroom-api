var darkroom = require('darkroom')
  , path = require('path')
  , dp = require('darkroom-persistence')
  , retrieve = dp.RetrieveStream
  , StoreStream = dp.StoreStream
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')
  , dataHasher = require('../lib/data-hasher')
  , mime = require('mime-magic')
  , fs = require('fs')

module.exports = function (config) {
  return function (req, res, next) {

    var baseSrc = path.join(config.paths.data(), req.params.data.substring(0,3), req.params.data)
      , streamOptions =
          { url: req.params.data
          , path: baseSrc
          }
      , circleOptions =
        { x0: req.params.x0
        , y0: req.params.y0
        , x1: req.params.x1
        , y1: req.params.y1
        , w: req.params.w
        , h: req.params.h
        , colour: req.params.colour
        }
      , circle = new darkroom.Circle(circleOptions)
      , circleFolderLocation = filePath(req.params, config.paths.data())
      , circleFileLocation = path.join(circleFolderLocation, dataHasher(req.params))

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
        fs.readFile(circleFileLocation, function (error, data) {
          if (error) return next(new restify.ResourceNotFoundError('Not Found'))
          mime(circleFileLocation, function (err, type) {
            if (err) return next(err)
            res.set('Content-Type', type)
            res.write(data)
            res.end()
            return next()
          })
        })
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
