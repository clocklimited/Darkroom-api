var fs = require('fs')
  , path = require('path')
  , mkdirp = require('mkdirp')
  , mime = require('mime-magic')

module.exports = function (config) {
  return function (req, res, next) {
    req.cachePath = path.join(config.paths.cache(), req.params.action, req.params.data + req.params.hash)
    mkdirp(path.join(config.paths.cache(), req.params.action), function() {
      fs.stat(req.cachePath, function (error, stats) {
        mime(req.cachePath, function (err, type) {
          if (err)
            return next()
          if (!error && stats.isFile()) {
            res.set('Cache-Control', 'max-age=' + config.http.maxage)
            res.set('Content-Type', type)
            res.set('D-Cache', 'HIT')
            return fs.createReadStream(req.cachePath).pipe(res)
          } else {
            return next()
          }
        })
      })
    })
  }
}
