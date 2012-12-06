var restify = require('restify')
  , config = require('con.figure')(require('./config'))

var server = restify.createServer({
  version: config.version
})

server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser())
server.use(restify.bodyParser())

server.get('/resize', function (req, res, next) {
  res.json()
  return next()
})

server.listen(config.http.port, function () {
  console.log('%s listening at %s', server.name, server.url)
})
