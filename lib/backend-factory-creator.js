const getMongoBackendFactory = require('./backends/mongo')
const getFsBackendFactory = require('./backends/fs')

module.exports = function (config, cb) {
  if (config.databaseUri) {
    getMongoBackendFactory(config, cb)
  } else {
    getFsBackendFactory(config, cb)
  }
}
