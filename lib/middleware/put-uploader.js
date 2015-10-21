var restify = require('restify')

module.exports = function createPutUploader (backendFactory) {
  return function postUploader(req, res, next) {

    var stream = backendFactory.createDataWriteStream()

    stream.on('error', function (err) {
      if (err.name === 'SizeError') next(new restify.BadDigestError('Zero sized upload'))
    })

    stream.on('done', function (file) {
      res.uploads = [ file ]
      next()
    })

   req.on('error', next)
   req.pipe(stream)
   }
}
