const restifyErrors = require('restify-errors')

module.exports = function (serviceLocator, backendFactory, options) {
  const { config } = serviceLocator
  return function (req, res, next) {
    if (!req.params.data) {
      return next(new restifyErrors.ResourceNotFoundError('Not Found'))
    }

    const stream = backendFactory.createDataReadStream(req.params.data)
    stream.on('meta', function (meta) {
      res.set({
        'Content-Type': meta.type,
        'Content-Length': meta.size,
        'Last-Modified': new Date(meta.lastModified).toUTCString()
      })
      res.set('Cache-Control', 'max-age=' + config.http.maxage)
      if (options && options.download) {
        const urlParts = req.url.split('/')
        let filename = 'download'
        let lastPart = urlParts[urlParts.length - 1]
        if (urlParts.length === 4) {
          filename = lastPart
        }
        res.set('Content-Disposition', 'attachment;filename="' + filename + '"')
        res.set('X-Application-Method', 'Original image downloaded')
      } else {
        res.set('X-Application-Method', 'Original image')
      }

      stream.pipe(res)
    })
    stream.on('notFound', function () {
      res.removeHeader('Cache-Control')
      res.set('Cache-Control', 'max-age=' + config.http.pageNotFoundMaxage)
      next(new restifyErrors.ResourceNotFoundError('Not Found'))
    })
    stream.on('error', next)
  }
}
