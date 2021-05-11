const darkroom = require('@clocklimited/darkroom')
const { PassThrough } = require('stream')
const restifyErrors = require('restify-errors')

module.exports = circleEndpoint

function circleEndpoint(config, backendFactory) {
  return function processCircle(req, res, next) {
    const { x0, y0, x1, y1, colour, width, height } = req.query
    const { data, mode } = req.params
    const originalReadStream = backendFactory.createDataReadStream(data)
    let readStream = originalReadStream

    if (width && height) {
      res.set('X-Application-Method', 'Circular crop with resize')
      const resize = new darkroom.Resize()
      const resizePassThrough = new PassThrough()

      readStream = originalReadStream.pipe(resize).pipe(resizePassThrough, {
        width: Number(width),
        height: Number(height),
        quality: config.quality,
        // TODO not obtainable here
        mode
      })
    } else {
      res.set('X-Application-Method', 'Circular crop')
    }

    const circleOptions = {
      x0,
      y0,
      x1,
      y1,
      colour
    }
    const circle = new darkroom.Circle(circleOptions)
    const store = backendFactory.createCacheWriteStream(req.cacheKey)

    originalReadStream.once('notFound', () => {
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })
    store.once('error', (error) => showError(req, error, next))

    circle.once('error', (error) => showError(req, error, next))

    const passThrough = new PassThrough()
    passThrough.pipe(store)

    readStream.on('error', next)

    readStream.pipe(circle).pipe(passThrough).pipe(res)
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restifyErrors.BadDigestError(error.message))
  }
}
