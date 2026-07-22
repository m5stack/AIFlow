const DEVICE_RESOURCE_ROOT = 'res'

export const deviceRelativePathForProjectFile = (projectRelativePath: string): string =>
  `${DEVICE_RESOURCE_ROOT}/${projectRelativePath.replace(/^\/+/, '')}`

export const deviceAbsolutePathForProjectFile = (projectRelativePath: string): string =>
  `/flash/${deviceRelativePathForProjectFile(projectRelativePath)}`
