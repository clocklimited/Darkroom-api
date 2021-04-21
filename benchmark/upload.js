const request = require('request')
const fs = require('fs')

function createTests(options) {
  function test(cb) {
    request.post(
      {
        url: options.url,
        headers: { 'x-darkroom-key': 'keyey-key' },
        formData: {
          file: fs.createReadStream('/dev/urandom', {
            start: 1,
            end: options.size
          })
        }
      },
      function (err, res) {
        if (res.statusCode !== 200)
          err = new Error('Unexpected status code ' + res.statusCode)
        cb(err)
      }
    )
  }

  return test
}

module.exports = createTests
