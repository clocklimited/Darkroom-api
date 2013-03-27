var darkroom = require('darkroom')
// , upload = require('fileupload').createFileUpload(__dirname + '/../images')
, request = require('request')

exports.width = function (req, res, next) {
  req.params.crop = false
  res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
  return resizeImage.call(this, req, res, next)
}

exports.both = function (req, res, next) {
  res.set('X-Application-Method', 'Resize both dimensions')
  return resizeImage.call(this, req, res, next)
}

var resizeImage = function (req, res, next) {
  req.params.width = req.params.width || req.params[0]
  req.params.height = req.params.height || req.params[1]

  // Currently resize images only deals with pngs
  res.set('Content-Type', 'image/png')

  var re = new darkroom.resize()

  request(req.params.data)
    .pipe(re)
    .pipe(res,
      { width: +req.params.width
      , height: +req.params.height
      , crop: req.params.crop
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