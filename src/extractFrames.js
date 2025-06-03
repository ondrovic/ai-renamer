const path = require('path')
const fs = require('fs').promises
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
// const getFilename = require('./getNewName')
const getFilename = path => path.split(/[\\/]/).pop() || ''
const getVideoMetadata = async ({ inputFile }) => {
  try {
    // Get both duration and resolution in a single command
    const { stdout } = await execAsync(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration:format=duration -of csv=p=0 "${inputFile}"`)
    const [width, height, duration] = stdout.trim().split(',')

    return {
      width: parseInt(width),
      height: parseInt(height),
      duration: parseFloat(duration)
    }
  } catch (err) {
    throw new Error(`Failed to get video metadata: ${err.message}`)
  }
}

const calculateOptimalSettings = ({ duration, width, height, requestedFrames }) => {
  // Limit frames based on video duration and resolution
  const maxFrames = Math.min(
    requestedFrames,
    Math.floor(duration), // Don't extract more frames than seconds
    10 // Reasonable upper limit
  )

  // For very short videos, extract fewer frames
  const numFrames = duration < 5 ? Math.min(maxFrames, 3) : maxFrames

  // Calculate quality level based on resolution
  let quality = 2 // Default FFmpeg quality (lower is better)
  if (width * height > 1920 * 1080) {
    quality = 5 // Higher compression for large videos
  }

  return { numFrames, quality }
}

const extractFramesAtIntervals = async ({
  inputFile,
  framesOutputDir,
  interval = 30,
  maxFrames
}) => {
  try {
    // Create output directory
    await fs.mkdir(framesOutputDir, { recursive: true })

    // Get video metadata
    const metadata = await getVideoMetadata({ inputFile })
    const { duration, width, height } = metadata

    // Calculate frames based on video duration and interval
    const timestamps = []
    for (let time = 0; time < duration; time += interval) {
      timestamps.push(time)
    }

    // Only apply max frames limit if explicitly provided
    const selectedTimestamps = maxFrames !== undefined ? timestamps.slice(0, maxFrames) : timestamps

    console.log(`🔍 Debug: Input duration: ${duration}s, Interval: ${interval}s`)
    console.log(`🔍 Debug: Calculated timestamps: ${timestamps.length}`)
    console.log(`🔍 Debug: MaxFrames parameter: ${maxFrames}`)
    console.log(`🔍 Debug: Final timestamps: ${selectedTimestamps.length}`)

    console.log(`📹 Extracting ${selectedTimestamps.length} frames at ${interval}s intervals from ${getFilename(inputFile)}...`)

    // Extract frames individually to avoid command line length limits
    const images = []

    for (let index = 0; index < selectedTimestamps.length; index++) {
      const timestamp = selectedTimestamps[index]
      const outputPath = path.resolve(framesOutputDir, `frame_${index.toString().padStart(3, '0')}.jpg`)

      // Single frame extraction command
      const command = `ffmpeg -ss ${timestamp} -i "${inputFile}" -vframes 1 -q:v 2 "${outputPath}" -loglevel error -y`

      try {
        await execAsync(command)
        images.push(outputPath)

        // Optional: Show progress for large extractions
        if (selectedTimestamps.length > 10 && (index + 1) % 10 === 0) {
          console.log(`📹 Progress: ${index + 1}/${selectedTimestamps.length} frames extracted`)
        }
      } catch (frameError) {
        console.warn(`⚠️ Failed to extract frame at ${timestamp}s: ${frameError.message}`)
        // Continue with other frames instead of failing completely
      }
    }

    if (images.length === 0) {
      throw new Error('No frames were successfully extracted')
    }

    if (images.length < selectedTimestamps.length) {
      console.warn(`⚠️ Only ${images.length}/${selectedTimestamps.length} frames were successfully extracted`)
    }

    const videoPrompt = `You are analyzing video frames extracted at ${interval}-second intervals from a ${duration.toFixed(1)}-second video (${width}x${height} resolution).
      FRAME DATA:
      - Frames captured at: ${selectedTimestamps.slice(0, images.length).map(t => t.toFixed(1) + 's').join(', ')}
      - Total frames analyzed: ${images.length}
      - Video duration: ${duration.toFixed(1)} seconds
      - Resolution: ${width}x${height}

      ANALYSIS INSTRUCTIONS:
      - Examine each frame in chronological order
      - Identify visual elements, actions, and scene changes
      - Note the progression and timeline of events
      - Provide comprehensive coverage of the entire video content

      These frames represent the complete timeline showing the video's progression and key moments.`

    return { images, videoPrompt }
  } catch (err) {
    throw new Error(`Frame extraction failed: ${err.message}`)
  }
}

const extractFramesSmartly = async ({ frames, inputFile, framesOutputDir }) => {
  try {
    // Create output directory
    await fs.mkdir(framesOutputDir, { recursive: true })

    // Get video metadata
    const metadata = await getVideoMetadata({ inputFile })

    // Calculate optimal settings
    const { numFrames, quality } = calculateOptimalSettings({
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      requestedFrames: frames
    })

    // Select frames at key points (not just evenly spaced)
    const frameTimestamps = selectKeyFrames(metadata.duration, numFrames)

    // Extract frames using single FFmpeg command with multiple outputs
    const command = buildFFmpegCommand({
      inputFile,
      framesOutputDir,
      timestamps: frameTimestamps,
      quality,
      metadata
    })

    console.log(`🎥 Extracting ${numFrames} frames from ${getFilename(inputFile)}...`)
    await execAsync(command)

    // Get extracted frame paths
    const images = frameTimestamps.map((_, index) =>
      path.resolve(framesOutputDir, `frame_${index.toString().padStart(3, '0')}.jpg`)
    )

    const videoPrompt = generateVideoPrompt(metadata, numFrames, frameTimestamps)

    return { images, videoPrompt }
  } catch (err) {
    throw new Error(`Frame extraction failed: ${err.message}`)
  }
}

const selectKeyFrames = (duration, numFrames) => {
  if (numFrames <= 0) return []

  // Single frame is always at the middle
  if (numFrames === 1) return [duration / 2]

  const timestamps = []

  // Calculate frame positions using strategic importance
  const getFramePositions = (n) => {
    // For n frames, create positions with strategic weighting
    const positions = []

    // Key positions in video (start, 1/4, 1/2, 3/4, end)
    const keyPoints = [0, 0.25, 0.5, 0.75, 1]

    // Determine how many frames to allocate to key points
    const keyFrames = Math.min(keyPoints.length, n)

    // Add key position frames
    for (let i = 0; i < keyFrames; i++) {
      const keyIndex = Math.floor(i * (keyPoints.length - 1) / (keyFrames - 1))
      positions.push(keyPoints[keyIndex])
    }

    // If we need more frames, distribute them evenly between key points
    const remainingFrames = n - keyFrames
    if (remainingFrames > 0) {
      const segments = keyFrames - 1 || 1
      const framesPerSegment = remainingFrames / segments

      for (let segment = 0; segment < segments; segment++) {
        const start = positions[segment] || 0
        const end = positions[segment + 1] || 1
        const segmentFrames = Math.ceil(framesPerSegment)

        for (let i = 1; i <= segmentFrames && positions.length < n; i++) {
          const pos = start + (end - start) * (i / (segmentFrames + 1))
          positions.push(pos)
        }
      }
    }

    return positions
  }

  const positions = getFramePositions(numFrames)

  // Convert positions to timestamps and apply padding
  const padding = 0.1 // Avoid extracting at exactly 0s and duration

  positions.forEach(pos => {
    let timestamp = duration * pos

    // Apply padding for start and end frames
    if (pos === 0) timestamp = padding
    if (pos === 1) timestamp = duration - padding

    timestamps.push(timestamp)
  })

  // Ensure uniqueness and proper ordering
  return [...new Set(timestamps)]
    .sort((a, b) => a - b)
    .slice(0, numFrames)
}

const buildFFmpegCommand = ({ inputFile, framesOutputDir, timestamps, quality, metadata }) => {
  const commands = []

  // Optimize scale filter based on resolution
  let scaleFilter = ''
  if (metadata.width > 1920) {
    scaleFilter = '-vf \'scale=1920:-2:flags=lanczos\'' // Downscale large videos
  }

  // Build command for each timestamp
  timestamps.forEach((timestamp, index) => {
    const output = `"${framesOutputDir}/frame_${index.toString().padStart(3, '0')}.jpg"`
    commands.push(`-ss ${timestamp} -i "${inputFile}" ${scaleFilter} -vframes 1 -q:v ${quality} ${output}`)
  })

  // Combine into single FFmpeg command (more efficient than multiple calls)
  return `ffmpeg ${commands.join(' ')} -loglevel error`
}

const generateVideoPrompt = (metadata, numFrames, timestamps) => {
  const intervals = []
  for (let i = 0; i < timestamps.length - 1; i++) {
    intervals.push((timestamps[i + 1] - timestamps[i]).toFixed(1))
  }

  // let prompt = `Analyze these ${numFrames} frames from a ${metadata.duration.toFixed(1)}-second video (${metadata.width}x${metadata.height}).`
  let prompt = `You are analyzing ${numFrames} video frames from a ${metadata.duration.toFixed(1)}-second video (${metadata.width}x${metadata.height} resolution).
    FRAME TIMESTAMPS: ${timestamps.map(t => t.toFixed(1) + 's').join(', ')}

    ANALYSIS TASK:
    - Examine each frame systematically
    - Identify key visual elements and actions
    - Track changes between frames
    - Provide detailed observations about content progression`
  prompt += `\nFrames extracted at: ${timestamps.map(t => t.toFixed(1) + 's').join(', ')}`

  if (intervals.length > 0) {
    prompt += `\nIntervals between frames: ${intervals.join(', ')} seconds`
  }

  // Add context based on video characteristics
  if (metadata.duration < 5) {
    prompt += '\nNote: This is a very short video - focus on rapid changes'
  } else if (metadata.duration > 60) {
    prompt += '\nNote: This is a longer video - look for scene changes and key moments'
  }

  return prompt
}

// Cache FFmpeg probe results for repeated operations on same video
const metadataCache = new Map()

const getCachedMetadata = async (inputFile) => {
  if (metadataCache.has(inputFile)) {
    return metadataCache.get(inputFile)
  }

  const metadata = await getVideoMetadata({ inputFile })
  metadataCache.set(inputFile, metadata)
  return metadata
}

// Clear cache periodically or when memory is low
const clearMetadataCache = () => {
  metadataCache.clear()
}

module.exports = extractFramesSmartly

// Export additional utilities for advanced usage
module.exports.getCachedMetadata = getCachedMetadata
module.exports.clearMetadataCache = clearMetadataCache
module.exports.extractFramesAtIntervals = extractFramesAtIntervals
