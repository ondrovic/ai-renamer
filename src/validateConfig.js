const Joi = require('joi')

const configSchema = Joi.object({
  provider: Joi.string().valid('ollama', 'openai', 'lm-studio').required(),
  apiKey: Joi.string().when('provider', {
    is: 'openai',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  baseURL: Joi.string().uri(),
  model: Joi.string(),
  frames: Joi.number().integer().min(1).max(30),
  chars: Joi.number().integer().min(10).max(100),
  language: Joi.string(),
  includeSubdirectories: Joi.boolean(),
  customPrompt: Joi.string().allow(null)
})

const validateConfig = async (config) => {
  try {
    const value = await configSchema.validateAsync(config)
    return value
  } catch (err) {
    throw new Error(`Configuration validation failed: ${err.message}`)
  }
}

module.exports = validateConfig
