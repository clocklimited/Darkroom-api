var crypto = require('crypto')
  , config = require('con.figure')(require('./config')())

module.exports = function (requestString) {
  var md5sum = crypto.createHash('md5')
  md5sum.update(requestString + config.salt)

  return md5sum.digest('hex')
}
