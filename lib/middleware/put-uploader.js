const restifyErrors = require('restify-errors')

module.exports = function createPutUploader(backendFactory) {
  return function postUploader(req, res, next) {
    const stream = backendFactory.createDataWriteStream()

    stream.on('error', function (err) {
      if (err.name === 'SizeError')
        next(new restifyErrors.BadDigestError('Zero sized upload'))
      if (err.name === 'ForbiddenType')
        next(new restifyErrors.NotAuthorizedError(err.message))
    })

    stream.on('done', function (file) {
      res.uploads = [file]
      next()
    })

    req.on('error', next)
    req.pipe(stream)
  }
}
