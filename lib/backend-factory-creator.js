const MongoBackend = require('./backends/MongoBackend')
const FsBackend = require('./backends/FsBackend')

module.exports = function (config, cb) {
  let backend
  if (config.databaseUri) {
    backend = new MongoBackend(config)
  } else {
    backend = new FsBackend(config)
  }
  cb(null, backend)
}
