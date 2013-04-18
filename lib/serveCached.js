var config = require('con.figure')(require('../config')())
  , fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')

module.exports = function (req, res, next) {
  var cachedRequestPath = path.join(config.paths.cache(), req.url)
  mkdirp(path.join(config.paths.cache(), req.params.action), function() {
    fs.stat(cachedRequestPath, function (error, stats) {
      if (!error && stats.isFile()) {
          return fs.createReadStream(cachedRequestPath).pipe(res)
      } else {
        return next()
      }
    })
  })
}