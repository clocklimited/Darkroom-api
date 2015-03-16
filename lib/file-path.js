var crypto = require('crypto')
  , path = require('path')

module.exports = function (data, dir) {
  var md5sum = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')
    , subDir = md5sum.substring(0, 3)
    , file = path.join(dir, subDir)
  return file
}
