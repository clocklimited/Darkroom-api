var Transform = require('stream').Transform
  , mmm = require('mmmagic')
  , Magic = mmm.Magic
  , magic = new Magic(mmm.MAGIC_MIME)

module.exports = function() {
  var stream = new Transform()
    , buffer = []
    , size = 0
    , found = false

  function detectAndEmit (buf) {
    magic.detect(buf, function (error, result) {
      stream.emit('detect', result, buf)
    })
  }

  stream._transform = function (data, encoding, cb) {

    this.push(data)

    if (found) {
      return cb()
    } else {
      size += data.length
      buffer.push(data)

      if ((size > 1024) && !found) {
        found = true
        buffer.push(data)
        detectAndEmit(Buffer.concat(buffer))
      }

      cb()
    }
  }

  stream.on('finish', function() {
    if (!found) {
      detectAndEmit(Buffer.concat(buffer))
    }
  })

  return stream
}
