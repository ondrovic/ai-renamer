const fs = require('fs').promises

const processFile = require('./processFile')
const chooseModel = require('./chooseModel')
const processDirectory = require('./processDirectory')

module.exports = async ({
  inputPath,
  defaultCase,
  defaultModel,
  defaultChars,
  defaultFrames,
  defaultApiKey,
  defaultBaseURL,
  defaultLanguage,
  defaultProvider,
  defaultCustomPrompt,
  defaultIncludeSubdirectories,
  defaultVideoSummary,
  defaultSummaryMode,
  defaultSummaryInterval,
  defaultSummaryMaxFrames
}) => {
  try {
    const provider = defaultProvider || 'ollama'
    console.log(`⚪ Provider: ${provider}`)

    const apiKey = defaultApiKey
    if (apiKey) {
      console.log('⚪ API key: **********')
    }

    let baseURL = defaultBaseURL
    if (provider === 'ollama' && !baseURL) {
      baseURL = 'http://127.0.0.1:11434'
    } else if (provider === 'lm-studio' && !baseURL) {
      baseURL = 'http://127.0.0.1:1234'
    } else if (provider === 'openai' && !baseURL) {
      baseURL = 'https://api.openai.com'
    }
    console.log(`⚪ Base URL: ${baseURL}`)

    const model = defaultModel || await chooseModel({ baseURL, provider })
    console.log(`⚪ Model: ${model}`)

    const frames = defaultFrames || 10
    console.log(`⚪ Frames: ${frames}`)

    const _case = defaultCase || 'kebabCase'
    console.log(`⚪ Case: ${_case}`)

    const chars = defaultChars || 20
    console.log(`⚪ Chars: ${chars}`)

    const language = defaultLanguage || 'English'
    console.log(`⚪ Language: ${language}`)

    const includeSubdirectories = defaultIncludeSubdirectories === 'true' || false
    console.log(`⚪ Include subdirectories: ${includeSubdirectories}`)

    const customPrompt = defaultCustomPrompt || null
    if (customPrompt) {
      console.log(`⚪ Custom Prompt: ${customPrompt}`)
    }

    const useVideoSummary = defaultVideoSummary || false
    console.log(`⚪ Video Summary Mode: ${useVideoSummary}`)

    const summaryMode = defaultSummaryMode || 'standard'
    if (useVideoSummary) {
      console.log(`⚪ Summary Mode: ${summaryMode}`)
    }

    const summaryInterval = defaultSummaryInterval || 30
    const summaryMaxFrames = defaultSummaryMaxFrames
    if (useVideoSummary) {
      console.log(`⚪ Summary Interval: ${summaryInterval}s`)
      console.log(`⚪ Summary Max Frames: ${summaryMaxFrames}`)
    }

    console.log('--------------------------------------------------')

    const stats = await fs.stat(inputPath)
    const options = {
      model,
      _case,
      chars,
      frames,
      apiKey,
      baseURL,
      language,
      provider,
      inputPath,
      includeSubdirectories,
      customPrompt,
      useVideoSummary,
      summaryMode,
      summaryInterval,
      summaryMaxFrames
    }

    if (stats.isDirectory()) {
      await processDirectory({ options, inputPath })
    } else if (stats.isFile()) {
      await processFile({ ...options, filePath: inputPath })
    }
  } catch (err) {
    console.log(err.message)
  }
}
