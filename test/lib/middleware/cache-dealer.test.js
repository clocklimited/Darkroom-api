const assert = require('assert')
const createCacheDealer = require('../../../lib/middleware/cache-dealer')
const config = { http: { age: 1000 } }
const { Transform } = require('stream')

class MockBackend {
  createCacheReadStream() {
    this.readStream = new Transform()
    this.readStream._transform = (data, enc, cb) => {
      cb(data)
    }
    return this.readStream
  }
}

class Response extends Transform {
  constructor() {
    super()
    this.headers = {}
  }
  set(header, value) {
    this.headers[header] = value
  }
  removeHeader(header) {
    delete this.headers[header]
  }
}

describe('cache-dealer-middleware', function () {
  it('should return a middleware function', function () {
    var cacheDealer = createCacheDealer(config)
    assert.strictEqual(typeof cacheDealer, 'function')
  })

  it('should call next() with NO_CACHE env set', function (done) {
    const req = {}
    const cacheDealer = createCacheDealer(config)
    process.env.NO_CACHE = 1
    cacheDealer(req, null, function () {
      delete process.env.NO_CACHE
      done()
    })
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
      type: 'image/png',
      originalId: 1
    })

    assert.deepStrictEqual(res.headers, {
      'Cache-Control': 'max-age=undefined',
      'Content-Length': 1,
      'Content-Type': 'image/png',
      'D-Cache': 'HIT',
      'Last-Modified': 'Tue, 26 Jan 2016 12:02:00 GMT'
    })

    done()
  })

  it('should set originalId on cached item if not set', function (done) {
    var mockBackend = new MockBackend(),
      cacheDealer = createCacheDealer(config, mockBackend),
      res = new Response(),
      data = 100

    mockBackend.updateCacheOriginalId = (key, id) => {
      assert.equal(id, data)
      done()
    }

    cacheDealer({ params: { data } }, res, function () {
      done(new Error('Next should not be called'))
    })

    mockBackend.readStream.emit('meta', {
      size: 1,
      lastModified: '2016-01-26 12:02:00',
      type: 'image/png'
    })
  })
})
