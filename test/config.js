module.exports = function () {
  var config = {
    common: {
      http: {
        host: '127.0.0.1',
        port: 17999,
        url: 'http://127.0.0.1:17999/',
        maxage: 10,
        pageNotFoundMaxage: 0
      },
      log: false,
      paths: {
        data: function () {
          return '/tmp/dr/data'
        },
        cache: function () {
          return '/tmp/dr/cache'
        }
      },
      version: '0.0.1',
      salt: 'salt',
      key: 'key',
      allowedResponseFormats: ['png']
    }
  }
  if (process.env.MONGO_BACKEND)
    config.databaseUrl = 'mongodb://localhost:27017/darkroom-test'
  return config
}
