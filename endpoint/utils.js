var _ = require('lodash')

exports.dedupeName = function (req, res, next) {
  req.log.trace({ files: req.files }, 'dedupeName')
  _.each(req.files, function(obj) {
    obj.name = 'image'
  })
  res = res
  return next()
}