const getModelResponse = require('./getModelResponse')

const SUMMARY_MODES = {
  STANDARD: 'standard',
  DETAILED: 'detailed',
  BRIEF: 'brief',
  NARRATIVE: 'narrative'
}

const getSummaryPrompt = (mode, videoPrompt, customPrompt) => {
  const basePrompts = {
    [SUMMARY_MODES.STANDARD]: [
      'You are a video content analyzer. Provide a comprehensive video summary.',
      '',
      'ANALYSIS FOCUS:',
      '• Main actions and events occurring',
      '• Key visual elements and objects',
      '• Scene transitions and changes',
      '• Overall theme and purpose',
      '',
      'FORMAT: Structured summary with clear sections for each focus area.'
    ],

    [SUMMARY_MODES.DETAILED]: [
      'You are a video content analyzer. Provide an in-depth video analysis.',
      '',
      'DETAILED ANALYSIS REQUIREMENTS:',
      '• Complete sequence of all actions',
      '• All visual elements with context',
      '• Temporal structure and pacing analysis',
      '• Technical aspects (lighting, composition, camera work)',
      '• Emotional tone and atmosphere',
      '',
      'FORMAT: Comprehensive analysis with detailed observations for each requirement.'
    ],

    [SUMMARY_MODES.BRIEF]: [
      'You are a video content analyzer. Provide a concise video summary.',
      '',
      'BRIEF SUMMARY FOCUS:',
      '• Primary action or main subject only',
      '• Most important visual elements',
      '• Single-sentence overview of purpose',
      '',
      'FORMAT: Keep response under 3 sentences. Focus on essential information only.'
    ],

    [SUMMARY_MODES.NARRATIVE]: [
      'You are a video storyteller. Create a narrative description of this video.',
      '',
      'NARRATIVE STRUCTURE:',
      '• Beginning: Set the scene and introduce subjects',
      '• Middle: Describe the progression and development',
      '• End: Conclude with outcome or resolution',
      '• Character/subject development throughout',
      '• Setting and environment details',
      '• Dramatic arc or underlying purpose',
      '',
      'FORMAT: Write as a flowing story with clear beginning, middle, and end.'
    ]
  }

  const promptLines = basePrompts[mode] || basePrompts[SUMMARY_MODES.STANDARD]
  promptLines.push('', videoPrompt || '', '')

  if (customPrompt) {
    promptLines.push('Custom instructions:', customPrompt, '')
  }

  promptLines.push('Provide a concise but complete summary suitable for filename generation.')

  return promptLines.join('\n')
}

const getVideoSummary = async ({
  model,
  images,
  videoPrompt,
  baseURL,
  provider,
  apiKey,
  customPrompt,
  summaryMode = SUMMARY_MODES.STANDARD
}) => {
  try {
    const prompt = getSummaryPrompt(summaryMode, videoPrompt, customPrompt)

    const summary = await getModelResponse({
      model,
      prompt,
      images,
      baseURL,
      provider,
      apiKey
    })

    return summary.trim()
  } catch (err) {
    throw new Error(`Failed to get video summary: ${err.message}`)
  }
}

// Export the function and modes
module.exports = getVideoSummary
module.exports.SUMMARY_MODES = SUMMARY_MODES
