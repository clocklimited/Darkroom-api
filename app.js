var createServer = require('./server')
  , config = require('con.figure')(require('./config'))
  , app = createServer()
  , cluster = require('cluster')
  , numCPUs = require('os').cpus().length

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', function(worker) {
    console.log('worker ' + worker.process.pid + ' died')
  })
} else {
  app.listen(config.http.port, function () {
    console.log('%s listening at %s', app.name, app.url)
  })
}