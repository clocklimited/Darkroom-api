module.exports = function createFormatWhitelister(config) {

  return function whitelistFormat(format) {
    if (config.allowedFormats && config.allowedFormats.length) {
      return config.allowedFormats.indexOf(format) > -1 ? format : undefined
    }

    return undefined
  }

}
