const restifyErrors = require('restify-errors')
const path = require('path')
const createAuthorised = require('../authorised')
const createResponseFormatWhitelister = require('../response-format-whitelister')

const createRouteChecker = (config) => {
  const authorised = createAuthorised(config)
  const whitelistResponseFormat = createResponseFormatWhitelister(config)

  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    if (Object.keys(req.params).length === 0) return next()
    const tokens = req.url.match(/(http.*|[a-zA-Z0-9]{32,}):([a-zA-Z0-9]{32,})/)
    let { base, ext } = path.parse(req.url)

    if (base.startsWith('.') && !ext) ext = base

    const hasQuery = ext.includes('?')

    // Error if an valid token is not found
    if (!Array.isArray(tokens) || tokens.length < 3) {
      return next(new restifyErrors.ResourceNotFoundError('Not Found'))
    }

    // Remove url from match results
    tokens.shift()
    req.params.data = tokens.shift()
    req.params.hash = tokens.shift()
    req.params.action = req.url.substring(0, req.url.indexOf(req.params.data))
    req.params.format = whitelistResponseFormat(
      ext.substring(1, hasQuery ? ext.indexOf('?') : undefined).toLowerCase()
    )

    if (authorised(req)) {
      res.set('Authorized-Request', req.url)
      return next()
    } else {
      let message = 'Checksum does not match'
      if (req.params.hash === undefined) message = 'Checksum is missing'
      return next(
        new restifyErrors.NotAuthorizedError(
          message + ' for action: ' + req.params.action
        )
      )
    }
  }
}

module.exports = createRouteChecker
