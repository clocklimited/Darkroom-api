var restify = require('restify')
  , config = require('con.figure')(require('./config'))
  , upload = require('fileupload').createFileUpload(__dirname + '/images')
  , url = require('url')
  , bunyan = require('bunyan')
  , endpoint = require('./endpoint')

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
  // server.on('after', restify.auditLogger({ log: log }))
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

  // Set caching for browsers
  server.use(function(req, res, next) {
    res.set('Cache-Control', 'max-age=' + config.http.maxage)
    return next()
  })

  server.opts(/.*/, function(req, res, next) {
    res.set('Access-Control-Allow-Headers'
      , 'accept-version, content-type, request-id, '
      + 'x-api-version, x-request-id, x-requested-with')

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, GET')
    res.set('Access-Control-Max-Age', '3600')
    res.send(200)
    return next()
  })

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, endpoint.resize.width)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, endpoint.resize.both)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, endpoint.resize.both)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+(.*)$/, endpoint.resize.width)

  // GET /original/:url
  // GET /original/http://google.com/test
  server.get(/^\/+original\/+(.*)$/, endpoint.original)

  // GET /crop/:url
  // GET /crop/http://google.com/
  server.get(/^\/+crop\/+(.*)$/, endpoint.crop)

  server.get('/:url', function (req, res, next) {
    res.set('X-Application-Method', 'Get Image')
    res.status(501)
    return next()
  })

  server.post('/', endpoint.utils.dedupeName, upload.middleware, endpoint.upload)

  server.get('/', function (req, res, next) {
    res.json(200)
    return next()
  })

  return server
}