const os = require('os')
const path = require('path')
const fs = require('fs').promises
const crypto = require('crypto')

const CONFIG_FILE = path.join(os.homedir(), '.ai-renamer', 'config.json')
const SECRET_KEY = crypto.randomBytes(32)

const encryptValue = (value) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

const decryptValue = (encryptedValue) => {
  const parts = encryptedValue.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv)
  let decrypted = decipher.update(parts.join(':'), 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const saveSecureConfig = async (config) => {
  // Encrypt sensitive values
  const secureConfig = { ...config }
  if (config.defaultApiKey) {
    secureConfig.defaultApiKey = encryptValue(config.defaultApiKey)
  }

  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify(secureConfig, null, 2))

  // Set restrictive permissions
  await fs.chmod(CONFIG_FILE, 0o600)
}

const loadSecureConfig = async () => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8')
    const config = JSON.parse(data)

    // Decrypt sensitive values
    if (config.defaultApiKey) {
      config.defaultApiKey = decryptValue(config.defaultApiKey)
    }

    return config
  } catch (err) {
    return {}
  }
}

module.exports = {
  saveSecureConfig,
  loadSecureConfig
}
