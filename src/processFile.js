const path = require('path')
const { v4: uuidv4 } = require('uuid')

const isImage = require('./isImage')
const isVideo = require('./isVideo')
const saveFile = require('./saveFile')
const getNewName = require('./getNewName')
const extractFrames = require('./extractFrames')
const readFileContent = require('./readFileContent')
const deleteDirectory = require('./deleteDirectory')
const isProcessableFile = require('./isProcessableFile')
const isAlreadyRenamed = require('./isAlreadyRenamed')

module.exports = async options => {
  let framesOutputDir = null

  try {
    const {
      frames,
      filePath,
      inputPath,
      useVideoSummary = false,
      summaryInterval = 30,
      summaryMaxFrames
    } = options

    const fileName = path.basename(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const relativeFilePath = path.relative(inputPath, filePath)

    if (fileName === '.DS_Store') return

    if (isAlreadyRenamed({ fileName, targetCase: options._case })) {
      // console.log(`⚪ Case: ${options._case}`)
      console.log(`🔵 Skipping already renamed: ${relativeFilePath}`)
      return
    }

    if (!isProcessableFile({ filePath })) {
      console.log(`🟡 Unsupported file: ${relativeFilePath}`)
      return
    }

    let content
    let videoPrompt
    let images = []

    if (isImage({ ext })) {
      images.push(filePath)
    } else if (isVideo({ ext })) {
      framesOutputDir = `/tmp/ai-renamer/${uuidv4()}`

      let extractedFrames
      if (useVideoSummary) {
        // Get metadata to calculate frame count
        const metadata = await extractFrames.getCachedMetadata(filePath)

        // Calculate number of frames based on video duration and interval
        const calculatedFrames = Math.ceil(metadata.duration / summaryInterval)

        // Log calculation details
        console.log(`📊 Video duration: ${metadata.duration.toFixed(1)}s`)
        console.log(`📊 Interval: ${summaryInterval}s`)
        console.log(`📊 Calculated frames: ${calculatedFrames}`)
        console.log(`📊 Summary max frames setting: ${summaryMaxFrames}`)

        // Apply maximum limit only if specified and necessary
        let numFrames
        if (typeof summaryMaxFrames === 'number') {
          numFrames = Math.min(calculatedFrames, summaryMaxFrames)
          console.log(`📊 Limited to max frames: ${numFrames}`)
        } else {
          numFrames = calculatedFrames
          console.log(`📊 Using all calculated frames: ${numFrames}`)
        }

        console.log(`🔧 Passing to extractFramesAtIntervals - maxFrames: ${numFrames}`)

        extractedFrames = await extractFrames.extractFramesAtIntervals({
          inputFile: filePath,
          framesOutputDir,
          interval: summaryInterval,
          maxFrames: numFrames
        })

        console.log(`🎯 Summary mode: Extracted ${extractedFrames.images.length} frames (1 frame per ${summaryInterval}s)`)
      } else {
        // Use smart extraction for regular mode
        extractedFrames = await extractFrames({
          frames,
          framesOutputDir,
          inputFile: filePath
        })
      }

      images = extractedFrames.images
      videoPrompt = extractedFrames.videoPrompt
    } else {
      content = await readFileContent({ filePath })
      if (!content) {
        console.log(`🔴 No text content: ${relativeFilePath}`)
        return
      }
    }

    const newName = await getNewName({ ...options, images, content, videoPrompt, relativeFilePath })
    if (!newName) return

    const newFileName = await saveFile({ ext, newName, filePath })
    const relativeNewFilePath = path.join(path.dirname(relativeFilePath), newFileName)
    console.log(`🟢 Renamed: ${relativeFilePath} to ${relativeNewFilePath}`)
  } catch (err) {
    console.log(err.message)
  } finally {
    // Always cleanup temp directory if it was created
    if (framesOutputDir) {
      try {
        await deleteDirectory({ folderPath: framesOutputDir })
        console.log(`🧹 Cleaned up temp directory: ${framesOutputDir}`)
      } catch (cleanupErr) {
        console.log(`⚠️ Warning: Failed to cleanup temp directory ${framesOutputDir}: ${cleanupErr.message}`)
      }
    }
  }
}
