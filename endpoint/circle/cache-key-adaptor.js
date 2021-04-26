module.exports = createCacheKey

function createCacheKey(req) {
  const parts = [
    req.params.action,
    req.params.data + req.params.hash,
    req.query.height,
    req.query.width,
    req.query.colour,
    req.query.x0,
    req.query.y0,
    req.query.x1,
    req.query.y1
  ]

  return parts.join(':')
}
