module.exports = function (serviceLocator, backendFactory) {
  const { logger } = serviceLocator
  const endpoints = {}

  endpoints.data = async (req, res, next) => {
    res.set('X-Application-Method', 'Delete file')

    const id = req.params.id

    try {
      await backendFactory.deleteData(id)
    } catch (e) {
      logger.error(e, 'Error deleting file ', id)

      return next(e)
    }

    return res.sendStatus(204)
  }

  endpoints.cache = async (req, res, next) => {
    res.set('X-Application-Method', 'Clear cache')

    const id = req.params.id

    try {
      await backendFactory.clearCache(id)
    } catch (e) {
      logger.error(e, 'Error clearing cache for ', id)

      return next(e)
    }

    return res.sendStatus(204)
  }

  return endpoints
}
