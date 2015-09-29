var crypto = require('crypto')
  , querystring = require('querystring')
  , allowedQuerystringProperties = [ 'x0', 'y0', 'x1', 'y1', 'height', 'width', 'colour' ]
  , clone = require('lodash.clone')

module.exports = function (config) {
  return function (req) {
    var md5sum = crypto.createHash('md5')
      , qsClone = clone(req.query)

    // Delete all querystring properties that are not part
    // of our whitelist
    Object.keys(qsClone).map(function (property) {
      if (allowedQuerystringProperties.indexOf(property) === -1) {
        delete qsClone[property]
      }
    })

    var qs = Object.keys(qsClone).length > 0 ? querystring.stringify(qsClone) : ''

    md5sum.update(req.params.action + req.params.data + qs + config.salt)
    var hash = md5sum.digest('hex')
    return (hash === req.params.hash)
  }
}
