var restify = require('restify')
  , config = require('con.figure')(require('./config')())
  , upload = require('fileupload').createFileUpload(config.paths.data())
  , url = require('url')
  , bunyan = require('bunyan')
  , endpoint = require('./endpoint')
  , authorised = require('./lib/authorised')

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

  // server.use(restify.throttle(
  //   { burst: 60
  //   , rate: 30
  //   , ip: true
  //   } )
  // )

  // server.pre(function (request, response, next) {
  //   request.log.info({req: request}, 'start')
  //   return next()
  // })

  server.use(restify.CORS(
    { headers: ['X-Requested-With'] }
  ))

  function checkRoute (req, res, next) {
    if (req.method !== 'GET')
      return next()

    var nParams = Object.keys(req.params).length
    if (nParams === 0) return next()
    var dataPath = req.params[nParams - 1]
    // req.params.url = dataPath
    // dataPath = url.parse(dataPath).path.split('/')
    // dataPath = dataPath[dataPath.length - 1]
    var tokens = dataPath.split(/:|\/|\\/)
    req.params.data = tokens.shift()
    if (dataPath.indexOf(':') !== -1)
      req.params.hash = tokens.shift()
    req.params.name = tokens.shift()
    req.params.action = req.url.substring(0, req.url.indexOf(req.params.data))

    if (authorised(req)) {
      res.set('Authorized-Request', req.url)
      return next()
    } else {
      var message = 'Checksum does not match'
      if (req.params.hash === undefined)
        message = 'Checksum is missing'
      return next(new restify.NotAuthorizedError(message + ' for action: ' + req.params.action))
    }
  }

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
  server.get(/^\/+info\/+(.*)$/, checkRoute, endpoint.info)


  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, checkRoute, endpoint.resize.both)

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, checkRoute, endpoint.resize.width)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, checkRoute, endpoint.resize.both)

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+(.*)$/, checkRoute, endpoint.resize.width)

  // GET /original/:url
  // GET /original/http://google.com/test
  server.get(/^\/+original\/+(.*)$/, checkRoute, endpoint.original)

  // GET /crop/:url
  // GET /crop/http://google.com/
  // server.get(/^\/+crop\/+(.*)$/, endpoint.crop)

  // server.get('/', function (req, res, next) {
  //   res.json({ homepage: true })
  //   return next()
  // })

  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/crop', endpoint.crop)

  server.post('/'
    , endpoint.utils.dedupeName
    , upload.middleware
    , endpoint.upload
  )


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