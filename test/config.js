module.exports = function () {
  return (
    { 'common':
      { 'http':
        { 'host': '127.0.0.1'
        , 'port': 17999
        , 'url': 'http://127.0.0.1:17999/'
        , 'maxage': 0
        , 'pageNotFoundMaxage': 0
        }
      , 'log': false
      , 'databaseUri': 'mongodb://localhost:27017/darkroom-unit'
      // , 'paths':
      //   { 'data': function() { return '/tmp/dr/data' }
      //   , 'cache': function() { return '/tmp/dr/cache' }
      //   }
      , 'version': '0.0.1'
      , 'salt': 'salt'
      , 'key': 'key'
      }
  } )
}
