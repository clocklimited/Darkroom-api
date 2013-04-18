var createServer = require('./server')
  , config = require('con.figure')(require('./config')())
  , app = createServer()
  , mkdirp = require('mkdirp')

// Ensure dirs are setup
mkdirp.sync(config.paths.data())
mkdirp.sync(config.paths.cache())

var clusterMaster = require('./lib/cluster-master')
clusterMaster(function () {

  var domain = require('domain')
    , serverDomain = domain.create()

  serverDomain.run(function () {
    app.listen(process.env.PORT || config.http.port, function () {
      console.log('%s listening at %s', app.name, app.url)
    })
  })

  serverDomain.on('error', function (error) {
    app.log.error('domain error', error)
  })

}, { logger: app.log })
