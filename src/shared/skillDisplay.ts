import { parseSkillFileName } from './skillVersion'

export function formatSkillBaseName(base: string): string {
  return base
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const slugifyForCompare = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

const stripQuotes = (value: string): string => value.trim().replace(/^["']|["']$/g, '')

/** Resolve human-readable skill name from folder slug and optional SKILL.md frontmatter name. */
export function resolveSkillDisplayName(slug: string, frontmatterName?: string): string {
  const { base } = parseSkillFileName(slug)
  const formattedFromBase = formatSkillBaseName(base)
  const rawName = frontmatterName ? stripQuotes(frontmatterName) : ''
  if (!rawName) return formattedFromBase

  const normalizedRaw = slugifyForCompare(rawName)
  const normalizedBase = slugifyForCompare(base)
  const normalizedSlug = slugifyForCompare(slug)

  if (normalizedRaw === normalizedBase || normalizedRaw === normalizedSlug) {
    return formattedFromBase
  }

  return rawName
}
