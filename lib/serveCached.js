var config = require('con.figure')(require('../config')())
  , fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')

module.exports = function (req, res, next) {
  req.cachePath = path.join(config.paths.cache(), req.params.action, req.params.data + req.params.hash)
  mkdirp(path.join(config.paths.cache(), req.params.action), function() {
    fs.stat(req.cachePath, function (error, stats) {
      if (!error && stats.isFile()) {
          return fs.createReadStream(req.cachePath).pipe(res)
      } else {
        return next()
      }
    })
  })
}