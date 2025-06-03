const changeCase = require('./changeCase')
const getModelResponse = require('./getModelResponse')
const getVideoSummary = require('./getVideoSummary')
const { removeUnwantedPatterns } = require('./filenameFilter')

module.exports = async options => {
  const {
    _case,
    chars,
    content,
    language,
    videoPrompt,
    customPrompt,
    relativeFilePath,
    images,
    useVideoSummary,
    summaryMode
  } = options

  try {
    let modelResult

    if (useVideoSummary && images && images.length > 0) {
      // Get comprehensive video summary first
      const summary = await getVideoSummary({
        model: options.model,
        images,
        videoPrompt,
        baseURL: options.baseURL,
        provider: options.provider,
        apiKey: options.apiKey,
        customPrompt,
        summaryMode
      })

      const promptLines = [
        'You are a video content analyzer. Generate a descriptive filename based on this video summary.',
        '',
        'VIDEO SUMMARY:',
        summary,
        '',
        'FILENAME REQUIREMENTS:',
        `• Format: ${_case}`,
        `• Maximum length: ${chars} characters`,
        `• Language: ${language} only`,
        '• No file extensions (.mp4, .avi, etc.)',
        '• No special characters (/, \\, :, *, ?, ", <, >, |)',
        '• Use only alphanumeric characters, hyphens, and underscores',
        '',
        'VIDEO NAMING STRATEGY:',
        '• Identify the PRIMARY action, event, or theme',
        '• Include video type if clear (tutorial, review, interview, demo)',
        '• Capture WHO (person/brand) and WHAT (main topic/action)',
        '• Use action verbs when describing activities',
        '• Prioritize searchable keywords over complete sentences',
        '',
        'VIDEO FILENAME PATTERNS:',
        '• Tutorial: "topic-tutorial" or "how-to-action"',
        '• Review: "product-review" or "brand-review"',
        '• Interview: "person-interview" or "topic-discussion"',
        '• Demo: "product-demo" or "feature-showcase"',
        '• Event: "event-highlights" or "conference-keynote"',
        '',
        'EXAMPLES:',
        '• "John explains React hooks in 10 minutes" → "react-hooks-tutorial"',
        '• "iPhone 15 Pro unboxing and first impressions" → "iphone15pro-unboxing"',
        '• "Marketing team discusses Q4 strategy" → "q4-marketing-strategy"',
        '• "Cooking pasta carbonara step by step" → "carbonara-cooking-guide"',
        '',
        'Respond with ONLY the filename, nothing else.'
      ]

      const prompt = promptLines.join('\n')
      modelResult = await getModelResponse({ ...options, prompt, images: null })
    } else {
      const promptLines = [
        'You are a file naming expert. Generate a descriptive filename based on the content.',
        '',
        'REQUIREMENTS:',
        `• Format: ${_case}`,
        `• Maximum length: ${chars} characters`,
        `• Language: ${language} only`,
        '• No file extensions (.txt, .pdf, etc.)',
        '• No special characters (/, \\, :, *, ?, ", <, >, |)',
        '• Use only alphanumeric characters, hyphens, and underscores',
        '',
        'NAMING STRATEGY:',
        '• Focus on the most important 2-3 concepts',
        '• Use descriptive keywords that indicate content type',
        '• Prefer single compound word when possible',
        '• Use noun-verb or adjective-noun patterns',
        '• Make it searchable and meaningful',
        '',
        'EXAMPLES:',
        '• "Meeting notes from Q4 planning" → "q4-planning-notes"',
        '• "Invoice for web development" → "webdev-invoice"',
        '• "Photo of sunset at beach" → "beach-sunset"',
        '',
        'Respond with ONLY the filename, nothing else.'
      ]

      if (videoPrompt) {
        promptLines.unshift(videoPrompt, '')
      }

      if (content) {
        promptLines.push('', 'Content:', content)
      }

      if (customPrompt) {
        promptLines.push('', 'Custom instructions:', customPrompt)
      }

      const prompt = promptLines.join('\n')
      modelResult = await getModelResponse({ ...options, prompt })
    }

    const maxChars = chars + 10
    let text = modelResult.trim().slice(-maxChars)

    // Apply the existing cleanup
    text = text.replace(/^(filename:|output:|result:)/i, '')
    text = text.replace(/\.(ts|mp4|jpg|png)$/i, '')
    text = text.replace(/[^a-zA-Z0-9_\-.]/g, '')

    // Apply case change first
    let filename = await changeCase({ text, _case })

    // Then remove unwanted patterns
    filename = removeUnwantedPatterns(filename)

    // If the cleaning removed everything, fall back to a default
    if (!filename) {
      filename = `content-${Date.now().toString().slice(-4)}`
      filename = await changeCase({ text: filename, _case })
    }

    return filename
  } catch (err) {
    console.log(`🔴 Model error: ${err.message} (${relativeFilePath})`)
  }
}
