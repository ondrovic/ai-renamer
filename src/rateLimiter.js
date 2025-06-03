const pThrottle = require('p-throttle')

const createRateLimiter = (options) => {
  const { provider } = options

  // Different limits for different providers
  const limits = {
    openai: { limit: 5, interval: 1000 }, // 5 requests per second
    ollama: { limit: 10, interval: 1000 }, // 10 requests per second
    'lm-studio': { limit: 10, interval: 1000 }
  }

  const config = limits[provider] || { limit: 10, interval: 1000 }

  return pThrottle(config)
}

const withRateLimit = (provider, apiFunction) => {
  const throttle = createRateLimiter({ provider })

  return throttle(apiFunction)
}

module.exports = { createRateLimiter, withRateLimit }