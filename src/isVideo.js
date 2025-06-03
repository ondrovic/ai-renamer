const { videoTypes } = require('./supportedExtensions')

module.exports = ({ ext }) => {
  return videoTypes.includes(ext.toLowerCase())
}
