var createBackend = require('../../../lib/backends/fs')
  , temp = require('temp')
  , mkdirp = require('mkdirp')
  , tests = require('./backend-tests')

temp.track()

function getConfig() {
  var data = temp.path()
    , cache = temp.path()
  mkdirp.sync(data)
  mkdirp.sync(cache)
  return { paths: { data: function () { return data }, cache: function () { return cache } } }
}

describe('Filesystem Backend', function () {
  tests(createBackend, getConfig)
})
