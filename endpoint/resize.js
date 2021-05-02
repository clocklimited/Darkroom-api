const { PassThrough } = require('stream')
const darkroom = require('@clocklimited/darkroom')
const restifyErrors = require('restify-errors')
const retrieveImageByUrl = require('../lib/image-by-url-retriever')

module.exports = function (serviceLocator, backendFactory) {
  const { config, logger } = serviceLocator
  const resize = {}

  resize.width = function (req, res, next) {
    res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
    return resizeImage.call(this, req, res, next)
  }

  resize.both = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions')
    return resizeImage.call(this, req, res, next)
  }

  resize.mode = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions with fill mode')
    return resizeImage.call(this, req, res, next)
  }

  function resizeImage(req, res, next) {
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    const modes = ['fit', 'stretch', 'cover', 'pad']
    req.params.mode =
      modes.indexOf(req.params.mode) === -1 ? 'fit' : req.params.mode

    const isHttp = req.params.data.indexOf('http') === 0
    const readStream = isHttp
      ? retrieveImageByUrl(req.params.data, logger)
      : backendFactory.createDataReadStream(req.params.data)

    readStream.on('notFound', function () {
      res.removeHeader('Cache-Control')
      res.set('Cache-Control', 'max-age=' + config.http.pageNotFoundMaxage)
      next(new restifyErrors.ResourceNotFoundError('Image does not exist'))
    })

    readStream.on('meta', function (meta) {
      res.set('Content-Type', meta.type)
      res.set('Last-Modified', new Date().toUTCString())
    })

    const re = new darkroom.Resize()
    const cacheStore = backendFactory.createCacheWriteStream(req.cacheKey)

    cacheStore.on('error', function (error) {
      logger.warn(error, 'StoreStream error')
      next(error)
    })

    re.on('error', function (error) {
      logger.error(error, 'Resize stream error')
      next(error)
    })

    const passThrough = new PassThrough()

    passThrough.pipe(cacheStore)
    passThrough.pipe(res)

    readStream.pipe(re).pipe(passThrough, {
      width: Number(req.params.width),
      height: Number(req.params.height),
      quality: config.quality,
      mode: req.params.mode,
      format: req.params.format
    })
  }
  return resize
}
