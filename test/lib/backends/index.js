const config = require('con.figure')(require('../../config')())
const mongoConfig = require('con.figure')(require('../../config')())

mongoConfig.databaseUri =
  process.env.MONGO_URL || 'mongodb://localhost:27017/darkroom-test'

module.exports = function () {
  return [
    { name: 'Filesystem', config: config },
    { name: 'Mongo Grid FS', config: mongoConfig }
  ]
}
