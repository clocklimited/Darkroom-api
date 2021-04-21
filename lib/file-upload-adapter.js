const fs = require('fs')
const path = require('path')
const async = require('async')
const crypto = require('crypto')
const noop = function () {}

module.exports = function (uploadDir, logger) {
  if (!logger) {
    logger = {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
      fatal: noop,
      trace: noop
    }
  }

  async.waterfall(
    [
      function (callback) {
        fs.stat(uploadDir, function (error) {
          // Deliberately passing error to next function for checking
          callback(null, error)
        })
      },
      function (error, callback) {
        if (error && error.code === 'ENOENT') {
          fs.mkdir(uploadDir, '0755', callback)
        }
      }
    ],
    function (error) {
      if (error) {
        throw error
      }
    }
  )

  function put(file, callback) {
    async.waterfall(
      [
        function (callback) {
          logger.info('Uploading file: ' + file.path)
          getFileHash(file.path, callback)
        },
        function (name, callback) {
          const directory = path.join(uploadDir, name.substring(0, 3))
          logger.info('Making dir: ' + directory)

          fs.mkdir(directory, '0755', function (err) {
            if (err) {
              if (err.code !== 'EEXIST') {
                return callback(err)
              }
            }

            const tempLocation = file.path
            const destPath = path.join(directory, name)

            file = {
              size: file.size,
              type: file.type,
              path: name.substring(0, 3) + '/',
              basename: name
            }

            fs.stat(destPath, function (error, stats) {
              let size = 0
              // If the file doesn't exist, create it
              if (error && error.code === 'ENOENT') {
                logger.info('Writing file to disk: ' + destPath)
                const readFile = fs.createReadStream(tempLocation)
                const writeFile = fs.createWriteStream(destPath, { flags: 'w' })
                readFile.on('data', function (chunk) {
                  size += chunk.length
                })
                readFile.pipe(writeFile)
                writeFile.on('finish', function () {
                  logger.info('Completed writing file to disk: ' + destPath)
                  if (size === 0) {
                    const error = new Error('Zero size')
                    error.name = 'SizeError'
                    fs.unlink(destPath, function (err) {
                      callback(err || error)
                    })
                    return
                  }
                  callback(null, file)
                })

                // If the file does exist, just pass back the file details
              } else if (stats && stats.isFile()) {
                logger.info('File already existed: ' + destPath)
                callback(null, file)

                // If there was an error that wasn't a non-existent file, return it
              } else {
                logger.info('Unknown error with path: ' + destPath)
                callback(error)
              }
            })
          })
        }
      ],
      callback
    )
  }

  function getFilePath(file) {
    return typeof file === 'string' ? file : path.join(file.path, file.basename)
  }

  function get(file, callback) {
    const filePath = path.join(uploadDir, getFilePath(file))
    logger.info('Getting file: ' + filePath)
    fs.readFile(filePath, callback)
  }

  function getAsReadStream(file, options) {
    return fs.createReadStream(path.join(uploadDir, getFilePath(file)), options)
  }

  function remove(file, callback) {
    const filePath = path.join(uploadDir, getFilePath(file))
    logger.info('Removing file: ' + filePath)
    fs.unlink(filePath, callback)
  }

  return {
    put: put,
    get: get,
    getAsReadStream: getAsReadStream,
    delete: remove
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
