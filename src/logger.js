// src/logger.js
const pino = require('pino')
const path = require('path')
const os = require('os')

const LOG_DIR = path.join(os.homedir(), '.ai-renamer', 'logs')

const createLogger = () => {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: { colorize: true }
        },
        {
          target: 'pino/file',
          options: { destination: path.join(LOG_DIR, 'app.log') }
        }
      ]
    }
  })
}

const logger = createLogger()

// Usage example
// logger.info('Starting file processing')
// logger.error({ err }, 'Failed to process file')

module.exports = logger
