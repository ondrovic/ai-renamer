const { imageTypes } = require('./supportedExtensions')

module.exports = ({ ext }) => {
  return imageTypes.includes(ext.toLowerCase())
}
