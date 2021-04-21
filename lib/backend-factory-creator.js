const getMongoBackendFactory = require('./backends/mongo')
const FsBackend = require('./backends/FsBackend')

module.exports = function (config, cb) {
  if (config.databaseUri) {
    getMongoBackendFactory(config, cb)
  } else {
    const backend = new FsBackend(config)
    cb(null, backend)
  }
}
