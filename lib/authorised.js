var crypto = require('crypto')
  , config = require('con.figure')(require('../config')())

module.exports = function (req) {
  var md5sum = crypto.createHash('md5')

  md5sum.update(req.params.action + req.params.data + config.salt)
  var hash = md5sum.digest('hex')
  if (hash === req.params.hash)
    return true
  else
    return false
}