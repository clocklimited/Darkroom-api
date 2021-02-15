var request = require('request')
  , PassThrough = require('stream').PassThrough

module.exports = function (url, logger) {
  var stream = new PassThrough()
    , options = { url: url, timeout: 5000 }
    , requestStream = request(options)

  requestStream.on('error', function () {
    stream.emit('notFound', url)
  })

  requestStream.on('response', function (response) {
    if (response.statusCode === 200) {
      stream.emit('meta', { type: response.headers['content-type'], size: response.headers['content-length'] })
    } else {
      logger.warn('Error requesting ' + url + ' : ' + response.statusCode)
      stream.emit('notFound', url)
    }
  })

  requestStream.pipe(stream)

  return stream
}
