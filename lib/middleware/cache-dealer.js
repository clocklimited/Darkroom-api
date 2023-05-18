const crypto = require('crypto')

module.exports = function (config, backEndFactory, cacheKeyFn) {
  return function (req, res, next) {
    if (process.env.NO_CACHE !== undefined) {
      return next()
    }
    let key
    if (cacheKeyFn) {
      key = cacheKeyFn(req)
    } else {
      key = [
        req.params.action,
        req.params.data,
        req.params.hash,
        req.params.format
      ].join(':')
    }

    req.cacheKey = crypto.createHash('md5').update(key).digest('hex')

    const cacheStream = backEndFactory.createCacheReadStream(req.cacheKey)

    // If we can't find in cache carry on
    cacheStream.on('notFound', function () {
      next()
    })

    cacheStream.on('meta', async (meta) => {
      if (!meta.originalId) {
        // purposely not awaited because I don't want to wait
        backEndFactory
          .updateCacheOriginalId(req.cacheKey, req.params.data)
          .catch((error) => {
            this.serviceLocator.logger.error(
              error,
              'Error updating originalId on cached item ',
              req.params.data
            )
          })
      }

      res.set('Last-Modified', new Date(meta.lastModified).toUTCString())
      res.set('Content-Type', meta.type)
      res.set('Content-Length', meta.size)
      res.set('Cache-Control', 'max-age=' + config.http.maxage)
      res.removeHeader('D-Cache')
      res.set('D-Cache', 'HIT')
      cacheStream.pipe(res)
    })
  }
}
