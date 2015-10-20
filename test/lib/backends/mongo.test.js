var createBackend = require('../../../lib/backends/mongo')
  , tests = require('./backend-tests')

function getConfig() {
  return { databaseUri: 'mongodb://localhost:27017/darkroom-test' }
}

describe('Mongo Backend', function () {
  tests(createBackend, getConfig)
})
