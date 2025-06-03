const sharp = require('sharp')
const fs = require('fs').promises

const processImage = async (imagePath, maxSize = 1024) => {
  try {
    // Check file size first
    const stats = await fs.stat(imagePath)
    const maxBytes = 5 * 1024 * 1024 // 5MB limit

    if (stats.size > maxBytes) {
      // Resize large images to reduce memory usage
      const resized = await sharp(imagePath)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 }) // Convert to JPEG with good quality
        .toBuffer()

      return resized.toString('base64')
    } else {
      const buffer = await fs.readFile(imagePath)
      return buffer.toString('base64')
    }
  } catch (err) {
    throw new Error(`Image processing failed: ${err.message}`)
  }
}

// Process multiple images efficiently
const processImages = async (imagePaths, maxSize = 1024) => {
  const processPromises = imagePaths.map(path => processImage(path, maxSize))
  return Promise.all(processPromises)
}

module.exports = { processImage, processImages }