const restify = require('restify')
const corsMiddleware = require('restify-cors-middleware')
const bunyan = require('bunyan')
const createEndpoints = require('./endpoint')
const createKeyAuth = require('./lib/key-auth')
const createCacheDealer = require('./lib/middleware/cache-dealer')
const createRouteChecker = require('./lib/middleware/route-checker')
const createCacheKey = require('./endpoint/circle/cache-key-adaptor')
const createPostUploader = require('./lib/middleware/post-uploader')
const createPutUploader = require('./lib/middleware/put-uploader')

module.exports = function (config, backEndFactory) {
  const endpoint = createEndpoints(config, backEndFactory)
  const cacheDealer = createCacheDealer(config, backEndFactory)
  const checkRoute = createRouteChecker(config)
  const postUploader = createPostUploader(backEndFactory)
  const putUploader = createPutUploader(backEndFactory)

  const log = bunyan.createLogger({
    name: 'darkroom',
    level: process.env.LOG_LEVEL || 'debug',
    stream: process.stdout,
    serializers: restify.bunyan.stdSerializers
  })
  const server = restify.createServer({
    version: config.version,
    name: 'darkroom.io',
    log: config.log && log
  })
  server.use(restify.plugins.acceptParser(server.acceptable))
  server.use(restify.plugins.queryParser())

  const cors = corsMiddleware({
    preflightMaxAge: 3600, //Optional
    origins: ['*'],
    allowHeaders: [
      'X-Requested-With',
      'Accept-Version',
      'Content-Type',
      'Request-Id',
      'X-Api-Version',
      'X-Request-Id',
      'X-Requested-With',
      'X-Darkroom-Key'
    ]
  })

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

  server.use(function (req, res, next) {
    res.set('D-Cache', 'MISS')
    let closed = false
    res.on('close', function () {
      closed = true
      return next(new Error('Response was closed before end.'))
    })
    if (!closed) return next()
  })

  server.pre(cors.preflight)
  server.use(cors.actual)

  server.get('/_health', function (req, res) {
    backEndFactory.isHealthy(function (error, healthy) {
      if (!error && healthy) {
        res.send(200, 'OK')
      } else {
        if (error) {
          req.log.error(error, 'health check failed')
        }
        res.send(500, 'ERROR')
      }
    })
  })

  server.get(
    '/circle/*',
    checkRoute,
    createCacheDealer(config, backEndFactory, createCacheKey),
    endpoint.circle
  )
  server.get('/info/*', checkRoute, cacheDealer, endpoint.info)
  server.get(
    '/:width/:height/:mode/*',
    checkRoute,
    cacheDealer,
    endpoint.resize.both
  )
  server.get(
    '/:width/:height/*',
    checkRoute,
    cacheDealer,
    endpoint.resize.width
  )
  server.get('/:width/*', checkRoute, cacheDealer, endpoint.resize.width)
  server.get('/original/*', checkRoute, endpoint.original)
  server.get('/download/*', checkRoute, endpoint.download)
  server.get('/*', endpoint.original)

  server.post('/', createKeyAuth(config), postUploader, endpoint.upload)

  server.put('/', createKeyAuth(config), putUploader, endpoint.upload)

  server.post('/crop', restify.plugins.bodyParser(), endpoint.crop)

  // This is being removed until a time when the '@clocklimited/darkroom' implementation is
  // more streamy or a new version of DR is rolled out.
  //server.post('/watermark', restify.bodyParser(), endpoint.watermark)

  if (config.log) {
    server.on('uncaughtException', function (req, res, route, error) {
      req.log.error(error, 'uncaughtException')
      res.send(error)
      req.log.error('Exiting process')
      process.exit(1)
    })

    server.on(
      'after',
      restify.plugins.auditLogger({
        log: bunyan.createLogger({
          name: 'audit',
          body: true,
          stream: process.stdout
        }),
        event: 'after'
      })
    )
  }

  return server
}
