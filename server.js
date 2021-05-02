const express = require('express')
const bodyParser = require('body-parser')
const corsMiddleware = require('restify-cors-middleware')
const createEndpoints = require('./endpoint')
const createKeyAuth = require('./lib/key-auth')
const createCacheDealer = require('./lib/middleware/cache-dealer')
const createRouteChecker = require('./lib/middleware/route-checker')
const createCacheKey = require('./endpoint/circle/cache-key-adaptor')
const createPostUploader = require('./lib/middleware/post-uploader')
const createPutUploader = require('./lib/middleware/put-uploader')

module.exports = function (serviceLocator, backEndFactory) {
  const { config, logger } = serviceLocator
  const endpoint = createEndpoints(serviceLocator, backEndFactory)
  const cacheDealer = createCacheDealer(config, backEndFactory)
  const checkRoute = createRouteChecker(config)
  const postUploader = createPostUploader(backEndFactory)
  const putUploader = createPutUploader(backEndFactory)

  const app = express()
  app.disable('x-powered-by')
  // TODO
  // app.use(restify.plugins.acceptParser(server.acceptable))

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
    logger.info('--- VERBOSE ---')
    // TODO
    app.use(function (req, res, next) {
      req.requestId = +Date.now() + Math.random()
      logger.info({ req: req.url, id: req.requestId }, 'start')
      return next()
    })

    app.on('after', function (req) {
      logger.info({ req: req.url, id: req.requestId }, 'end')
    })
  }

  app.use(function (req, res, next) {
    res.set('D-Cache', 'MISS')
    let closed = false
    // res.on('close', function () {
    // closed = true
    // return next(new Error('Response was closed before end.'))
    // })
    if (!closed) return next()
  })

  app.use(cors.preflight)
  app.use(cors.actual)

  app.get('/_health', function (req, res) {
    backEndFactory.isHealthy(function (error, healthy) {
      if (!error && healthy) {
        res.send(200, 'OK')
      } else {
        if (error) {
          logger.error(error, 'health check failed')
        }
        res.send(500, 'ERROR')
      }
    })
  })

  app.get(
    '/circle/*',
    checkRoute,
    createCacheDealer(config, backEndFactory, createCacheKey),
    endpoint.circle
  )
  app.get('/info/*', checkRoute, cacheDealer, endpoint.info)
  app.get('/original/*', checkRoute, endpoint.original)
  app.get('/download/*', checkRoute, endpoint.download)
  app.get(
    '/:width/:height/:mode/*',
    checkRoute,
    cacheDealer,
    endpoint.resize.mode
  )
  app.get('/:width/:height/*', checkRoute, cacheDealer, endpoint.resize.both)
  app.get('/:width/*', checkRoute, cacheDealer, endpoint.resize.width)
  app.get('/*', endpoint.original)

  app.post('/', createKeyAuth(config), postUploader, endpoint.upload)

  app.put('/', createKeyAuth(config), putUploader, endpoint.upload)

  app.post('/crop', bodyParser.json(), endpoint.crop)

  // This is being removed until a time when the '@clocklimited/darkroom' implementation is
  // more streamy or a new version of DR is rolled out.
  //server.post('/watermark', restify.bodyParser(), endpoint.watermark)

  // eslint-disable-next-line
  app.use((error, req, res, next) => {
    if (error.statusCode && typeof error.toJSON === 'function') {
      // is a RestifyError
      return res.status(error.statusCode).json(error.toJSON())
    }
    res.status(500).json(error)
  })
  if (config.log) {
    app.on('uncaughtException', function (req, res, route, error) {
      logger.error(error, 'uncaughtException')
      res.send(error)
      logger.error('Exiting process')
      process.exit(1)
    })
    /* TODO
    app.on(
      'after',
      restify.plugins.auditLogger({
        log: bunyan.createLogger({
          name: 'audit',
          body: true,
          stream: process.stdout
        }),
        event: 'after'
      })
    )*/
  }

  return app
}
