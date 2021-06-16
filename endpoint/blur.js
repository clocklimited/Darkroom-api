const darkroom = require('@clocklimited/darkroom')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backendFactory) {
  const { logger, config } = serviceLocator
  return async function (req, res, next) {
    res.set('X-Application-Method', 'User defined image blur')
    let { src, masks, blurAmount } = req.body

    if (!masks) masks = []

    logger.info(
      { id: req.requestId },
      'Blur Request made for image: ' + src + ' with ' + masks.length + ' masks'
    )
    logger.info(
      { id: req.requestId },
      'Masks Info: ' + JSON.stringify(masks, null, 2)
    )

    const collection = {}
    let error = false

    const processError = (err) => {
      if (error) return
      error = true
      return next(new restifyErrors.BadDigestError(err.message))
    }

    logger.info({ id: req.requestId }, 'Creating blurred ')
    const store = backendFactory.createDataWriteStream()
    const blur = new darkroom.Blur({ masks, blurAmount })

    store.once('error', function (error) {
      logger.error({ id: req.requestId }, 'StoreStream:', error)
      processError(error)
    })

    // changed from “once” to “on” because with “once” the server would crash on an error
    blur.on('error', function (error) {
      logger.error(
        { id: req.requestId },
        'Blur',
        error.toString ? error.toString() : error
      )
      processError(error)
    })

    store.once('done', function (file) {
      collection.id = file.id
      collection.src = src
      logger.info(
        { id: req.requestId },
        'Successfully created blur with ' + masks.length + ' areas: ' + file.id
      )
      if (!error) {
        res.json(collection)
      }
    })
    const readStream = backendFactory.createDataReadStream(src)

    readStream.once('notFound', () => {
      error = true
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })

    readStream.pipe(blur).pipe(store, {
      format: req.params.format,
      quality: config.quality
    })
  }
}
