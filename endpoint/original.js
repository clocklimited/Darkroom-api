var restify = require('restify')

module.exports = function (config, backendFactory) {
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
        })
      res.set('Cache-Control', 'max-age=' + config.http.maxage)

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
