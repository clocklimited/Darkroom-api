module.exports = function (config) {
  return { resize: require('./resize')(config)
  , crop: require('./crop')(config)
  , original: require('./original')(config)
  , info: require('./info')(config)
  , remote: require('./remote')(config)
  , watermark: require('./watermark')(config)
  , upload: require('./upload')
  , utils: require('./utils')
  }

}
