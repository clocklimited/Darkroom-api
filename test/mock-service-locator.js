const createServiceLocator = require('service-locator')
const mcLogger = require('mc-logger')

module.exports = (config) => {
  const serviceLocator = createServiceLocator()
  serviceLocator.register('config', config).register('logger', mcLogger)
  return serviceLocator
}
