var locations = require('./locations')
  , version = require('./package.json').version
module.exports = function () {
  return { common:
    { http:
      { 'host': '127.0.0.1'
      , 'port': 17999
      , 'url': 'http://127.0.0.1:17999/'
      , 'maxage': 315360000
      }
    , 'log': true
    , quality: 85
    , apiProcesses: 1
    , paths:
      { 'data': function() { return locations.data }
      , 'cache': function() { return  locations.cache }
      }
    , version: version
    , salt: locations.salt
    , key: locations.key
    }
  }
}
