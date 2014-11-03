var ka = require('../../lib/key-auth')

describe('Key Auth', function() {

  it('should call next() with NO_KEY env set', function (done) {

    var req = {}
    process.env.NO_KEY = 1
    ka()(req, null, function () {
      delete process.env.NO_KEY
      done()
    })
  })

  it('should call next() with valid key', function (done) {

    var req = { headers: { 'x-darkroom-key': 'key' } }
    ka({ key: 'key' })(req, null, function () {
      done()
    })
  })

  it('should call send() with invalid key', function (done) {

    var req = { headers: { 'x-darkroom-key': 'BAD' } }
      , res = { send: function () {
        done()
      } }

    ka({ key: 'key' })(req, res)
  })
})
