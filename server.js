var restify = require('restify')
  , config = require('con.figure')(require('./config')())
  , upload = require('fileupload').createFileUpload(__dirname + '/images')
  , url = require('url')
  , bunyan = require('bunyan')
  , endpoint = require('./endpoint')

// var darkroom = darkroom()
module.exports = function () {
  var log = bunyan.createLogger(
    { name: 'darkroom'
    , level: process.env.LOG_LEVEL || 'debug'
    , stream: process.stdout
    , serializers: restify.bunyan.stdSerializers
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

  // server.pre(function (request, response, next) {
  //   request.log.info({req: request}, 'start')
  //   return next()
  // })

  server.use(restify.CORS(
    { headers: ['X-Requested-With'] }
  ))

  // Manipulate the url being passed.
  server.use(function(req, res, next) {
    try {
      var nParams = Object.keys(req.params).length
      if (nParams === 0) return next()
      var dataPath = req.params[nParams - 1]
      req.params.url = dataPath
      dataPath = url.parse(dataPath).path.split('/')
      dataPath = dataPath[dataPath.length - 1]
      req.params.data = dataPath
      return next()
    } catch (e) {
      return next()
    }
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

  // GET /info/:url
  // GET /info/http://google.com/test
  server.get(/^\/+info\/+(.*)$/, endpoint.info)

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
  // server.get(/^\/+crop\/+(.*)$/, endpoint.crop)


  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/crop', endpoint.crop)

  server.post('/'
    , endpoint.utils.dedupeName
    , upload.middleware
    , endpoint.upload
  )

  server.get('/', function (req, res, next) {
    res.json({})
    return next()
  })

  // server.on('error', function (e) {
  //   console.log('server error:', e)
  // })

  server.on('uncaughtException', function (req, res, route, error) {
  //   delete error.domainEmitter
  // ; delete error.domain
  // ; delete error.domainThrown
    req.log.error(error, 'uncaughtException')
    res.send(error)
  })

  server.on('after', restify.auditLogger({
    log: bunyan.createLogger({
      name: 'audit',
      body: true,
      stream: process.stdout
    })
  }));


  return server
}