var crypto = require('crypto')
  , querystring = require('querystring')

module.exports = function (config) {
  return function (req) {
    var md5sum = crypto.createHash('md5')
      , qs = Object.keys(req.query).length > 0 ? querystring.stringify(req.query) : ''

    md5sum.update(req.params.action + req.params.data + qs + config.salt)
    var hash = md5sum.digest('hex')
    return (hash === req.params.hash)
  }
}
