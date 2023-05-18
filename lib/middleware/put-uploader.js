const restifyErrors = require('restify-errors')

module.exports = function createPutUploader(backendFactory) {
  return function postUploader(req, res, next) {
    const stream = backendFactory.createDataWriteStream()

    stream.on('error', function (error) {
      if (error.name === 'SizeError') {
        next(new restifyErrors.BadDigestError('Zero sized upload'))
      }
      if (error.name === 'ForbiddenType') {
        next(new restifyErrors.NotAuthorizedError(error.message))
      }
      backendFactory.logger.error(error, 'PUT error')
      next(new restifyErrors.HttpError('Unknown Error'))
    })

    stream.on('done', function (file) {
      res.uploads = [file]
      next()
    })

    req.on('error', next)
    req.pipe(stream)
  }
}
