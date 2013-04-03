var config = require('con.figure')(require('../config')())
  , fileupload = require('fileupload').createFileUpload(config.paths.data())
  , mime = require('mime-magic')

module.exports = function (req, res, next) {
  res.set('X-Application-Method', 'Original Image')
  var file = req.params.data + '/image'
  console.log(config.paths.data() + file)
  fileupload.get(file, function(err, data) {
    mime(config.paths.data() + file, function (err, type) {
      if (err) return next(err)
      res.set('Content-Type', type)
      res.write(data)
      res.end()
    })
  })
  return next()
}