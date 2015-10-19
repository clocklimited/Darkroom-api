var getMongoBackendFactory = require('./backends/mongo')
  , getFsBackendFactory = require('./backends/fs')

module.exports = function (config, cb) {
  if (config.databaseUri) {
    getMongoBackendFactory(config, cb)
  } else {
    getFsBackendFactory(config, cb)
  }
}
