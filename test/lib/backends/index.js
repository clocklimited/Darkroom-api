var config = require('con.figure')(require('../../config')())
  , mongoConfig = require('con.figure')(require('../../config')())

mongoConfig.databaseUri = 'mongodb://localhost:27017/darkroom-test'

module.exports = function () {
  return (
    [ { name: 'Filesystem', config: config }
    , { name: 'Mongo Grid FS', config: mongoConfig }
    ])
}
