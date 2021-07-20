const assert = require('assert')
const createRouteChecker = require('../../../lib/middleware/route-checker')
const config = require('con.figure')(require('../../config')())

describe('Route checker', () => {
  it('should return a middleware function', () => {
    const checkRoute = createRouteChecker(config)
    assert.strictEqual(typeof checkRoute, 'function')
  })

  it('should return next if not a GET request', (done) => {
    const checkRoute = createRouteChecker(config)

    checkRoute({ method: 'POST' }, {}, (error) => {
      assert.ifError(error)
      done()
    })
  })

  it('should return next if no request params', (done) => {
    const checkRoute = createRouteChecker(config)

    checkRoute({ method: 'GET', params: {} }, {}, (error) => {
      assert.ifError(error)
      done()
    })
  })

  it('should return Not Found error if no tokens in url', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = { method: 'GET', params: { 0: 100, 1: 50 }, url: '' }
    checkRoute(req, {}, (error) => {
      assert.strictEqual(error.message, 'Not Found')
      done()
    })
  })

  it('should error if checksum does not match', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = {
      method: 'GET',
      params: { 0: 100 },
      query: {},
      url:
        '/100/f3205aa9a406642cff624998ccc4dd78:f3205aa9a406642cff624998ccc4dd78'
    }
    checkRoute(req, {}, (error) => {
      assert.strictEqual(
        error.message,
        'Checksum does not match for action: /100/'
      )
      done()
    })
  })

  // with the regex that is used I can't find a way to trigger this route
  it.skip('should error if checksum missing', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = {
      method: 'GET',
      params: { 0: 100 },
      query: {},
      url: 'http:f3205aa9a406642cff624998ccc4dd78'
    }
    checkRoute(req, {}, (error) => {
      assert.strictEqual(
        error.message,
        'Checksum does not match for action: /100/'
      )
      done()
    })
  })

  it('should set req.params properties', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = {
      method: 'GET',
      params: { 0: 100 },
      query: {},
      url:
        '/100/f3205aa9a406642cff624998ccc4dd78:a40d6d9975ad7f6ea9f646c91fe43b8f'
    }
    const res = {
      set: (header, value) => {
        assert.strictEqual(header, 'Authorized-Request')
        assert.strictEqual(
          value,
          '/100/f3205aa9a406642cff624998ccc4dd78:a40d6d9975ad7f6ea9f646c91fe43b8f'
        )
      }
    }
    checkRoute(req, res, (error) => {
      assert.ifError(error)
      assert.deepStrictEqual(req.params, {
        0: 100,
        data: 'f3205aa9a406642cff624998ccc4dd78',
        hash: 'a40d6d9975ad7f6ea9f646c91fe43b8f',
        action: '/100/',
        format: undefined
      })
      done()
    })
  })

  it('should set req.params properties with format if provided', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = {
      method: 'GET',
      params: { 0: 160 },
      query: {},
      url:
        '/160/1cfdd3bf942749472093f3b0ed6d4f89:93e7b6c489485692e96ec3de52c7a939/a.png'
    }
    const res = {
      set: (header, value) => {
        assert.strictEqual(header, 'Authorized-Request')
        assert.strictEqual(
          value,
          '/160/1cfdd3bf942749472093f3b0ed6d4f89:93e7b6c489485692e96ec3de52c7a939/a.png'
        )
      }
    }
    checkRoute(req, res, (error) => {
      assert.ifError(error)
      assert.deepStrictEqual(req.params, {
        0: 160,
        data: '1cfdd3bf942749472093f3b0ed6d4f89',
        hash: '93e7b6c489485692e96ec3de52c7a939',
        action: '/160/',
        format: 'png'
      })
      done()
    })
  })

  it('should set req.params properties with format even with querystring', (done) => {
    const checkRoute = createRouteChecker(config)

    const req = {
      method: 'GET',
      params: { 0: 160 },
      query: {},
      url:
        '/160/1cfdd3bf942749472093f3b0ed6d4f89:93e7b6c489485692e96ec3de52c7a939/a.png?quality=100'
    }
    const res = {
      set: (header, value) => {
        assert.strictEqual(header, 'Authorized-Request')
        assert.strictEqual(
          value,
          '/160/1cfdd3bf942749472093f3b0ed6d4f89:93e7b6c489485692e96ec3de52c7a939/a.png?quality=100'
        )
      }
    }
    checkRoute(req, res, (error) => {
      assert.ifError(error)
      assert.deepStrictEqual(req.params, {
        0: 160,
        data: '1cfdd3bf942749472093f3b0ed6d4f89',
        hash: '93e7b6c489485692e96ec3de52c7a939',
        action: '/160/',
        format: 'png'
      })
      done()
    })
  })
})
