const fs = require('fs')
const path = require('path')
const { key, salt } = require('../../locations.js')
const { exec } = require('child_process')
const { promisify } = require('util')

const formData = require('form-data')
const addTestImageBody = (req, context, ee, next) => {
  const form = new formData()

  form.append(
    'file',
    fs.createReadStream(path.join(__dirname, '../../test/fixtures/jpeg.jpeg'))
  )
  req.body = form
  next()
}

const addDarkroomKeyHeader = (req, context, ee, next) => {
  if (!req.headers) req.headers = {}
  req.headers['x-darkroom-key'] = key
  next()
}

const generateImageUrl = async (req, context, ee, next) => {
  const { stdout } = await promisify(exec)(
    `./support/authed-cli --host ${req.url.slice(
      0,
      req.url.lastIndexOf('/')
    )} --salt ${salt} -n  /original/${context.vars.id}`
  )
  const imageUrl = stdout.trim()
  req.url = imageUrl
  next()
}

module.exports = {
  addTestImageBody,
  addDarkroomKeyHeader,
  generateImageUrl
}
