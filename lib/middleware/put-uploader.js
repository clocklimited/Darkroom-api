var temp = require('temp')
  , crypto = require('crypto')
  , restify = require('restify')
  , PassThrough = require('stream').PassThrough
  , fs = require('fs')

module.exports = function createPutUploader (backendFactory) {
  return function putUploader(req, res, next) {

    var stream = temp.createWriteStream()
      , md5 = crypto.createHash('md5')
      , size = 0
      , passThrough = new PassThrough()

    passThrough.pipe(stream)

    passThrough.on('data', function (data) {
      size += data.length
      md5.update(data)
    })

    stream.on('finish', function () {
      if (size === 0) return next(new restify.BadDigestError('Zero sized upload'))

      var id = md5.digest('hex')
        , writeStream = backendFactory.createDataStream(id)

      fs.createReadStream(stream.path).pipe(writeStream)
      writeStream.on('finish', function () {
        temp.cleanup()
        req.body = { file: { basename: id } }
        next()
      })
    })

     req.on('error', next)
     req.pipe(passThrough)
   }
}
