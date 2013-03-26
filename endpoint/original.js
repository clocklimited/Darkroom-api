var path = __dirname + '/../images/'
  , fileupload = require('fileupload').createFileUpload(path)
  , mime = require('mime-magic')

module.exports = function (req, res, next) {
  res.set('X-Application-Method', 'Original Image')
  var file = req.params.data + '/image'
  fileupload.get(file, function(err, data) {
    mime(path + file, function (err, type) {
      if (err) return next(err)
      res.set('Content-Type', type)
      res.write(data)
      res.end()
    })
  })
  return next()
}