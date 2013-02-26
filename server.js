var restify = require('restify')
  , config = require('con.figure')(require('./config'))
  , bunyan = require('bunyan')
  // , darkroom = require('darkroom')


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

  server.on('after', restify.auditLogger(
    { log: bunyan.createLogger(
        { name: 'audit'
        , stream: process.stdout
        , serializers: bunyan.stdSerializers
        })
    })
  )

  server.get('/resize/:width/:height/:id', function (req, res, next) {
    // darkroom.resize.pipe(req.body.image, req.body.parameters)
    console.log(req.params)
    res.set('X-Application-Method', 'Resize Width and Height for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/resize/:width/:id', function (req, res, next) {
    // darkroom.resize.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Resize Width for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/original/:id', function (req, res, next) {
    // darkroom.optimise.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Original Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/crop/:id', function (req, res, next) {
    // darkroom.crop.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Get Crop for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/:id', function (req, res, next) {
    res.status(501)
    res.set('X-Application-Method', 'Get Image')
    res.json(false)
    return next()
  })

  server.post('/', function (req, res, next) {
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/', function (req, res, next) {
    res.status(501)
    res.json(200)
    return next()
  })

  return server
}