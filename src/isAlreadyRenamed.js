const path = require('path')

module.exports = ({ fileName, targetCase }) => {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName))

  // Skip certain patterns that are not naming conventions
  const skipPatterns = [
    /^\d{8}_\d{6}$/, // Date format like 20250501_134034
    /^IMG_\d+$/, // Camera/screenshot format like IMG_1234
    /^Screenshot/, // Screenshots
    /^[A-Z]{2,5}-\d+$/, // Ticket format like PROJ-123
    /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/ // UUID format
  ]

  if (skipPatterns.some(pattern => pattern.test(nameWithoutExt))) {
    return false
  }

  // Define patterns for specific case styles
  const casePatterns = {
    camelCase: /^[a-z][a-zA-Z0-9]*$/, // starts lowercase, following words capitalized
    pascalCase: /^[A-Z][a-zA-Z0-9]*$/, // starts with uppercase
    snakeCase: /^[a-z]+(_[a-z]+)*$/, // lowercase with underscores
    kebabCase: /^[a-z]+(-[a-z]+)*$/, // lowercase with hyphens
    constantCase: /^[A-Z]+(_[A-Z]+)*$/, // uppercase with underscores
    dotCase: /^[a-z]+(\.[a-z]+)*$/, // lowercase with dots
    noCase: /^[a-z]+( [a-z]+)*$/, // lowercase with spaces
    capitalCase: /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/, // Title Case
    pathCase: /^[a-z]+(\/?[a-z]+)*$/, // lowercase with slashes
    sentenceCase: /^[A-Z][a-z]+(\s[a-z]+)*$/, // Sentence case
    trainCase: /^[A-Z][a-z]+(-[A-Z][a-z]+)*$/, // Title-Case-With-Hyphens
    pascalSnakeCase: /^[A-Z][a-z]+(_[A-Z][a-z]+)*$/ // Pascal_Snake_Case
  }

  // Get the pattern for the current target case
  const pattern = casePatterns[targetCase]

  // If we have a pattern for the target case, check if the filename already matches it
  if (pattern) {
    // Check if the current filename matches the target case pattern
    const alreadyInTargetCase = pattern.test(nameWithoutExt)

    // Additional check to ensure it's actually a valid renamed file
    // (not a single word that might accidentally match the pattern)
    const isActuallyRenamed = (
      nameWithoutExt.length > 3 && // Must be more than 3 characters
      !(/^[a-zA-Z]{1,6}$/.test(nameWithoutExt)) && // Not just a short word
      !(/^\d+$/.test(nameWithoutExt)) // Not just numbers
    )

    return alreadyInTargetCase && isActuallyRenamed
  }

  // Fallback: check for common naming conventions if we don't have a specific pattern
  const genericPatterns = [
    /([a-z]+[A-Z][a-z]+|[A-Z][a-z]+[A-Z][a-z]+)/, // camelCase or PascalCase
    /[a-z]+_[a-z]+/, // snake_case with lowercase only
    /[a-z]+-[a-z]+/, // kebab-case with multiple words
    /([a-z]+\.){2,}[a-z]+/ // dot.case with multiple dots
  ]

  return genericPatterns.some(pattern => pattern.test(nameWithoutExt))
}
