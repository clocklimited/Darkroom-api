module.exports = function (config, backendFactory) {
  return {
    resize: require('./resize')(config, backendFactory),
    crop: require('./crop')(config, backendFactory),
    original: require('./original')(config, backendFactory),
    download: require('./original')(config, backendFactory, { download: true }),
    info: require('./info')(config, backendFactory),
    watermark: require('./watermark')(config, backendFactory),
    circle: require('./circle')(config, backendFactory),
    upload: require('./upload')
  }
}
