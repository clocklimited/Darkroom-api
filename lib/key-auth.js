var config = require('con.figure')(require('../config')())

module.exports = function (req, res, next) {
  if (req.headers['x-darkroom-key'] === config.key) {
    next()
  } else {
    res.send(403)
  }
}