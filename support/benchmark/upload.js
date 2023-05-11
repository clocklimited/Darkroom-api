const request = require('request')
const fs = require('fs')
const { key } = require('../../locations.js')

const createTests = (options) => (_, cb) => {
  request.post(
    {
      url: options.url,
      headers: { 'x-darkroom-key': key },
      formData: {
        file: fs.createReadStream('/dev/urandom', {
          start: 1,
          end: options.size
        })
      }
    },
    (error, res) => {
      if (error) {
        return cb(error)
      }
      if (res.statusCode !== 200) {
        error = new Error('Unexpected status code ' + res.statusCode)
      }
      cb(error)
    }
  )
}

module.exports = createTests
