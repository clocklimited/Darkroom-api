var restify = require('restify')
  , config = require('con.figure')(require('./config'))
  , fileupload = require('fileupload').createFileUpload(__dirname + '/images')
  , darkroom = require('darkroom')
  , _ = require('lodash')
  , url = require('url')
  , bunyan = require('bunyan')


// var darkroom = darkroom()
module.exports = function () {
  var log = bunyan.createLogger(
    { name: 'my_restify_application'
    , level: process.env.LOG_LEVEL || 'debug'
    , stream: process.stdout
    , serializers: bunyan.stdSerializers
  })

  var server = restify.createServer(
    { version: config.version
    , name: 'darkroom.io'
    , log: log
    }
  )
  // server.pre(restify.pre.sanitizePath())
  server.use(restify.acceptParser(server.acceptable))
  server.use(restify.queryParser())
  server.use(restify.bodyParser())
  server.on('after', restify.auditLogger({ log: log }))
  server.use(restify.CORS(
    { headers: ['X-Requested-With'] }
  ))

  // Manipulate the url being passed.
  server.use(function(req, res, next) {
    var nParams = Object.keys(req.params).length
    if (nParams === 0) return next()
    var data = req.params[nParams - 1]
    data = url.parse(data).path.split('/')
    data = data[data.length - 1]
    req.params.data = data
    return next()
  })

  // // Set caching for browsers
  // server.use(function(req, res, next) {
  //   res.set('Cache-Control', 'max-age=315360000')
  //   return next()
  // })

  server.opts(/.*/, function(req, res, next) {
    res.set('Access-Control-Allow-Headers', 'accept-version, content-type, request-id, x-api-version, x-request-id, x-requested-with')
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, GET')
    res.set('Access-Control-Max-Age', '3600')
    res.send(200)
    return next()
  })



  function resizeImage (req, res, next) {
    req.params.width = req.params.width || req.params[0]
    req.params.height = req.params.height || req.params[1]
    res.set('X-Application-Method', 'Resize Width and Height for Image')
    res.status(200)
    var re = new darkroom.resize()
      , readStream = require('fs').createReadStream(__dirname + '/images/' + req.params.data + '/image')

    readStream.pipe(re).pipe(res
      , { width: +req.params.width
        , height: +req.params.height
        , crop: req.params.crop
        }
      )
    return next()
  }

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, function (req, res, next) {
    req.params.width = req.params[0]
    req.params.height = 0
    req.params.crop = false
    res.set('X-Application-Method', 'Resize Width for Image')
    return next()
  }, resizeImage)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, resizeImage)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, resizeImage)

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
    res.status(200)
    var re = new darkroom.resize()

    var readStream = require('fs').createReadStream(__dirname + '/images/' + req.url + '/image')

    readStream.pipe(re).pipe(res)
    return next()
  })

  server.post('/', function(req, res, next) {
    _.each(req.files, function(obj) {
      obj.name = 'image'
    })
    res = res
    next()
  }, fileupload.middleware, function (req, res, next) {
    var images = []
      , imageArray = _.toArray(req.body)
    _.flatten(imageArray)
    _.each(imageArray[0], function(file) {
      var id = file.path.substring(0, file.path.length - 1)
      var object = { src: config.http.url + id
        , id: id
      }
      images.push(object)
    })
    res.status(200)
    res.json(images.length === 1 ? images[0] : images)
    return next()
  })

  server.get('/', function (req, res, next) {
    res.status(501)
    res.json(200)
    return next()
  })

  return server
}