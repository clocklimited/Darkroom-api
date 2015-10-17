module.exports = createCacheKey

function createCacheKey(req) {

    var parts =
      [ req.params.action
      , req.params.data + req.params.hash
      , req.params.height
      , req.params.width
      , req.params.colour
      , req.params.x0
      , req.params.y0
      , req.params.x1
      , req.params.y1
      ]

    return parts.join(':')
}
