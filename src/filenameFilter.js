// src/filenameFilter.js

const UNWANTED_PATTERNS = [
  'at',
  'progression',
  'extract',
  'extraction',
  'extracted',
  'extractedframes',
  'frame',
  'frames',
  'keyframe',
  'keyframes',
  'key-frame',
  'key-frames',
  'scene',
  'sequence',
  'video',
  'timeline',
  'videopart',
  'time',
  'slowmo',
  'roomset',
  'transition',
  'moment',
  'still',
  'stills',
  'part',
  'interval',
  'resolution',
  'progress',
  'second',
  'sec',
  'minute',
  'min',
  'hour',
  'duration',
  'length',
  'file',
  'clip',
  'segment'
]

// Create more comprehensive regex patterns
const createPatterns = () => {
  return UNWANTED_PATTERNS.map(pattern => {
    // Match the pattern with various number combinations and separators
    return new RegExp(`\\b${pattern}(-?\\d*|s|mo)?\\b`, 'gi')
  })
}

// Enhanced specific patterns to catch more edge cases
const SPECIFIC_PATTERNS = [
  /\b\d+s\b/gi, // Numbers followed by 's' like '249s', '814s'
  /\b\d+x\d+\b/gi, // Resolutions like '1920x1080'
  /\b\d+\.\d+s\b/gi, // Decimal seconds like '0.1s'
  /\bsequence-in-\d+/gi, // Patterns like 'sequence-in-900'
  /\bthis-is-not-a-safe.*$/gi, // Long inappropriate content messages

  // New patterns to catch your specific cases
  /\b\w+\d+\b/gi, // Words ending with numbers like 'name1', 'file5'
  /\b\w+-\d+\b/gi, // Words with dash and numbers like 'name-1', 'part-5'
  /\b\d+[-_]\w+/gi, // Numbers followed by words like '1-name', '5_file'
  /^\d+$/g, // Standalone numbers
  /^-?\d+$/g, // Standalone numbers with optional dash
  /\b[a-z]+\d*[a-z]*\d+\b/gi // Mixed alphanumeric like 'abc123', 'test1file2'
]

// Minimum length threshold - reject very short results
const MIN_MEANINGFUL_LENGTH = 3

// Words that are too generic/common to be useful filenames
const GENERIC_WORDS = [
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'test', 'temp', 'tmp', 'new', 'old', 'final', 'copy', 'backup', 'original',
  'untitled', 'document', 'image', 'photo', 'picture', 'media', 'content'
]

const removeUnwantedPatterns = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return null
  }

  let cleaned = filename.toLowerCase().trim()

  // First pass: Remove specific patterns
  for (const pattern of SPECIFIC_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ')
  }

  // Second pass: Remove unwanted word patterns
  const wordPatterns = createPatterns()
  for (const pattern of wordPatterns) {
    cleaned = cleaned.replace(pattern, ' ')
  }

  // Third pass: Remove generic words
  const words = cleaned.split(/\s+/)
  const filteredWords = words.filter(word => {
    // Remove empty strings and generic words
    if (!word || GENERIC_WORDS.includes(word.toLowerCase())) {
      return false
    }

    // Remove single characters and very short words
    if (word.length < 2) {
      return false
    }

    // Remove words that are just numbers or mostly numbers
    if (/^\d+$/.test(word) || /^\d.*\d$/.test(word)) {
      return false
    }

    return true
  })

  // Rejoin and clean up
  cleaned = filteredWords.join('-')

  // Clean up extra separators and normalize
  cleaned = cleaned.replace(/[-_\s]+/g, '-') // Replace multiple separators with single dash
  cleaned = cleaned.replace(/^[-_]+|[-_]+$/g, '') // Remove separators from ends

  // Final validation
  if (!cleaned || cleaned.length < MIN_MEANINGFUL_LENGTH) {
    return null
  }

  // Check if result is still too generic or meaningless
  if (GENERIC_WORDS.includes(cleaned) || /^[a-z]-?[a-z]$/.test(cleaned)) {
    return null
  }

  return cleaned
}

// Enhanced function to validate if a filename is meaningful
const isValidFilename = (filename) => {
  if (!filename || typeof filename !== 'string') {
    return false
  }

  const cleaned = removeUnwantedPatterns(filename)
  return cleaned !== null && cleaned.length >= MIN_MEANINGFUL_LENGTH
}

// Batch processing function for better efficiency
const filterFilenames = (filenames) => {
  if (!Array.isArray(filenames)) {
    return []
  }

  const results = []
  const seen = new Set() // Avoid duplicates

  for (const filename of filenames) {
    const cleaned = removeUnwantedPatterns(filename)
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned)
      results.push(cleaned)
    }
  }

  return results
}

// Debug function to see what patterns are being matched
const debugFilename = (filename) => {
  console.log(`\n--- Debugging filename: "${filename}" ---`)

  let cleaned = filename.toLowerCase().trim()
  console.log(`After initial cleanup: "${cleaned}"`)

  // Test specific patterns
  for (let i = 0; i < SPECIFIC_PATTERNS.length; i++) {
    const pattern = SPECIFIC_PATTERNS[i]
    const matches = cleaned.match(pattern)
    if (matches) {
      console.log(`Pattern ${i + 1} (${pattern}) matched: ${matches}`)
      cleaned = cleaned.replace(pattern, ' ')
      console.log(`After removal: "${cleaned}"`)
    }
  }

  // Test word patterns
  const wordPatterns = createPatterns()
  for (let i = 0; i < wordPatterns.length; i++) {
    const pattern = wordPatterns[i]
    const matches = cleaned.match(pattern)
    if (matches) {
      console.log(`Word pattern ${i + 1} (${pattern}) matched: ${matches}`)
      cleaned = cleaned.replace(pattern, ' ')
      console.log(`After removal: "${cleaned}"`)
    }
  }

  const finalResult = removeUnwantedPatterns(filename)
  console.log(`Final result: "${finalResult}"`)
  console.log('--- End debug ---\n')
  return finalResult
}

module.exports = {
  removeUnwantedPatterns,
  isValidFilename,
  filterFilenames,
  debugFilename
}
