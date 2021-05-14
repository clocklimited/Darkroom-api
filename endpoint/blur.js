const darkroom = require('@clocklimited/darkroom')
const url = require('url')
const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backendFactory) {
  const { logger } = serviceLocator
  return async function (req, res, next) {
    res.set('X-Application-Method', 'User defined image blur')
    if (typeof req.body === 'string') req.body = JSON.parse(req.body)
    let { src, masks, method } = req.body

    const srcUrl = url.parse(src).path.split('/')
    req.params.data = srcUrl[srcUrl.length - 1]

    if (masks === undefined) {
      return next(new restifyErrors.BadDigestError('Masks are undefined'))
    }

    logger.info(
      { id: req.requestId },
      'Blur Request made for image: ' +
        req.params.data +
        ' with ' +
        masks.length +
        ' masks'
    )
    logger.info(
      { id: req.requestId },
      'Masks Info: ' + JSON.stringify(masks, null, 2)
    )

    const collection = {}

    try {
      await new Promise((resolve, reject) => {
        logger.info({ id: req.requestId }, 'Creating blurred ')
        const store = backendFactory.createDataWriteStream()
        const crop = new darkroom.Blur({ masks, method })

        store.once('error', function (error) {
          logger.error({ id: req.requestId }, 'StoreStream:', error)
          reject(error)
        })

        // changed from “once” to “on” because with “once” the server would crash on an error
        crop.on('error', function (error) {
          logger.error(
            { id: req.requestId },
            'Blur',
            error.toString ? error.toString() : error
          )
          reject(error)
        })

        store.once('done', function (file) {
          const values = []
          let key = null
          for (const mask of masks) {
            values.push(mask.map(([x, y]) => `${x},${y}`).join(' '))
          }

          key = values.join(':')
          collection.id = file.id
          collection.key = key
          logger.info(
            { id: req.requestId },
            'Successfully created blur with ' +
              values.length +
              ' areas: ' +
              file.id
          )
          resolve()
        })
        const readStream = backendFactory.createDataReadStream(req.params.data)

        readStream.once('notFound', () => {
          next(new restifyErrors.ResourceNotFoundError('Not Found'))
        })

        readStream.pipe(crop).pipe(store, {
          gravity: req.params.gravity,
          format: req.params.format
        })
      })
    } catch (error) {
      logger.error({ id: req.requestId }, error)
      return next(new restifyErrors.BadDigestError(error.message))
    }
    res.json(collection)
  }
}
