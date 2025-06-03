const fs = require('fs').promises
const path = require('path')

const deleteDirectory = async ({ folderPath }) => {
  try {
    if (await fs.stat(folderPath).catch(() => false)) {
      const files = await fs.readdir(folderPath)

      await Promise.all(files.map(async (file) => {
        const curPath = path.join(folderPath, file)
        const stats = await fs.stat(curPath)

        if (stats.isDirectory()) {
          await deleteDirectory({ folderPath: curPath })
        } else {
          await fs.unlink(curPath)
        }
      }))

      await fs.rmdir(folderPath)
    }
  } catch (err) {
    throw new Error(`Failed to delete directory: ${err.message}`)
  }
}

module.exports = deleteDirectory
