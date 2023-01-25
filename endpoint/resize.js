const { PassThrough } = require('stream')
const darkroom = require('@clocklimited/darkroom')
const restifyErrors = require('restify-errors')
const retrieveImageByUrl = require('../lib/image-by-url-retriever')

module.exports = function (serviceLocator, backendFactory) {
  const { config, logger } = serviceLocator
  const resizeEndpoint = {}

  resizeEndpoint.width = function (req, res, next) {
    res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
    return resizeImage.call(this, req, res, next)
  }

  resizeEndpoint.both = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions')
    return resizeImage.call(this, req, res, next)
  }

  resizeEndpoint.mode = function (req, res, next) {
    res.set('X-Application-Method', 'Resize both dimensions with fill mode')
    return resizeImage.call(this, req, res, next)
  }

  function resizeImage(req, res, next) {
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    const modes = ['fit', 'stretch', 'cover', 'pad']
    let { mode, data, format, width, height } = req.params
    mode = modes.includes(mode) ? mode : 'fit'

    const isHttp = data.indexOf('http') === 0
    const readStream = isHttp
      ? retrieveImageByUrl(data, logger)
      : backendFactory.createDataReadStream(data)

    readStream.on('notFound', function () {
      res.removeHeader('Cache-Control')
      res.set('Cache-Control', 'max-age=' + config.http.pageNotFoundMaxage)
      next(new restifyErrors.ResourceNotFoundError('Image does not exist'))
    })

    readStream.on('meta', function (meta) {
      res.set('Content-Type', meta.type)
      res.set('Last-Modified', new Date().toUTCString())
    })

    const resize = new darkroom.Resize({
      concurrency: process.env.NF_CPU_RESOURCES || config.concurrency
    })
    const cacheStore = backendFactory.createCacheWriteStream(
      req.cacheKey,
      req.params.data
    )

    cacheStore.on('error', function (error) {
      logger.warn(error, 'StoreStream error')
      next(error)
    })

    resize.on('error', function (error) {
      logger.error(error.toString(), 'Resize stream error')
      next(error)
    })

    const passThrough = new PassThrough()

    passThrough.pipe(cacheStore)
    passThrough.pipe(res)

    readStream.pipe(resize).pipe(passThrough, {
      width: Number(width),
      height: Number(height),
      quality: req.query.quality || config.quality,
      gravity: req.query.gravity,
      mode,
      format
    })
  }
  return resizeEndpoint
}
