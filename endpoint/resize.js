var PassThrough = require('stream').PassThrough
  , darkroom = require('@clocklimited/darkroom')
  , restify = require('restify')
  , retrieveImageByUrl = require('../lib/image-by-url-retriever')

module.exports = function (config, backendFactory) {

  var resize = {}

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
    /* jshint maxcomplexity:6 */
    var modes = [ 'fit', 'stretch', 'cover', 'fill' ]
    req.params.width = req.params.width || req.params[0]
    req.params.height = req.params.height || req.params[1]
    req.params.mode = req.params.mode || modes.indexOf(req.params[2]) === -1 ? 'fit' : req.params[2]
    req.params.format = req.params.format

    var isHttp = req.params.data.indexOf('http') === 0
    var readStream = isHttp ? retrieveImageByUrl(req.params.data, req.log) : backendFactory.createDataReadStream(req.params.data)

    readStream.on('notFound', function () {
      res.removeHeader('Cache-Control')
      res.set('Cache-Control', 'max-age=' + config.http.pageNotFoundMaxage)
      next(new restify.ResourceNotFoundError('Image does not exist'))
    })

    readStream.on('meta', function (meta) {
      res.set('Content-Type', meta.type)
      res.set('Last-Modified', new Date().toUTCString())
    })

    var re = new darkroom.Resize()
      , cacheStore = backendFactory.createCacheWriteStream(req.cacheKey)

    cacheStore.on('error', function (error) {
      req.log.warn('StoreStream:', error.message)
      next(error)
    })

    re.on('error', function (error) {
      req.log.error('Resize', error)
      next(error)
    })

    var passThrough = new PassThrough()

    passThrough.pipe(cacheStore)
    passThrough.pipe(res)

    readStream
      .pipe(re)
      .pipe(passThrough
        , { width: Number(req.params.width)
          , height: Number(req.params.height)
          , quality: config.quality
          , mode: req.params.mode
          , format: req.params.format
          })
  }
  return resize
}
