var restify = require('restify')
  , bunyan = require('bunyan')
  , createEndpoints = require('./endpoint')
  , createKeyAuth = require('./lib/key-auth')
  , createAuthorised = require('./lib/authorised')
  , createCacheDealer = require('./lib/middleware/cache-dealer')
  , createCircleEndpoint = require('./endpoint/circle')
  , createCacheKey = require('./endpoint/circle/cache-key-adaptor')
  , createPostUploader = require('./lib/middleware/post-uploader')
  , createPutUploader = require('./lib/middleware/put-uploader')
  , createResponseFormatWhitelister = require('./lib/response-format-whitelister')
  , path = require('path')

module.exports = function (config, backEndFactory) {
  /* jshint maxstatements: 27 */
  var endpoint = createEndpoints(config, backEndFactory)
    , authorised = createAuthorised(config)
    , cacheDealer = createCacheDealer(config, backEndFactory)
    , circleEndpoint = createCircleEndpoint(config, backEndFactory)
    , postUploader = createPostUploader(backEndFactory)
    , putUploader = createPutUploader(backEndFactory)
    , whitelistResponseFormat = createResponseFormatWhitelister(config)
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
    req.params.format = whitelistResponseFormat(path.extname(req.url).substring(1).toLowerCase())

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

  server.get('/_health', function (req, res, next) {
    backEndFactory.isHealthy(function (err, healthy) {
      if (err) return next(err)
      if (healthy) {
        res.send(200, 'OK')
      } else {
        console.error(err)
        res.send(500, 'ERROR')
      }

    })
  })

  server.get(/^\/+circle\/+(.*)$/, checkRoute
    , createCacheDealer(config, backEndFactory, createCacheKey), circleEndpoint)
  server.get(/^\/+info\/+(.*)$/, checkRoute, cacheDealer, endpoint.info)
  server.get(/^\/([0-9]+)\/([0-9]+)\/(fit|cover|stretch)\/(.*)$/, checkRoute, cacheDealer, endpoint.resize.both)
  server.get(/^\/+([0-9]+)\/([0-9]+)\/+(.*)$/, checkRoute, cacheDealer, endpoint.resize.width)
  server.get(/^\/+([0-9]+)\/+(.*)$/, checkRoute, cacheDealer, endpoint.resize.width)
  server.get(/^\/+original\/+(.*)$/, checkRoute, endpoint.original)
  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/'
    , createKeyAuth(config)
    , postUploader
    , endpoint.upload
  )

  server.put('/'
    , createKeyAuth(config)
    , putUploader
    , endpoint.upload
  )

  server.post('/crop', restify.bodyParser(), endpoint.crop)

  // This is being removed until a time when the 'verydarkroom' implementation is
  // more streamy or a new version of DR is rolled out.
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
