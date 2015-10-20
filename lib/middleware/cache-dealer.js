var crypto = require('crypto')

//TODO This need tests
module.exports = function (config, backEndFactory, cacheKeyFn) {
  return function (req, res, next) {

    var key
    if (cacheKeyFn) {
      key = cacheKeyFn(req)
    } else {
      key = [ req.params.action, req.params.data, req.params.hash ].join(':')
    }

    req.cacheKey = crypto.createHash('md5')
      .update(key).digest('hex')

    var cacheStream = backEndFactory.createCacheReadStream(req.cacheKey)

    // If we can't find in cache carry on
    cacheStream.on('notFound', function () {
      next()
    })

    //TODO: If cache not served, make sure this doesn't cause a memory leak
    cacheStream.on('meta', function (meta) {
      res.set('Last-Modified', new Date(meta.lastModified).toUTCString())
      res.set('Content-Type', meta.type)
      res.set('Content-Length', meta.size)
      res.set('Cache-Control', 'max-age=' + config.http.maxage)
      res.set('D-Cache', 'HIT')
      cacheStream.pipe(res)
    })

  }
}
