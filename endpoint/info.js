var dp = require('darkroom-persistance')
  , retrieve = dp.RetrieveStream
  , darkroom = require('darkroom')
  , path = require('path')
  , config = require('con.figure')(require('../config')())

module.exports = function (req, res, next) {
  var info = new darkroom.info()
  req.params.path = path.join(config.paths.data(), req.params.data, 'image')

  retrieve(req.params, { isFile: true })
    .pipe(info)
    .pipe(res,
      { width: +req.params.width
      , height: +req.params.height
      , crop: req.params.crop
      }
    )

  info.on('error', function (e) {
    req.log.error(e, 'info.error')
  })

  res.on('finish', function () {
    return next()
  })
}