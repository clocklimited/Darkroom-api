var darkroom = require('darkroom')
  , PassThrough = require('stream').PassThrough
  , restify = require('restify')

module.exports = circleEndpoint

function circleEndpoint(config, backendFactory) {

  return function processCircle(req, res, next) {
    var originalReadStream = backendFactory.getDataStream(req.params.data)
      , readStream = originalReadStream

    if (req.params.width && req.params.height) {
      var re = new darkroom.Resize()
        , resizePassThrough = new PassThrough()

      readStream = originalReadStream
        .pipe(re)
        .pipe(resizePassThrough
          , { width: Number(req.params.width)
            , height: Number(req.params.height)
            , quality: config.quality
            , mode: req.params.mode
            })
    }

    var circleOptions =
        { x0: req.params.x0
        , y0: req.params.y0
        , x1: req.params.x1
        , y1: req.params.y1
        , colour: req.params.colour
        }
      , circle = new darkroom.Circle(circleOptions)
      , store = backendFactory.createCacheStream(req.cacheKey)

    store.once('error', function (error) {
      return showError(req, error, next)
    })

    circle.once('error', function (error) {
      return showError(req, error, next)
    })

    var passThrough = new PassThrough()
    passThrough.pipe(store)

    readStream
      .on('error', next)

    readStream
      .pipe(circle)
      .pipe(passThrough)
      .pipe(res)
  }

  function showError(req, error, callback) {
    req.log.error(error)
    return callback(new restify.BadDigestError(error.message))
  }
}
