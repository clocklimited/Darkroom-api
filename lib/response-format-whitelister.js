module.exports = function createResponseFormatWhitelister(config) {
  return function whitelistResponseFormat(format) {
    if (config.allowedResponseFormats && config.allowedResponseFormats.length) {
      return config.allowedResponseFormats.indexOf(format) > -1
        ? format
        : undefined
    }

    return undefined
  }
}
