var fs = require('fs')
  , path = require('path')
  , async = require('async')
  , crypto = require('crypto')
  , mime = require('mime')
  , noop = function() {}

module.exports = function (uploadDir, logger) {

  if (!logger) {
    logger =
      { info: noop
      , warn: noop
      , error: noop
      , debug: noop
      , fatal: noop
      , trace: noop
      }
  }

  async.waterfall(
    [ function (callback) {
        fs.stat(uploadDir, function (error) {
          // Deliberately passing error to next function for checking
          callback(null, error)
        })
      }
    , function (error, callback) {
        if (error && error.code === 'ENOENT') {
          fs.mkdir(uploadDir, '0755', callback)
        }
      }
    ], function (error) {
      if (error) {
        throw error
      }
    })

  function put(file, callback) {

    async.waterfall(
      [ function (callback) {

          // Checking if the file is a path
          if (typeof file === 'string') {

            logger.info('Uploading file: ' + file)

            var fileType = mime.lookup(file)
              , size

            getFileHash(file, function (error, name) {
              if (error) return callback(error)

              fs.stat(file, function (error, stats) {
                if (error && error.code === 'ENOENT') {
                  return callback(error)
                }
                if (stats.size === 0) {
                  var sizeError = new Error('Upload has 0 size')
                  sizeError.name = 'SizeError'
                  return callback(sizeError)
                }
                size = stats.size
                file = fs.createReadStream(file)
                file.name = path.basename(file.path)
                file.type = fileType
                file.size = size
                callback(null, name)
              })
            })
          } else {
            logger.info('Uploading file: ' + file.path)
            getFileHash(file.path, callback)
          }
        }
      , function (name, callback) {
        var directory = path.join(uploadDir, name.substring(0, 3))
        logger.info('Making dir: ' + directory)

        fs.mkdir(directory, '0755', function () {

          var tempLocation = file.path
            , destPath = path.join(directory, name)

          file =
            { size: file.size
            , type: file.type
            , path: name.substring(0, 3) + '/'
            , basename: name
            }

          fs.stat(destPath, function (error, stats) {
            // If the file doesn't exist, create it
            if (error && error.code === 'ENOENT') {
              logger.info('Writing file to disk: '  + destPath)
              var readFile = fs.createReadStream(tempLocation)
                , writeFile = fs.createWriteStream(destPath, { flags: 'w' })

              readFile.pipe(writeFile)
              readFile.on('end', function () {
                logger.info('Completed writing file to disk: '  + destPath)
                callback(null, file)
              })

            // If the file does exist, just pass back the file details
            } else if (stats && stats.isFile()) {
              logger.info('File already existed: '  + destPath)
              callback(null, file)

            // If there was an error that wasn't a non-existent file, return it
            } else {
              logger.info('Unknown error with path: '  + destPath)
              callback(error)
            }
          })
        })
      }
    ], callback)

  }

  function getFilePath(file) {
    return typeof file === 'string' ? file : path.join(file.path, file.basename)
  }

  function get(file, callback) {
    var filePath = path.join(uploadDir, getFilePath(file))
    logger.info('Getting file: '  + filePath)
    fs.readFile(filePath, callback)
  }

  function getAsReadStream(file, options) {
    return fs.createReadStream(path.join(uploadDir, getFilePath(file)), options)
  }

  function remove(file, callback) {
    var filePath = path.join(uploadDir, getFilePath(file))
    logger.info('Removing file: '  + filePath)
    fs.unlink(filePath, callback)
  }

  return {
      put: put
    , get: get
    , getAsReadStream: getAsReadStream
    , 'delete': remove
    }
}

module.exports.getFileHash = getFileHash

// Generate MD5 hash based on file content to stop double upload
function getFileHash(filePath, callback) {
  fs.readFile(filePath, 'utf-8', function (error, file) {
    if (error) return callback(error)

    callback(null, crypto.createHash('md5').update(file).digest('hex'))
  })
}
