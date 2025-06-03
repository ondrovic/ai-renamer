const imageTypes = ['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.gif', '.ico', '.webp']

const videoTypes = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.ts', '.mpg', '.mpeg', '.mpeg4', '.m4v']

const allExtensions = [
  // general programming languages
  '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.go', '.rs', '.swift', '.kt', '.scala', '.groovy',
  '.lua', '.pl', '.pm', '.r', '.dart', '.f', '.f90', '.f95', '.m', '.asm',
  '.vb', '.coffee', '.elm', '.erl', '.ex', '.exs', '.hs', '.clj', '.cljs',

  // web development
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',

  // markup and data
  '.md', '.markdown', '.json', '.xml', '.yaml', '.yml', '.csv', '.svg',

  // shell and scripting
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd', '.vbs',

  // database and query languages
  '.sql', '.graphql', '.gql',

  // template languages
  '.ejs', '.pug', '.jade', '.hbs', '.twig', '.liquid',

  // notebooks
  '.ipynb',

  // other
  '.txt', '.log', '.diff', '.patch', '.proto', '.tex',

  // image files
  ...imageTypes,

  // video files
  ...videoTypes,

  // handled separately in code
  '.pdf'
]

module.exports = {
  imageTypes,
  videoTypes,
  allExtensions,
  // Keep the default export for backward compatibility
  default: allExtensions
}
