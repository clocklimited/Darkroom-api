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

    cacheStream.on('meta', function (meta) {
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
