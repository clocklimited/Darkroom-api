var mime = require('mime-magic')
  , fs = require('fs')
  , path = require('path')
  , restify = require('restify')

module.exports = function (config) {
  return function (req, res, next) {

    if (!req.params.data) {
      return next(new restify.ResourceNotFoundError('Not Found'))
    }

    res.set('X-Application-Method', 'Original Image')
    var imageHash = req.params.data
      , filePath = path.join(config.paths.data(), imageHash.substring(0, 3), imageHash)

    fs.readFile(filePath, function (error, data) {
      if (error) return next(new restify.ResourceNotFoundError('Not Found'))
      mime(filePath, function (err, type) {
        if (err) return next(err)
        res.set('Content-Type', type)
        res.write(data)
        res.end()
        return next()
      })
    })
  }
}
