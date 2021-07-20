const packageJson = require('../package.json')

module.exports = function (req, res) {
  res.status(200).send(packageJson.version)
}
