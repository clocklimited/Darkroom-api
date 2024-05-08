const Busboy = require('busboy')
const restifyErrors = require('restify-errors')

module.exports = function createPutUploader(backendFactory) {
  return function postUploader(req, res, next) {
    const busboy = new Busboy({ headers: req.headers })
    let count = 0

    res.uploads = []

    busboy.on('file', function (fieldname, file) {
      const stream = backendFactory.createDataWriteStream()
      count += 1

      stream.on('error', function (error) {
        if (error.name === 'SizeError') {
          next(new restifyErrors.BadDigestError('Zero sized upload'))
        }
        if (error.name === 'ForbiddenType') {
          next(new restifyErrors.UnsupportedMediaTypeError(error.message))
        }
        backendFactory.logger.error(error, 'POST error')
        next(new restifyErrors.HttpError('Unknown Error'))
      })

      stream.on('done', function (file) {
        res.uploads.push(file)
        count -= 1
        if (count === 0) {
          next()
        }
      })
      file.pipe(stream)
    })

    busboy.on('finish', function () {
      if (count === 0) next()
    })

    return req.pipe(busboy)
  }
}
