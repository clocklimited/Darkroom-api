var darkroom = require('darkroom')
  , PassThrough = require('stream').PassThrough
  , path = require('path')
  , restify = require('restify')
  , filePath = require('../lib/file-path')
  , mkdirp = require('mkdirp')
  , mime = require('mime-magic')
  , fs = require('fs')
  , temp = require('temp')
  , mv = require('mv')
  , compact = require('lodash.compact')

module.exports = circleEndpoint

circleEndpoint.serveCached = serveCached

function circleEndpoint(config) {

  return processCircle

  function processCircle(req, res, next) {

    if (req.params.width && req.params.height && !req.resized) {
      return resizeImage(req, res, processCircle.bind(null, req, res, next))
    }

    var baseSrc = getBaseSrc()
      , streamOptions = { path: baseSrc }
      , circleOptions =
        { x0: req.params.x0
        , y0: req.params.y0
        , x1: req.params.x1
        , y1: req.params.y1
        , colour: req.params.colour
        }
      , circle = new darkroom.Circle(circleOptions)
      , circleFolderLocation = filePath(req.params, config.paths.data())
      , store = temp.createWriteStream()
    res.on('close', next)

    mkdirp(circleFolderLocation, function() {

      store.once('error', function (error) {
        return showError(req, error, next)
      })

      circle.once('error', function (error) {
        return showError(req, error, next)
      })

      var closed

      res.on('close', function () {
        closed = true
        return next(new Error('Response was closed before end.'))
      })

      res.on('finish', function () {
        if (closed)
          return false
        mv(store.path, req.cachePath, function (error) {
          if (error) {
            req.log.error(error, 'circle.cacheStore')
            return next(error)
          }

          return next()
        })
      })

      var passThrough = new PassThrough()
      passThrough.pipe(store)

      fs.createReadStream(streamOptions.path)
        .on('error', next)
        .pipe(circle)
        .pipe(passThrough)
        .pipe(res)
    })

    function getBaseSrc() {
      return req.resized || path.join(config.paths.data(), req.params.data.substring(0,3), req.params.data)
    }
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restify.BadDigestError(error.message))
  }

  function resizeImage(req, res, cb) {
    var re = new darkroom.Resize()
      , store = temp.createWriteStream()

    store.on('error', function (error) {
      req.log.warn('StoreStream:', error.message)
      return cb(error)
    })

    re.on('error', function (error) {
      req.log.error('Resize', error)
      cb(error)
    })

    var resizedPath = path.join(config.paths.data(), req.params.data.substring(0,3) , req.params.data)

    fs.createReadStream(resizedPath)
      .pipe(re)
      .pipe(store
        , { width: Number(req.params.width)
          , height: Number(req.params.height)
          , quality: config.quality
          , mode: req.params.mode
          })

    store.once('finish', function () {
      req.resized = store.path
      return cb()
    })
  }

}

function serveCached(config) {

  return function (req, res, next) {
    var parts =
      [ config.paths.cache()
      , req.params.action
      , req.params.data + req.params.hash
      , req.params.height
      , req.params.width
      , req.params.colour
      , req.params.x0
      , req.params.y0
      , req.params.x1
      , req.params.y1
      ]

    parts = compact(parts)

    // If there are no additional actions happening apart
    // from a circular image being made onto an original
    // image, then I add an additional path onto the end.
    //
    // Otherwise the file becomes data + hash, and then
    // subsequent actions attempt to create a folder of
    // data + hash and it errors
    if (parts.length === 3) parts.push('original')

    req.cachePath = path.join.apply(path, parts)

    // Create the directory with the last remaining parameter
    // removed from the end
    mkdirp(path.join.apply(path, parts.slice(0, parts.length - 1)), function() {

      fs.stat(req.cachePath, function (error, stats) {
        mime(req.cachePath, function (err, type) {
          if (err) return next()

          if (!error && stats.isFile()) {
            res.set('Cache-Control', 'max-age=' + config.http.maxage)
            res.set('Last-Modified', new Date(stats.mtime).toUTCString())
            res.set('Content-Type', type)
            res.set('D-Cache', 'HIT')
            return fs.createReadStream(req.cachePath).pipe(res)
          } else {
            return next()
          }
        })
      })
    })
  }
}
