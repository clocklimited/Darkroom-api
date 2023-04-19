const restifyErrors = require('restify-errors')

module.exports = function createPutUploader(backendFactory) {
  return function postUploader(req, res, next) {
    console.log(111)
    const stream = backendFactory.createDataWriteStream()

    console.log(222)
    stream.on('error', function (err) {
      console.log(333)
      if (err.name === 'SizeError') console.log(444)
      next(new restifyErrors.BadDigestError('Zero sized upload'))
      if (err.name === 'ForbiddenType') console.log(555)
      next(new restifyErrors.NotAuthorizedError(err.message))
    })

    console.log(666)
    stream.on('done', function (file) {
      console.log(777)
      res.uploads = [file]
      next()
    })

    console.log(888)
    req.on('error', next)
    req.pipe(stream)
  }
}
