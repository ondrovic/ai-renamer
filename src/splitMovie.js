#!/usr/bin/env node

const { exec, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const execAsync = promisify(exec)

class MovieSplitter {
  constructor (options = {}) {
    this.minSceneDuration = options.minSceneDuration || 3 // Minimum scene duration in seconds
    this.blackThreshold = options.blackThreshold || 0.05 // Black frame threshold (0-1)
    this.blackMinDuration = options.blackMinDuration || 1 // Minimum duration of black scene in seconds
    this.outputNamePattern = options.outputNamePattern || function (name, index) { return `${name}_part${index}` }
  }

  /**
   * Detect scene transitions using FFmpeg
   * @param {string} inputFile - Path to the input video file
   * @returns {Promise<Array>} - Array of scene transition timestamps
   */
  async detectSceneTransitions (inputFile) {
    console.log('Detecting scene transitions...')

    const ffmpegCommand = [
      'ffmpeg',
      '-i', inputFile,
      '-vf', `blackdetect=d=${this.blackMinDuration}:pix_th=${this.blackThreshold}`,
      '-an',
      '-f', 'null',
      '-'
    ]

    return new Promise((resolve, reject) => {
      const blackFrames = []
      const ffmpeg = spawn(ffmpegCommand[0], ffmpegCommand.slice(1))

      let output = ''

      ffmpeg.stderr.on('data', (data) => {
        output += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg process exited with code ${code}`))
          return
        }

        // Parse FFmpeg output for black frame detection
        const blackDetectRegex = /black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g
        let match

        while ((match = blackDetectRegex.exec(output)) !== null) {
          const [, start, end, duration] = match
          blackFrames.push({
            start: parseFloat(start),
            end: parseFloat(end),
            duration: parseFloat(duration)
          })
        }

        resolve(blackFrames)
      })
    })
  }

  /**
   * Analyze scene transitions and determine split points
   * @param {Array} blackFrames - Array of detected black frames
   * @returns {Array} - Array of split points (timestamps)
   */
  analyzeSplitPoints (blackFrames) {
    const splitPoints = [0] // Always start from the beginning

    for (const frame of blackFrames) {
      // Use the end of black frame as split point if it's long enough
      if (frame.duration >= this.blackMinDuration) {
        const lastSplitPoint = splitPoints[splitPoints.length - 1]
        if (frame.end - lastSplitPoint >= this.minSceneDuration) {
          splitPoints.push(frame.end)
        }
      }
    }

    return splitPoints
  }

  /**
   * Split video into parts based on split points
   * @param {string} inputFile - Path to the input video file
   * @param {Array} splitPoints - Array of timestamps to split at
   * @param {string} outputDir - Directory to save output files
   */
  async splitVideo (inputFile, splitPoints, outputDir) {
    console.log('Splitting video...')

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const fileName = path.basename(inputFile, path.extname(inputFile))
    const fileExt = path.extname(inputFile)

    for (let i = 0; i < splitPoints.length; i++) {
      const startTime = splitPoints[i]
      const endTime = i < splitPoints.length - 1 ? splitPoints[i + 1] : undefined

      const outputFile = path.join(outputDir, `${this.outputNamePattern(fileName, i + 1)}${fileExt}`)

      const ffmpegArgs = [
        '-ss', startTime.toString(),
        '-i', inputFile,
        '-c', 'copy'
      ]

      if (endTime !== undefined) {
        ffmpegArgs.push('-t', (endTime - startTime).toString())
      }

      ffmpegArgs.push(outputFile)

      console.log(`Splitting part ${i + 1}...`)
      console.log(`From ${startTime}s to ${endTime !== undefined ? endTime + 's' : 'end'}`)

      try {
        await execAsync(`ffmpeg ${ffmpegArgs.map(arg => `"${arg}"`).join(' ')}`)
        console.log(`✓ Created ${outputFile}`)
      } catch (error) {
        console.error(`Error splitting part ${i + 1}:`, error.message)
      }
    }
  }

  /**
   * Main method to process the video file
   * @param {string} inputFile - Path to the input video file
   * @param {string} outputDir - Directory to save output files
   */
  async process (inputFile, outputDir) {
    try {
      // Detect scene transitions
      const blackFrames = await this.detectSceneTransitions(inputFile)
      console.log(`Found ${blackFrames.length} black scenes`)

      // Analyze and determine split points
      const splitPoints = this.analyzeSplitPoints(blackFrames)
      console.log(`Determined ${splitPoints.length} split points`)

      // Split the video
      await this.splitVideo(inputFile, splitPoints, outputDir)

      console.log('Video splitting complete!')
    } catch (error) {
      console.error('Error processing video:', error.message)
    }
  }
}

// Optional: Integrate with Ollama for intelligent scene analysis
class AIEnhancedMovieSplitter extends MovieSplitter {
  constructor (options = {}) {
    super(options)
    this.ollamaModel = options.ollamaModel || 'llama2'
  }

  /**
   * Use Ollama to analyze scene content and improve splitting decisions
   * @param {string} inputFile - Path to the input video file
   * @param {Array} splitPoints - Initial split points
   * @returns {Promise<Array>} - Refined split points
   */
  async analyzeWithOllama (inputFile, splitPoints) {
    console.log('Analyzing scenes with AI...')

    const refinedSplitPoints = [...splitPoints]

    for (let i = 0; i < splitPoints.length - 1; i++) {
      const midTime = (splitPoints[i] + splitPoints[i + 1]) / 2

      // Extract frame at midpoint for analysis
      const framePath = path.join(process.cwd(), `temp_frame_${i}.jpg`)
      const ffmpegCommand = `ffmpeg -ss ${midTime} -i "${inputFile}" -vframes 1 -y "${framePath}"`

      try {
        await execAsync(ffmpegCommand)

        // Analyze frame with Ollama
        const ollamaCommand = `ollama run ${this.ollamaModel} "Describe this movie scene and determine if it should be split at this point. Return only 'split' or 'continue'." < "${framePath}"`
        const { stdout } = await execAsync(ollamaCommand)

        // Parse Ollama response
        if (stdout.toLowerCase().includes('continue')) {
          // Remove this split point
          refinedSplitPoints.splice(i + 1, 1)
        }

        // Clean up
        fs.unlinkSync(framePath)
      } catch (error) {
        console.error(`Error analyzing scene ${i}:`, error.message)
      }
    }

    return refinedSplitPoints
  }

  /**
   * Override process method to include AI analysis
   */
  async process (inputFile, outputDir) {
    try {
      // First, do normal scene detection
      const blackFrames = await this.detectSceneTransitions(inputFile)
      let splitPoints = this.analyzeSplitPoints(blackFrames)

      // Enhance with AI analysis
      splitPoints = await this.analyzeWithOllama(inputFile, splitPoints)

      // Split the video
      await this.splitVideo(inputFile, splitPoints, outputDir)

      console.log('AI-enhanced video splitting complete!')
    } catch (error) {
      console.error('Error processing video:', error.message)
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.log(`
Usage: node movie-splitter.js <input-file> [output-dir] [options]

Options:
  --ai              Use AI-enhanced analysis with Ollama
  --threshold      Black threshold (0-1, default: 0.05)
  --black-duration Minimum black scene duration (seconds, default: 1)
  --min-scene      Minimum scene duration (seconds, default: 3)
  --ollama-model   Ollama model to use (default: llama2)

Example:
  node movie-splitter.js movie.mp4 output
  node movie-splitter.js movie.mp4 output --ai --threshold 0.03 --min-scene 5
    `)
    process.exit(1)
  }

  const inputFile = args[0]
  const outputDir = args[1] || 'output'

  const options = {}

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--ai':
        options.useAI = true
        break
      case '--threshold':
        options.blackThreshold = parseFloat(args[++i])
        break
      case '--black-duration':
        options.blackMinDuration = parseFloat(args[++i])
        break
      case '--min-scene':
        options.minSceneDuration = parseFloat(args[++i])
        break
      case '--ollama-model':
        options.ollamaModel = args[++i]
        break
    }
  }

  const Splitter = options.useAI ? AIEnhancedMovieSplitter : MovieSplitter
  const splitter = new Splitter(options)

  splitter.process(inputFile, outputDir)
}

module.exports = { MovieSplitter, AIEnhancedMovieSplitter }
