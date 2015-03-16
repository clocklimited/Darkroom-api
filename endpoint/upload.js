var _ = require('lodash')

module.exports = function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  var images = []
    , imageArray = _.toArray(req.body)
  _.flatten(imageArray)
  _.each(imageArray, function(files) {
    _.each(files, function(file) {
      var id = file.basename
      , object = { src: id
        , id: id
      }
      images.push(object)
    })
  })
  res.status(200)
  res.json(images.length === 1 ? images[0] : images)
  return next()
}
