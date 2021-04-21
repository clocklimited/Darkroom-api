const assert = require('assert')
const createCacheDealer = require('../../../lib/middleware/cache-dealer')
const config = { http: { age: 1000 } }
const Transform = require('stream').Transform

function MockBackend() {}
MockBackend.prototype.createCacheReadStream = function () {
  this.readStream = new Transform()
  this.readStream._transform = function (data, enc, cb) {
    cb(data)
  }
  return this.readStream
}

function Response() {
  this.headers = {}
}

Response.prototype = Object.create(Transform.prototype)

Response.prototype.set = function (header, value) {
  this.headers[header] = value
}

Response.prototype.removeHeader = function (header) {
  delete this.headers[header]
}

describe('cache-dealer-middleware', function () {
  it('should return a middleware function', function () {
    var cacheDealer = createCacheDealer(config)
    assert.equal(typeof cacheDealer, 'function')
  })

  it('should call next on not found', function (done) {
    var mockBackend = new MockBackend(),
      cacheDealer = createCacheDealer(config, mockBackend)

    cacheDealer({ params: {} }, {}, done)

    mockBackend.readStream.emit('notFound')
  })

  it('should set res headers', function (done) {
    var mockBackend = new MockBackend(),
      cacheDealer = createCacheDealer(config, mockBackend),
      res = new Response()

    cacheDealer({ params: {} }, res, function () {
      done(new Error('Next should not be called'))
    })

    mockBackend.readStream.emit('meta', {
      size: 1,
      lastModified: '2016-01-26 12:02:00',
      type: 'image/png'
    })

    assert.deepEqual(res.headers, {
      'Cache-Control': 'max-age=undefined',
      'Content-Length': 1,
      'Content-Type': 'image/png',
      'D-Cache': 'HIT',
      'Last-Modified': 'Tue, 26 Jan 2016 12:02:00 GMT'
    })

    done()
  })
})
