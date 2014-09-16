var createFileUpload = require('fileupload').createFileUpload
  , mime = require('mime-magic')
  , restify = require('restify')
  , path = require('path')

module.exports = function (config) {
  var fileupload = createFileUpload(config.paths.data())
  return function (req, res, next) {

    res.set('X-Application-Method', 'Original Image')
    var file = req.params.data + '/image'
    fileupload.get(file, function(err, data) {
      if (err) {
        return next(new restify.ResourceNotFoundError('Not Found'))
      }
      mime(path.join(config.paths.data(), file), function (err, type) {
        if (err) return next(err)
        res.set('Content-Type', type)
        res.write(data)
        res.end()
        return next()
      })
    })
  }
}
