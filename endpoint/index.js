module.exports = function (serviceLocator, backendFactory) {
  return {
    resize: require('./resize')(serviceLocator, backendFactory),
    crop: require('./crop')(serviceLocator, backendFactory),
    original: require('./original')(serviceLocator, backendFactory),
    download: require('./original')(serviceLocator, backendFactory, {
      download: true
    }),
    info: require('./info')(serviceLocator, backendFactory),
    watermark: require('./watermark')(serviceLocator, backendFactory),
    circle: require('./circle')(serviceLocator, backendFactory),
    upload: require('./upload')
  }
}
