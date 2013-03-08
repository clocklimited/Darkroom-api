module.exports = function (req, res, next) {
  // darkroom.crop.pipe(req.body.image, req.body.parameters)
  res.set('X-Application-Method', 'Get Crop for Image')
  res.status(501)
  res.json(false)
  return next()
}