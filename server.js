  var restify = require('restify')
  , bunyan = require('bunyan')
  , async = require('async')
  , cpus = require('os').cpus()
  , createFileUpload = require('fileupload').createFileUpload
  , createFileAdaptor = require('./lib/file-upload-adapter')
  , createEndpoints = require('./endpoint')
  , createKeyAuth = require('./lib/key-auth')
  , createAuthorised = require('./lib/authorised')
  , createServeCached = require('./lib/serve-cached')
  , concurrency = (cpus.length === 1) ? cpus.length : cpus.length - 1

module.exports = function (config) {
  /* jshint maxstatements: 26 */

  var endpoint = createEndpoints(config)
    , authorised = createAuthorised(config)
    , serveCached = createServeCached(config)
    , log = bunyan.createLogger(
      { name: 'darkroom'
      , level: process.env.LOG_LEVEL || 'debug'
      , stream: process.stdout
      , serializers: restify.bunyan.stdSerializers
      })
    , fileAdaptor = createFileAdaptor(config.paths.data(), config.log && log)
    , upload = createFileUpload({ adapter: fileAdaptor })
    , queue = async.queue(function (task, callback) {
      task(function(error) {
        callback(error)
      })
    }, concurrency)
    , server = restify.createServer(
      { version: config.version
      , name: 'darkroom.io'
      , log: config.log && log
      }
    )
  // server.pre(restify.pre.sanitizePath())
  server.use(restify.acceptParser(server.acceptable))
  server.use(restify.queryParser())
  server.use(restify.bodyParser())

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

  server.get(/^\/+info\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    queue.unshift(endpoint.info.bind(this, req, res), next)
  })

  server.get(/^\/([0-9]+)\/([0-9]+)\/(fit|cover|stretch)\/(.*)$/, checkRoute, serveCached, function (req, res, next) {
    queue.unshift(endpoint.resize.both.bind(this, req, res), next)
  })

  server.get(/^\/+([0-9]+)\/([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    queue.unshift(endpoint.resize.width.bind(this, req, res), next)
  })

  server.get(/^\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    queue.unshift(endpoint.resize.width.bind(this, req, res), next)
  })

  // GET /original/:url
  server.get(/^\/+original\/+(.*)$/, checkRoute, endpoint.original)

  server.get('/stats', function (req, res, next) {
    res.set('Cache-Control', 'max-age=0')
    res.json(
      { queue:
        { length: queue.length()
        , concurrency: concurrency
        }
      }
    )
    return next()
  })

  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/'
    , createKeyAuth(config)
    , endpoint.utils.dedupeName
    , upload.middleware
    , endpoint.upload
  )

  server.post('/crop', function (req, res, next) {
    queue.push(endpoint.crop.bind(this, req, res), next)
  })

  server.post('/watermark', function (req, res, next) {
    queue.push(endpoint.watermark.bind(this, req, res), next)
  })

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
