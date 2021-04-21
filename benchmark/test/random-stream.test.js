var assert = require('assert'),
  Readable = require('stream').Readable,
  RandomStream = require('../random-stream')

describe('random-stream', function () {
  it('should be a read stream', function () {
    var randomStream = new RandomStream()
    assert(randomStream instanceof Readable)
  })

  it('should emit random data of a given length of 10', function (done) {
    var randomStream = new RandomStream(10),
      buffer = []
    randomStream.on('data', function (data) {
      buffer.push(data)
    })

    randomStream.on('end', function () {
      assert.strictEqual(Buffer.concat(buffer).length, 10)
      done()
    })
  })

  it('should emit random data of a given length of 100000', function (done) {
    var randomStream = new RandomStream(100000),
      buffer = []
    randomStream.on('data', function (data) {
      buffer.push(data)
    })

    randomStream.on('end', function () {
      assert.strictEqual(Buffer.concat(buffer).length, 100000)
      done()
    })
  })
})
