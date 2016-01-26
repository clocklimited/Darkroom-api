module.exports = allowType

function allowType(config, type, stream) {
  // Only allow certain filetype
  if (config.upload && config.upload.allow && config.upload.allow.length !== 0) {
    var allowed = config.upload.allow.some(function (allowedType) {
      return type.indexOf(allowedType) !== -1
    })

    if (!allowed) {
      var error = new Error('Forbidden type detected: ' + type)
      error.name = 'ForbiddenType'
      stream.emit('error', error)
      return false
    }
  }
  return true
}
