var upload = require('fileupload').createFileUpload(__dirname + '/../images')
  , darkroom = require('darkroom')

module.exports = function (req, res, next) {
  var info = new darkroom.info()
  upload
    .getAsReadStream(req.params.data + '/image')
    .pipe(info)
    .pipe(res,
      { width: +req.params.width
      , height: +req.params.height
      , crop: req.params.crop
      }
    )

  res.on('finish', function() {
    return next()
  })
}