var crypto = require('crypto')

module.exports = function (config) {
  return function (req) {
    var md5sum = crypto.createHash('md5')

    md5sum.update(req.params.action + req.params.data + config.salt)
    var hash = md5sum.digest('hex')
    return (hash === req.params.hash)
  }
}
