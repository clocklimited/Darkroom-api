const locations = require('./locations')
const { version } = require('./package.json')

module.exports = function () {
  return {
    common: {
      http: {
        host: '127.0.0.1',
        port: 17999,
        url: 'http://127.0.0.1:17999',
        maxage: 315360000,
        pageNotFoundMaxage: 120
      },
      log: true,
      quality: 85,
      upload: {},
      apiProcesses: 1,
      backend: locations.backend,
      accessKeyId: locations.accessKeyId,
      secretAccessKey: locations.secretAccessKey,
      region: locations.region,
      bucket: locations.bucket,
      databaseUri: locations.databaseUri,
      databaseName: locations.databaseName,
      paths: {
        data: function () {
          return locations.data
        },
        cache: function () {
          return locations.cache
        }
      },
      version: version,
      salt: locations.salt,
      key: locations.key,
      allowedResponseFormats: [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'tiff',
        'svg',
        'webp'
      ]
    }
  }
}
