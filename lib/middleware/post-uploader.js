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

      stream.on('error', function (err) {
        if (err.name === 'ForbiddenType')
          next(new restifyErrors.NotAuthorizedError(err.message))
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
