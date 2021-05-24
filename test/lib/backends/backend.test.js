const Backend = require('../../../lib/backends/Backend')
const assert = require('assert')

describe('Backend super class', () => {
  it('should export necessary functions', () => {
    const backend = new Backend({ foo: 'bar' })
    assert.strictEqual(typeof backend.setup, 'function')
    assert.strictEqual(typeof backend.clean, 'function')
    assert.strictEqual(typeof backend.isHealthy, 'function')
    assert.strictEqual(typeof backend.createDataReadStream, 'function')
    assert.strictEqual(typeof backend.createCacheReadStream, 'function')
    assert.strictEqual(typeof backend.createDataWriteStream, 'function')
    assert.strictEqual(typeof backend.createCacheWriteStream, 'function')
  })

  it('should store config in itself', () => {
    const backend = new Backend({ foo: 'bar' })
    assert.deepStrictEqual(backend.config, { foo: 'bar' })
  })

  it('should call cb for setup', (done) => {
    const backend = new Backend({ foo: 'bar' })
    backend.setup(done)
  })

  it('should call cb for clean', (done) => {
    const backend = new Backend({ foo: 'bar' })
    backend.clean(done)
  })

  it('should call cb for isHealthy', (done) => {
    const backend = new Backend({ foo: 'bar' })
    backend.isHealthy((error, healthy) => {
      assert.strictEqual(error, null)
      // `false` because this function _must_ be implemented
      assert.strictEqual(healthy, false)
      done()
    })
  })

  it('should return nothing for create* streams', () => {
    const backend = new Backend({ foo: 'bar' })
    assert.strictEqual(typeof backend.createDataReadStream(), 'undefined')
    assert.strictEqual(typeof backend.createCacheReadStream(), 'undefined')
    assert.strictEqual(typeof backend.createDataWriteStream(), 'undefined')
    assert.strictEqual(typeof backend.createCacheWriteStream(), 'undefined')
  })
})
