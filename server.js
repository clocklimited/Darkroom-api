var restify = require('restify')
  , bunyan = require('bunyan')
  , createEndpoints = require('./endpoint')
  , createKeyAuth = require('./lib/key-auth')
  , createAuthorised = require('./lib/authorised')
  , createServeCached = require('./lib/serve-cached')
  , createCircleEndpoint = require('./endpoint/circle')
  , createCacheKey = require('./endpoint/circle/cache-key-adaptor')

module.exports = function (config, backEndFactory) {
  /* jshint maxstatements: 27 */
  var endpoint = createEndpoints(config, backEndFactory)
    , authorised = createAuthorised(config)
    , serveCached = createServeCached(config, backEndFactory)
    , circleEndpoint = createCircleEndpoint(config, backEndFactory)
    , log = bunyan.createLogger(
      { name: 'darkroom'
      , level: process.env.LOG_LEVEL || 'debug'
      , stream: process.stdout
      , serializers: restify.bunyan.stdSerializers
      })
    , server = restify.createServer(
      { version: config.version
      , name: 'darkroom.io'
      , log: config.log && log
      }
    )
  server.use(restify.acceptParser(server.acceptable))
  server.use(restify.queryParser())

  if (config.log) {
    log.info('--- VERBOSE ---')
    server.pre(function (req, res, next) {
      req.requestId = +Date.now() + Math.random()
      req.log.info({ req: req.url, id: req.requestId }, 'start')
      return next()
    })

    server.on('after', function (req) {
      req.log.info({ req: req.url, id: req.requestId }, 'end')
    })
  }

  server.use(function(req, res, next) {
    res.set('D-Cache', 'MISS')
    var closed = false
    res.on('close', function () {
      closed = true
      return next(new Error('Response was closed before end.'))
    })
    if (!closed)
      return next()
  })

  server.use(restify.CORS(
    { headers: [ 'X-Requested-With' ] }
  ))

  function checkRoute (req, res, next) {
    /* jshint maxcomplexity: 7 */
    if (req.method !== 'GET')
      return next()

    if (Object.keys(req.params).length === 0) return next()
    var dataPath = req.url
      , tokens = dataPath.match(/([a-zA-Z0-9]{32,}):([a-zA-Z0-9]{32,})/)

    // Error if an valid token is not found
    if (!Array.isArray(tokens) || (tokens.length < 3)) {
      return next(new restify.ResourceNotFoundError('Not Found'))
    }

    tokens.shift()
    req.params.data = tokens.shift()
    req.params.hash = tokens.shift()
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

  server.opts(/.*/, function(req, res, next) {
    res.set('Access-Control-Allow-Headers'
      , 'accept-version, content-type, request-id, '
      + 'x-api-version, x-request-id, x-requested-with, x-darkroom-key')

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, GET')
    res.set('Access-Control-Max-Age', '3600')
    res.send(200)
    return next()
  })

  server.get(/^\/+circle\/+(.*)$/, checkRoute
    , createServeCached(config, backEndFactory, createCacheKey), circleEndpoint)
  server.get(/^\/+info\/+(.*)$/, checkRoute, serveCached, endpoint.info)
  server.get(/^\/([0-9]+)\/([0-9]+)\/(fit|cover|stretch)\/(.*)$/, checkRoute, serveCached, endpoint.resize.both)
  server.get(/^\/+([0-9]+)\/([0-9]+)\/+(.*)$/, checkRoute, serveCached, endpoint.resize.width)
  server.get(/^\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, endpoint.resize.width)
  server.get(/^\/+original\/+(.*)$/, checkRoute, endpoint.original)
  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/', restify.bodyParser()
    , createKeyAuth(config)
    , endpoint.utils.dedupeName
    , backEndFactory.uploadMiddleware
    , endpoint.upload
  )

  server.put('/'
    , createKeyAuth(config)
    , endpoint.utils.dedupeName
    , backEndFactory.streamUploadMiddleware
    , endpoint.upload
  )

  server.post('/crop', restify.bodyParser(), endpoint.crop)

  // This is being removed until a time when the 'darkroom' implementation is more streamy or a new version of DR
  // is rolled out.
  //server.post('/watermark', restify.bodyParser(), endpoint.watermark)

  if (config.log) {

    server.on('uncaughtException', function (req, res, route, error) {
      req.log.error(error, 'uncaughtException')
      res.send(error)
      req.log.error('Exiting process')
      process.exit(1)
    })

    server.on('after', restify.auditLogger({
      log: bunyan.createLogger(
      { name: 'audit'
      , body: true
      , stream: process.stdout
      })
    }))
  }

  return server
}
