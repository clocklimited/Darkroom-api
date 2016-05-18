var assert = require('assert')
  , createResponseFormatWhitelister = require('../../lib/response-format-whitelister')
  , config = { allowedResponseFormats: [ 'jpg', 'png' ] }

describe('Format-Whitelister', function () {

  it('should return format if it is allowed', function () {
    var format = 'jpg'
      , whitelistResponseFormat = createResponseFormatWhitelister(config)

    assert.equal(whitelistResponseFormat(format), format)
  })

  it('should return undefined if format is not allowed', function () {
    var format = 'bmp'
      , whitelistResponseFormat = createResponseFormatWhitelister(config)

    assert.equal(whitelistResponseFormat(format), undefined)
  })

  it('should return undefined if config.allowedFormats is falsey', function () {
    var format = 'jpg'
      , whitelistResponseFormat = createResponseFormatWhitelister({})

    assert.equal(whitelistResponseFormat(format), undefined)
  })

})
