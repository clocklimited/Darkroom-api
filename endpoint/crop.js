const darkroom = require('@clocklimited/darkroom')
const url = require('url')
const async = require('async')
const restifyErrors = require('restify-errors')

module.exports = function (config, backendFactory) {
  return function (req, res, next) {
    if (typeof req.body === 'string') req.body = JSON.parse(req.body)

    var srcUrl = url.parse(req.body.src).path.split('/')
    req.params.data = srcUrl[srcUrl.length - 1]

    req.body.crops = !Array.isArray(req.body.crops)
      ? [req.body.crops]
      : req.body.crops
    if (req.params.crops === undefined)
      return next(new restify.BadDigestError('Crops are undefined'))

    req.log.info(
      { id: req.requestId },
      'Crop Request made for image: ' +
        req.params.data +
        ' with ' +
        req.params.crops.length +
        ' crops'
    )
    req.log.info(
      { id: req.requestId },
      'Crop Info: ' + JSON.stringify(req.params.crops)
    )

    var collection = {},
      cropCount = 1

    async.eachSeries(
      req.params.crops,
      function (data, callback) {
        req.log.info({ id: req.requestId }, 'Creating crop ' + cropCount)
        data.data = req.params.data
        var store = backendFactory.createDataWriteStream(),
          crop = new darkroom.Crop()

        store.once('error', function (error) {
          req.log.error({ id: req.requestId }, 'StoreStream:', error)
          callback(error)
        })

        // changed from “once” to “on” because with “once” the server would crash on an error
        crop.on('error', function (error) {
          req.log.error(
            { id: req.requestId },
            'Crop',
            error.toString ? error.toString() : error
          )
          callback(error)
        })

        store.once('done', function (file) {
          var values = [],
            key = null
          for (key in data) {
            values.push(data[key])
          }

          key = values.join(':')
          collection[key] = file.id
          req.log.info(
            { id: req.requestId },
            'Successfully created crop ' + cropCount + ': ' + file.id
          )
          cropCount++
          callback()
        })
        var readStream = backendFactory.createDataReadStream(req.params.data)

        readStream.pipe(crop).pipe(store, {
          crop: data,
          gravity: req.params.gravity,
          format: req.params.format
        })
      },
      function (error) {
        if (error) {
          req.log.error({ id: req.requestId }, error)
          return next(new restifyErrors.BadDigestError(error.message))
        } else {
          res.json(collection)
          return next()
        }
      }
    )
  }
}
