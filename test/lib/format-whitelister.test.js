const assert = require('assert')
const createResponseFormatWhitelister = require('../../lib/response-format-whitelister')
const config = { allowedResponseFormats: ['jpg', 'png'] }

describe('Format-Whitelister', function () {
  it('should return format if it is allowed', function () {
    const format = 'jpg'
    const whitelistResponseFormat = createResponseFormatWhitelister(config)

    assert.strictEqual(whitelistResponseFormat(format), format)
  })

  it('should return undefined if format is not allowed', function () {
    const format = 'bmp'
    const whitelistResponseFormat = createResponseFormatWhitelister(config)

    assert.strictEqual(whitelistResponseFormat(format), undefined)
  })

  it('should return undefined if config.allowedFormats is falsey', function () {
    const format = 'jpg'
    const whitelistResponseFormat = createResponseFormatWhitelister({})

    assert.strictEqual(whitelistResponseFormat(format), undefined)
  })
})
