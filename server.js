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

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, function (req, res, next) {
    // darkroom.resize.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Resize Width and Height for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, function (req, res, next) {
    // darkroom.resize.pipe(req.body.image, req.body.parameters)
        console.log('hhs', req.params)
    res.set('X-Application-Method', 'Resize Width for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  // GET /original/:url
  // GET /original/http://google.com/test
  server.get(/^\/+original\/+(.*)$/, function (req, res, next) {
    // darkroom.optimise.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Original Image')
    res.status(501)
    res.json(false)
    return next()
  })

  // GET /crop/:url
  // GET /crop/http://google.com/::?L
  server.get(/^\/+crop\/+(.*)$/, function (req, res, next) {
    // darkroom.crop.pipe(req.body.image, req.body.parameters)
    res.set('X-Application-Method', 'Get Crop for Image')
    res.status(501)
    res.json(false)
    return next()
  })

  server.get('/:url', function (req, res, next) {
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