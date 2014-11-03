module.exports = function (config) {
  return function (req, res, next) {
      if ((process.env.NO_KEY !== undefined ) || req.headers['x-darkroom-key'] === config.key) {
        next()
      } else {
        res.send(403)
      }
    }
}
