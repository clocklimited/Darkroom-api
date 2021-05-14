const darkroom = require('@clocklimited/darkroom')
const url = require('url')
const async = require('async')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backendFactory) {
  const { logger } = serviceLocator
  return function (req, res, next) {
    res.set('X-Application-Method', 'User defined image crop')
    let { src, crops } = req.body

    if (crops === undefined) {
      return next(new restifyErrors.BadDigestError('Crops are undefined'))
    }
    crops = !Array.isArray(crops) ? [crops] : crops

    logger.info(
      { id: req.requestId },
      'Crop Request made for image: ' + src + ' with ' + crops.length + ' crops'
    )
    logger.info({ id: req.requestId }, 'Crop Info: ' + JSON.stringify(crops))

    const collection = {}
    let cropCount = 1

    async.eachSeries(
      crops,
      function (data, callback) {
        logger.info({ id: req.requestId }, 'Creating crop ' + cropCount)
        data.data = src
        const store = backendFactory.createDataWriteStream()
        const crop = new darkroom.Crop()

        store.once('error', function (error) {
          logger.error({ id: req.requestId }, 'StoreStream:', error)
          callback(error)
        })

        // changed from “once” to “on” because with “once” the server would crash on an error
        crop.on('error', function (error) {
          logger.error(
            { id: req.requestId },
            'Crop',
            error.toString ? error.toString() : error
          )
          callback(error)
        })

        store.once('done', function (file) {
          const values = []
          let key = null
          for (key in data) {
            values.push(data[key])
          }

          key = values.join(':')
          collection[key] = file.id
          logger.info(
            { id: req.requestId },
            'Successfully created crop ' + cropCount + ': ' + file.id
          )
          cropCount++
          callback()
        })
        const readStream = backendFactory.createDataReadStream(src)

        readStream.once('notFound', () => {
          next(new restifyErrors.ResourceNotFoundError('Not Found'))
        })

        readStream.pipe(crop).pipe(store, {
          crop: data,
          gravity: req.params.gravity,
          format: req.params.format
        })
      },
      function (error) {
        if (error) {
          logger.error({ id: req.requestId }, error)
          return next(new restifyErrors.BadDigestError(error.message))
        } else {
          res.json(collection)
        }
      }
    )
  }
}
