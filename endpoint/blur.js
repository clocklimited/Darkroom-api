const darkroom = require('@clocklimited/darkroom')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backendFactory) {
  const { logger } = serviceLocator
  return async function (req, res, next) {
    res.set('X-Application-Method', 'User defined image blur')
    let { src, masks, method } = req.body

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
    const blur = new darkroom.Blur({ masks, method })

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
      const values = []
      let key = null
      for (const mask of masks) {
        values.push(mask.map(([x, y]) => `${x},${y}`).join(' '))
      }

      key = values.join(':')
      collection.id = file.id
      collection.src = src
      collection.key = key
      logger.info(
        { id: req.requestId },
        'Successfully created blur with ' + values.length + ' areas: ' + file.id
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
      gravity: req.params.gravity,
      format: req.params.format
    })
  }
}
