var darkroom = require('darkroom')

var resizeImage = function (req, res, next) {
  req.params.width = req.params.width || req.params[0]
  req.params.height = req.params.height || req.params[1]
  // res.set('X-Application-Method', 'Resize Width and Height for Image')
  res.set('Content-Type', 'image/png')

  var re = new darkroom.resize()
    , readStream = require('fs').createReadStream(__dirname + '/../images/' + req.params.data + '/image')

  readStream.pipe(re).pipe(res
    , { width: +req.params.width
      , height: +req.params.height
      , crop: req.params.crop
      }
    )

  res.on('finish', function() {
    return next()
  })
}

exports.width = function (req, res, next) {
  req.params.crop = false
  res.set('X-Application-Method', 'Resize width and maintain aspect ratio')
  return resizeImage.call(this, req, res, next)
}

exports.both = function (req, res, next) {
  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  res.set('X-Application-Method', 'Resize both dimensions')
  return resizeImage.call(this, req, res, next)
}
