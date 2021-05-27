const ka = require('../../lib/key-auth')

describe('Key Auth', function () {
  it('should call next() with NO_KEY env set', function (done) {
    const req = {}
    process.env.NO_KEY = 1
    ka()(req, null, function () {
      delete process.env.NO_KEY
      done()
    })
  })

  it('should call next() with valid key', function (done) {
    const req = { headers: { 'x-darkroom-key': 'key' } }
    ka({ key: 'key' })(req, null, function () {
      done()
    })
  })

  it('should call send() with invalid key', function (done) {
    const req = { headers: { 'x-darkroom-key': 'BAD' } }
    const res = {
      sendStatus: function () {
        done()
      }
    }

    ka({ key: 'key' })(req, res)
  })
})
