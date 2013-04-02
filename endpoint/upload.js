var _ = require('lodash')
  , config = require('con.figure')(require('../config'))
module.exports = function(req, res, next) {
  req.log.trace({ files: req.body }, 'endpoint.upload')
  var images = []
    , imageArray = _.toArray(req.body)
  _.flatten(imageArray)
  _.each(imageArray, function(files) {
    _.each(files, function(file) {
      var id = file.path.substring(0, file.path.length - 1)
      var object = { src: config.http.url + id
        , id: id
      }
      images.push(object)
    })
  })
  res.status(200)
  res.json(images.length === 1 ? images[0] : images)
  return next()
}