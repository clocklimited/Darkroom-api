var darkroom = require('darkroom')
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , retrieve = dp.RetrieveStream
  , path = require('path')
  , restify = require('restify')
  , temp = require('temp')
  , mv = require('mv')
  , mime = require('mime-magic')

module.exports = function(config) {
  var resize = {}

  function resizeImage(req, res, next) {
    req.params.width = req.params.width || req.params[0]
    req.params.height = req.params.height || req.params[1]
    if (parseInt(req.params.height, 10) === 0 || parseInt(req.params.width, 10) === 0) {
      req.params.crop = false
    }
    var tempName = temp.path({ suffix: '.darkroom' })
    req.params.path = path.join(config.paths.data(), req.params.data, 'image')

    // fs.exists(req.params.path, function (exists) {
    mime(req.params.path, function (err, type) {
      if (err) {
        req.log.warn(new restify.ResourceNotFoundError(req.params.path + ' not found'))
        if (req.params.data === 'http')
          return next(new restify.BadDigestError('Cannot use a remote resource'))
        return next(new restify.ResourceNotFoundError('Image does not exist'))
      }

      res.set('Content-Type', type)

      var re = new darkroom.resize()
        // , store = exists ? new stream.PassThrough() : new StoreStream(path.join(config.paths.cache(), req.url))
        , store = new StoreStream(tempName)

      store.on('error', function (error) {
        req.log.warn('StoreStream:', error.message)
        return next(error)
      })

      re.on('error', function (error) {
        req.log.error('Resize', error)
        callback(error)
      })

      retrieve(req.params, { isFile: true })
        .pipe(re)
        .pipe(store
          , { width: parseInt(req.params.width, 10)
            , height: parseInt(req.params.height, 10)
            , crop: req.params.crop
            }
        )
        .pipe(res)

      var closed = false

      res.on('close', function () {
        closed = true
        return next(new Error('Response was closed before end.'))
      })

      res.on('finish', function () {
        if (closed)
          return false
        mv(tempName, req.cachePath, function (error) {
          if (error) req.log.warn(error, 'resize.cacheStore')
          return next()
        })
      })
    })
  }

  resize.width = function (req, res, next) {
    req.params.crop = false
    res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    res.set('Last-Modified', new Date().toUTCString())
    return resizeImage.call(this, req, res, next)
  }

  resize.both = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions')
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    res.set('Last-Modified', new Date().toUTCString())
    return resizeImage.call(this, req, res, next)
  }

  return resize
}
