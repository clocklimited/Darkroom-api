const restify = require('restify')

module.exports = function createPutUploader(backendFactory) {
  return function postUploader(req, res, next) {
    const stream = backendFactory.createDataWriteStream()

    stream.on('error', function (err) {
      if (err.name === 'SizeError')
        next(new restify.BadDigestError('Zero sized upload'))
      if (err.name === 'ForbiddenType')
        next(new restify.NotAuthorizedError(err.message))
    })

    stream.on('done', function (file) {
      res.uploads = [file]
      next()
    })

    req.on('error', next)
    req.pipe(stream)
  }
}
