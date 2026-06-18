const IMAGE_LANGUAGE = 'image'

export const languageByExtension: Record<string, string> = {
  // Images
  '.bmp': IMAGE_LANGUAGE,
  '.gif': IMAGE_LANGUAGE,
  '.ico': IMAGE_LANGUAGE,
  '.jpeg': IMAGE_LANGUAGE,
  '.jpg': IMAGE_LANGUAGE,
  '.png': IMAGE_LANGUAGE,
  '.svg': IMAGE_LANGUAGE,
  '.webp': IMAGE_LANGUAGE,

  // Python / MicroPython
  '.py': 'python',
  '.pyi': 'python',
  '.pyw': 'python',

  // JavaScript / TypeScript
  '.cjs': 'javascript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cts': 'typescript',
  '.mts': 'typescript',
  '.ts': 'typescript',
  '.tsx': 'typescript',

  // Web
  '.css': 'css',
  '.htm': 'html',
  '.html': 'html',
  '.less': 'less',
  '.sass': 'sass',
  '.scss': 'scss',
  '.xhtml': 'html',

  // Data / config
  '.cfg': 'ini',
  '.conf': 'ini',
  '.env': 'plaintext',
  '.ini': 'ini',
  '.json': 'json',
  '.json5': 'json',
  '.jsonc': 'json',
  '.properties': 'properties',
  '.toml': 'toml',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',

  // Docs / text
  '.csv': 'plaintext',
  '.log': 'plaintext',
  '.markdown': 'markdown',
  '.md': 'markdown',
  '.rst': 'restructuredtext',
  '.text': 'plaintext',
  '.txt': 'plaintext',

  // C / C++ (embedded)
  '.c': 'c',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',

  // Shell / scripts
  '.bash': 'shell',
  '.bat': 'bat',
  '.ps1': 'powershell',
  '.sh': 'shell',
  '.zsh': 'shell',

  // Other languages
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.lua': 'lua',
  '.php': 'php',
  '.r': 'r',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.sql': 'sql',
  '.swift': 'swift'
}

export const mimeByExtension: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

export const extensionFromPath = (filePath: string): string => {
  const dot = filePath.lastIndexOf('.')
  if (dot <= 0 || dot === filePath.length - 1) return ''
  return filePath.slice(dot).toLowerCase()
}

export const isImageExtension = (ext: string): boolean =>
  languageByExtension[ext.toLowerCase()] === IMAGE_LANGUAGE

export const isCodeExtension = (ext: string): boolean => {
  const language = languageByExtension[ext.toLowerCase()]
  return language !== undefined && language !== IMAGE_LANGUAGE
}

export const languageForExtension = (ext: string, fallback?: string): string | undefined => {
  const language = languageByExtension[ext.toLowerCase()]
  if (language) return language
  return fallback
}

export const languageForFilePath = (filePath: string, fallback?: string): string | undefined => {
  return languageForExtension(extensionFromPath(filePath), fallback)
}

export const isImagePath = (filePath: string): boolean =>
  isImageExtension(extensionFromPath(filePath))

export const isCodePath = (filePath: string): boolean =>
  isCodeExtension(extensionFromPath(filePath))
