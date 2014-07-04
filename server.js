var restify = require('restify')
  , config = require('con.figure')(require('./config')())
  , upload = require('fileupload').createFileUpload(config.paths.data())
  , bunyan = require('bunyan')
  , endpoint = require('./endpoint')
  , keyAuth = require('./lib/key-auth')
  , authorised = require('./lib/authorised')
  , async = require('async')
  , serveCached = require('./lib/serve-cached')
  , cpus = require('os').cpus()
  , concurrency = (cpus.length === 1) ? cpus.length : cpus.length - 1

// var darkroom = darkroom()
module.exports = function () {
  var log = bunyan.createLogger(
    { name: 'darkroom'
    , level: process.env.LOG_LEVEL || 'debug'
    , stream: process.stdout
    , serializers: restify.bunyan.stdSerializers
  })

  var q = async.queue(function (task, callback) {
    task(function(error) {
      callback(error)
    })
  }, concurrency)

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

  if (process.env.VERBOSE) {
    log.info('--- VERBOSE ---')
    server.pre(function (req, res, next) {
      req.log.info({ req: req.url }, 'start')
      return next()
    })

    server.on('after', function (req, res, next) {
      req.log.info({ req: req.url }, 'end')
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
    { headers: ['X-Requested-With'] }
  ))

  function checkRoute (req, res, next) {
    if (req.method !== 'GET')
      return next()

    if (Object.keys(req.params).length === 0) return next()
    var dataPath = req.url
    var tokens = dataPath.match(/([a-zA-Z0-9]{32,}):([a-zA-Z0-9]{32,})/)

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

  // GET /info/:url
  // GET /info/http://google.com/test
  server.get(/^\/+info\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    q.unshift(endpoint.info.bind(this, req, res), next)
  })

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    q.unshift(endpoint.resize.both.bind(this, req, res), next)
  })

  // GET /resize/:width/:url
  // GET /resize/:width/http://google.com/test
  server.get(/^\/+resize\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    q.unshift(endpoint.resize.width.bind(this, req, res), next)
  })

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    q.unshift(endpoint.resize.both.bind(this, req, res), next)
  })

  // GET /resize/:width/:height/:url
  // GET /resize/:width/:height/http://google.com/test
  server.get(/^\/+([0-9]+)\/+(.*)$/, checkRoute, serveCached, function (req, res, next) {
    q.unshift(endpoint.resize.width.bind(this, req, res), next)
  })

  // GET /original/:url
  // GET /original/http://google.com/test
  server.get(/^\/+original\/+(.*)$/, checkRoute, endpoint.original)

  // GET /crop/:url
  // GET /crop/http://google.com/
  // server.get(/^\/+crop\/+(.*)$/, endpoint.crop)

  server.get('/stats', function (req, res, next) {
    res.set('Cache-Control', 'max-age=0')
    res.json(
      { queue:
        { length: q.length()
        , concurrency: concurrency
        }
      }
    )
    return next()
  })

  server.get(/^\/(.*)$/, endpoint.original)

  server.post('/crop', function (req, res, next) {
    q.push(endpoint.crop.bind(this, req, res), next)
  })

  server.post('/composite', function (req, res, next) {
    q.push(endpoint.composite.bind(this, req, res), next)
  })

  server.post('/remote', endpoint.remote)

  server.post('/'
    , keyAuth
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
    if (process.env.PLIERS)
      throw error
    else {
      req.log.error(error, 'uncaughtException')
      res.send(error)
    }
  })

  server.on('after', restify.auditLogger({
    log: bunyan.createLogger({
      name: 'audit',
      body: true,
      stream: process.stdout
    })
  }))

  return server
}
