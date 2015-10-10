var getFsBackendFactory = require('./backends/fs')

module.exports = function (config, cb) {
  getFsBackendFactory(config, cb)
}
