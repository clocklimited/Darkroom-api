module.exports = function (config, backendFactory) {
  return {
    resize: require('./resize')(config, backendFactory)
  , crop: require('./crop')(config, backendFactory)
  , original: require('./original')(config, backendFactory)
  , info: require('./info')(config, backendFactory)
  , watermark: require('./watermark')(config, backendFactory)
  , upload: require('./upload')
  , utils: require('./utils')
  , circle: require('./circle')(config, backendFactory)
  , circleCache: require('./circle').serveCached(config, backendFactory)
  }

}
