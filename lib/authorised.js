var crypto = require('crypto')

module.exports = function (req) {
  console.log('data', req.params.action)
  var md5sum = crypto.createHash('md5')

  md5sum.update(req.params.action + req.params.data + 'crazysalt')
  var hash = md5sum.digest('hex')
  console.log(hash, req.params.hash)
  if (hash === req.params.hash)
    return true
  else
    return false
}