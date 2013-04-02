var darkroom = require('darkroom')
  , upload = require('fileupload').createFileUpload(__dirname + '/../images')
  , _ = require('lodash')

module.exports = function (req, res, next) {

  var src = req.body.src

  // Currently resize images only deals with pngs
  res.set('Content-Type', 'image/png')

  var crop = new darkroom.crop()

  upload
    .getAsReadStream(req.params.data + '/image')
    .pipe(crop)
    .pipe(res,
      { crops: req.params.crops
      }
    )

  res.on('end', function (chunk) {
    console.log('end!', chunk)
  })

  res.on('data', function (chunk) {
    console.log('data!', chunk)
  })

  res.on('finish', function() {
    return next()
  })
}