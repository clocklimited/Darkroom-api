module.exports = function (config) {
  return function (req, res, next) {
      if (req.headers['x-darkroom-key'] === config.key) {
        next()
      } else {
        res.send(403)
      }
    }
}
