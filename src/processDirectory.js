const path = require('path')
const fs = require('fs').promises
const pLimit = require('p-limit')

const processFile = require('./processFile')

const processDirectory = async ({ options, inputPath }) => {
  try {
    const files = await fs.readdir(inputPath)
    const limit = pLimit(3) // Process 3 files concurrently

    const fileProcessPromises = files.map(file =>
      limit(async () => {
        const filePath = path.join(inputPath, file)
        const fileStats = await fs.stat(filePath)

        if (fileStats.isFile()) {
          return processFile({ ...options, filePath })
        } else if (fileStats.isDirectory() && options.includeSubdirectories) {
          return processDirectory({ options, inputPath: filePath })
        }
      })
    )

    await Promise.all(fileProcessPromises)
  } catch (err) {
    console.log(err.message)
  }
}

module.exports = processDirectory
