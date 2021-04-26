const darkroom = require('@clocklimited/darkroom')
const { PassThrough } = require('stream')
const restifyErrors = require('restify-errors')

module.exports = circleEndpoint

function circleEndpoint(config, backendFactory) {
  return function processCircle(req, res, next) {
    const originalReadStream = backendFactory.createDataReadStream(
      req.params.data
    )
    let readStream = originalReadStream

    if (req.params.width && req.params.height) {
      const re = new darkroom.Resize()
      const resizePassThrough = new PassThrough()

      readStream = originalReadStream.pipe(re).pipe(resizePassThrough, {
        width: Number(req.params.width),
        height: Number(req.params.height),
        quality: config.quality,
        mode: req.params.mode
      })
    }

    const circleOptions = {
      x0: req.params.x0,
      y0: req.params.y0,
      x1: req.params.x1,
      y1: req.params.y1,
      colour: req.params.colour
    }
    const circle = new darkroom.Circle(circleOptions)
    const store = backendFactory.createCacheWriteStream(req.cacheKey)

    store.once('error', function (error) {
      return showError(req, error, next)
    })

    circle.once('error', function (error) {
      return showError(req, error, next)
    })

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
