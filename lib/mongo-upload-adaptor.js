var mongo = require('mongodb')
  , Grid = require('gridfs-stream')
  , fs = require('fs')

modules.exports = function (db) {

  var gfs = Grid(db, mongo)

  function put (file, cb) {
    var writestream = gfs.createWriteStream({ filename: filename })
    fs.createReadStream(file).pipe(writestream)

    writestream.on('error', cb)
    writestream.on('close', function (file) {
      cb(null, file._id)
    })
  }

  function get (filePath, cb) {
    cb(new Error('get not implemented'))
  }

  function remove (filePath, cb) {
    cb(new Error('delete not implemented'))
  }

  return {
      put: put
    , get: get
    , getAsReadStream: getAsReadStream
    , 'delete': remove
    }
}
