var ka = require('../../lib/key-auth')

describe('Key Auth', function() {
  it('should call next() with valid key', function (done) {

    var req = { headers: { 'x-darkroom-key': '{KEY}' } }
    ka(req, null, function () {
      done()
    })
  })

  it('should call send() with invalid key', function (done) {

    var req = { headers: { 'x-darkroom-key': 'BAD' } }
      , res = { send: function () {
        done()
      } }

    ka(req, res)
  })
})