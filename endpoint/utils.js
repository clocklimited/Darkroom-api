var _ = require('lodash')

exports.dedupeName = function (req, res, next) {
  _.each(req.files, function(obj) {
    obj.name = 'image'
  })
  res = res
  return next()
}