var locations = require('./locations')
module.exports = function () {
  return { 'common':
    { 'http':
      { 'host': '127.0.0.1'
      , 'port': 17999
      , 'url': 'http://127.0.0.1:17999/'
      , 'maxage': 315360000
      }
    , 'log': true
    , "apiProcesses": 1
    , 'paths':
      { 'data': function() { return locations.data }
      , 'cache': function() { return  locations.cache }
      }
    , 'version': '0.0.1'
    , 'salt': locations.salt
    , 'key': locations.key
    }
  }
}
