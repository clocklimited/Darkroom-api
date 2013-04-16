var config = require('con.figure')(require('../config')())
  , request = require('request')

module.exports = function(req, res, next) {
  request.get(req.params.src, { encoding: null }, function (error, response, body) {
    // Dont want to do anything if response is not 200
    if (error || response.statusCode !== 200) {
      return next(error)
    }
    var imageSize = response.headers['content-length']
      , contentType = response.headers['content-type']
      , pathParts = response.request.uri.path.split('/')
      , imageName = pathParts[pathParts.length - 1]
      , info = {imageSize: imageSize, imageName: imageName, contentType: contentType}

    if (body) {
      var upload = request.post(
        config.http.url
      , function (error, response, body) {
          if (error)
              return next(error)
          if (body) {
            body = JSON.parse(body)
            body.size = info.imageSize
            body.name = info.imageName
          }
          res.json(body)
        }
      )
      var form = upload.form()
      var fileHeaders = '--' + form.getBoundary() + '\r\n'
      fileHeaders += 'Content-Disposition: form-data; name="file"; '
      fileHeaders += 'filename="' + info.imageName + '"\r\n'
      fileHeaders += 'Content-Type: ' + info.contentType + '\r\n\r\n'
      form.append('file', body, { header: fileHeaders })
    }
  })
}