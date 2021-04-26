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

    if (req.query.width && req.query.height) {
      const re = new darkroom.Resize()
      const resizePassThrough = new PassThrough()

      readStream = originalReadStream.pipe(re).pipe(resizePassThrough, {
        width: Number(req.query.width),
        height: Number(req.query.height),
        quality: config.quality,
        // TODO not obtainable here
        mode: req.params.mode
      })
    }

    const circleOptions = {
      x0: req.query.x0,
      y0: req.query.y0,
      x1: req.query.x1,
      y1: req.query.y1,
      colour: req.query.colour
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
