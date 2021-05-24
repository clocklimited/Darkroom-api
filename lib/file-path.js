var path = require('path'),
  dataHasher = require('./data-hasher')

module.exports = function (data, dir) {
  var md5sum = dataHasher(data),
    subDir = md5sum.substring(0, 3),
    file = path.join(dir, subDir)
  return file
}
