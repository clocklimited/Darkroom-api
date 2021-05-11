module.exports = function (req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('X-Application-Method', 'Image upload')
  res.status(200)
  res.json(res.uploads.length === 1 ? res.uploads[0] : res.uploads)
  return next()
}
