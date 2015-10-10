var createServer = require('./server')
  , config = require('con.figure')(require('./config')())
  , mkdirp = require('mkdirp')
  , clustered = require('clustered')
  , clusterSize = process.env.API_PROCESSES || config.apiProcesses
  , createBackendFactory = require('./lib/backend-factory-creator')

// Ensure dirs are setup
mkdirp.sync(config.paths.data())
mkdirp.sync(config.paths.cache())

createBackendFactory(config, function (err, factory) {

  var app = createServer(config, factory)

  if (process.env.NODE_ENV === undefined) {
    app.log.fatal('NODE_ENV (env) not set, process may crash.')
  }

  if (isNaN(clusterSize)) {
    app.log.fatal('Invalid cluster size: "%s", please set/update API_PROCESSES (env) or config.apiProcesses', clusterSize)
    process.exit(1);
  }

  clustered(function () {
      var domain = require('domain')
        , serverDomain = domain.create()

      serverDomain.run(function () {
        app.listen(process.env.PORT || config.http.port, function () {
          app.log.info('%s listening at %s', app.name, app.url)
        })
      })

      serverDomain.on('error', function (error) {
        app.log.error('domain error', error)
      })

    }
  , { logger: app.log
    , size: clusterSize
    }
  )

})
