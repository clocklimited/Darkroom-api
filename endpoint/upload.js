var _ = require('lodash')

module.exports = function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  var imageArray = _.toArray(req.body)
    , images = _.flatten(imageArray).map(function(file) {
      return { src: file.basename
        , id: file.basename
      }
    })
  res.status(200)
  res.json(images.length === 1 ? images[0] : images)
  return next()
}
