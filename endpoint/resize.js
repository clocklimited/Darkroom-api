var darkroom = require('darkroom')
  , dp = require('darkroom-persistance')
  , StoreStream = dp.StoreStream
  , retrieve = dp.RetrieveStream
  , path = require('path')
  , restify = require('restify')
  , temp = require('temp')
  , mv = require('mv')
  , mime = require('mime-magic')
  , resize = {}

module.exports = function (config) {

  resize.width = function (req, res, next) {
    res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    return resizeImage.call(this, req, res, next)
  }

  resize.both = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions')
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    return resizeImage.call(this, req, res, next)
  }

  function resizeImage(req, res, next) {
    var modes = [ 'fit', 'stretch', 'cover' ]
    req.params.width = req.params.width || req.params[0]
    req.params.height = req.params.height || req.params[1]
    req.params.mode = req.params.mode || modes.indexOf(req.params[2]) === -1 ? 'fit' : req.params[2]

    var tempName = temp.path({ suffix: '.darkroom' })
    req.params.path = path.join(config.paths.data(), req.params.data, 'image')

    mime(req.params.path, function (err, type) {
      if (err) {
        req.log.warn(new restify.ResourceNotFoundError(req.params.path + ' not found'))
        if (req.params.data === 'http')
          return next(new restify.BadDigestError('Cannot use a remote resource'))
        return next(new restify.ResourceNotFoundError('Image does not exist'))
      }

      res.set('Content-Type', type)

      var re = new darkroom.Resize()
        , store = new StoreStream(tempName)

      store.on('error', function (error) {
        req.log.warn('StoreStream:', error.message)
        return next(error)
      })

      re.on('error', function (error) {
        req.log.error('Resize', error)
        next(error)
      })

      retrieve(req.params, { isFile: true })
        .pipe(re)
        .pipe(store
          , { width: Number(req.params.width)
            , height: Number(req.params.height)
            , quality: config.quality
            , mode: req.params.mode
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
  return resize
}
