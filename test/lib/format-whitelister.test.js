var assert = require('assert')
  , createFormatWhitelister = require('../../lib/format-whitelister')
  , config = { allowedFormats: [ 'jpg', 'png' ] }

describe('Format-Whitelister', function () {

  it('should return format if it is allowed', function () {
    var format = 'jpg'
      , whitelistFormat = createFormatWhitelister(config)

    assert.equal(whitelistFormat(format), format)
  })

  it('should return undefined if format is not allowed', function () {
    var format = 'bmp'
      , whitelistFormat = createFormatWhitelister(config)

    assert.equal(whitelistFormat(format), undefined)
  })

  it('should return undefined if config.allowedFormats is falsey', function () {
    var format = 'jpg'
      , whitelistFormat = createFormatWhitelister({})

    assert.equal(whitelistFormat(format), undefined)
  })

})
