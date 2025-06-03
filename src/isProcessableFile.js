const path = require('path')
const { allExtensions } = require('./supportedExtensions')

module.exports = ({ filePath }) => {
  const ext = path.extname(filePath).toLowerCase()
  return allExtensions.includes(ext)
}
