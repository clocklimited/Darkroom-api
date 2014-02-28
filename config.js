var locations = require('./locations')
module.exports = function () {
  return { 'common':
    { 'http':
      { 'host': '127.0.0.1'
      , 'port': 17999
      , 'url': 'http://127.0.0.1:17999/'
      , 'maxage': 0
      }
    , 'mongo':
      { 'host': '127.0.0.1'
      , 'port': 27017
      , 'database': 'test'
      }
    , 'log': false
    , 'paths':
      { 'data': function() { return locations.data }
      , 'cache': function() { return  locations.cache }
      }
    , 'version': '0.0.1'
    , 'salt': locations.salt
    , 'key': locations.key
    }
  , 'production':
    { 'http':
      { 'host': 'example.com'
      , 'port': 8080
      , 'maxage': 315360000
      }
    }
  , 'staging':
    { 'http':
      { 'host': 'darkroom.staging.neverunderdressed.com'
      , 'url': 'http://darkroom.staging.neverunderdressed.com/'
      , 'port': 7004
      , 'maxage': 315360000
      }
    }
  , 'testing':
    { 'http':
      { 'host': 'ewah.clockhosting.com'
      , 'url': 'http://ewah.clockhosting.com:' + locations.port + '/'
      , 'port': locations.port
      , 'maxage': 315360000
      }
    }
  , 'development':
    { 'http':
      { 'port': 18000
      }
    , 'mongo':
      { 'prop': true
      }
    , 'log': true
    }
  }
}