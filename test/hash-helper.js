const crypto = require('crypto')
const config = require('con.figure')(require('./config')())

module.exports = function (requestString, qs = '') {
  const md5sum = crypto.createHash('md5')
  md5sum.update(requestString + qs + config.salt)

  return md5sum.digest('hex')
}
