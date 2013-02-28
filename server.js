var restify = require('restify')
  , config = require('con.figure')(require('./config'))
  , fileupload = require('fileupload').createFileUpload(__dirname + '/images')
  , darkroom = require('darkroom')


// var darkroom = darkroom()
module.exports = function () {
  var server = restify.createServer(
    { version: config.version
    , name: 'darkroom.io'
    }
  )

  server.use(restify.acceptParser(server.acceptable))
  server.use(restify.queryParser())
  server.use(restify.bodyParser())

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, function (req, res, next) {
    // darkroom.resize.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Resize Width for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, function (req, res, next) {
    res.set('X-Application-Method', 'Resize Width and Height for Image')
    res.status(200)
    var re = new darkroom.resize()

    var readStream = require('fs').createReadStream(__dirname + '/images/' + req.params[2] + '/image')
      , ws = require('fs').createWriteStream(__dirname + '/images/' + req.params[2] + '/image2')

    readStream.pipe(re).pipe(res
      , { width: +req.params[0]
        , height: +req.params[1]
        }
      )
    // res.json(false)
    return next()
  })

  // GET /original/:url
  // GET /original/http://google.com/test
  server.get(/^\/+original\/+(.*)$/, function (req, res, next) {
    // darkroom.optimise.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Original Image')
    fileupload.get(req.params[0] + '/image', function(err, data) {
      if (err) return next(err)
      res.write(data)
      res.end()
    })
    return next()
  })

  // GET /crop/:url
  // GET /crop/http://google.com/
  server.get(/^\/+crop\/+(.*)$/, function (req, res, next) {
    // darkroom.crop.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Get Crop for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/:url', function (req, res, next) {
    res.set('X-Application-Method', 'Get Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.post('/', function(req, res, next) {
    req.files.filedata.name = 'image'
    res = res
    next()
  }, fileupload.middleware, function (req, res, next) {
    var images = []
    req.body.filedata.forEach(function(file) {
      var object = { src: config.http.url + file.path.substring(0, file.path.length - 1) }
      if (req.body.filedata.length === 1)
        images = object
        return
      images.push(object)
    })
    res.status(200)
    res.json(images)
    return next()
  })

  server.get('/', function (req, res, next) {
    res.status(501)
    res.json(200)
    return next()
  })

  return server
}