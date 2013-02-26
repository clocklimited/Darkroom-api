var createServer = require('./server')
  , config = require('con.figure')(require('./config'))
  , app = createServer()

app.listen(config.http.port, function () {
  console.log('%s listening at %s', app.name, app.url)
})