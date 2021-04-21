const createServer = require('./server')
const config = require('con.figure')(require('./config')())
const clustered = require('clustered')
const clusterSize = process.env.API_PROCESSES || config.apiProcesses
const createBackendFactory = require('./lib/backend-factory-creator')

createBackendFactory(config, function (err, factory) {
  if (err) {
    console.error('Error starting darkroom')
    console.error(err.message)
    console.error(err.stack)
    return process.exit(1)
  }

  factory.setup(function () {
    const app = createServer(config, factory)

    if (process.env.NODE_ENV === undefined) {
      app.log.fatal('NODE_ENV (env) not set, process may crash.')
    }

    if (isNaN(clusterSize)) {
      app.log.fatal(
        'Invalid cluster size: "%s", please set/update API_PROCESSES (env) or config.apiProcesses',
        clusterSize
      )
      process.exit(1)
    }

    clustered(
      function () {
        app.listen(process.env.PORT || config.http.port, function () {
          app.log.info('%s listening at %s', app.name, app.url)
        })
      },
      { logger: app.log, size: clusterSize }
    )
  })
})
