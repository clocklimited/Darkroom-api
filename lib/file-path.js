var crypto = require('crypto')
  , path = require('path')

module.exports = function (data, dir) {
  var md5sum = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
    , file = path.join(dir, md5sum)
  return file
}
