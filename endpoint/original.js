var restify = require('restify')

module.exports = function (config, backendFactory, options) {
  return function (req, res, next) {

    if (!req.params.data) {
      return next(new restify.ResourceNotFoundError('Not Found'))
    }

    res.set('X-Application-Method', 'Original Image')
    var stream = backendFactory.createDataReadStream(req.params.data)
    stream.on('meta', function (meta) {
      res.set(
        { 'Content-Type': meta.type
        , 'Content-Length': meta.size
        , 'Last-Modified': new Date(meta.lastModified).toUTCString()
        })
      res.set('Cache-Control', 'max-age=' + config.http.maxage)
      if (options && options.download) {
        var filename = 'download'
          , urlParts = req.url.split('/')
          , lastPart = urlParts[urlParts.length - 1]
        if (urlParts.length === 4) {
          filename = lastPart
        }
        res.set('Content-Disposition', 'attachment;filename="' + filename + '"')
      }

      stream.pipe(res)
    })
    stream.on('notFound', function () {
      res.removeHeader('Cache-Control')
      res.set('Cache-Control', 'max-age=' + config.http.pageNotFoundMaxage)
      next(new restify.ResourceNotFoundError('Not Found'))
    })
    stream.on('error', next)
  }
}
