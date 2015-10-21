var Busboy = require('busboy')

module.exports = function createPutUploader (backendFactory) {

  return function postUploader (req, res, next) {
    var busboy = new Busboy({ headers: req.headers })
      , count = 0

    res.uploads = []

    busboy.on('file', function(fieldname, file) {
      var stream = backendFactory.createDataWriteStream()
      count += 1
      stream.on('done', function (file) {
        res.uploads.push(file)
        count -= 1
        if (count === 0) {
          next()
        }
      })
      file.pipe(stream)
    })

    busboy.on('finish', function() {
      if (count === 0) next()
    })

    return req.pipe(busboy)
  }
}
