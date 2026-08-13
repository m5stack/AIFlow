const PROMPT_TEMPLATE_BLOCK_START = '=== CURRENT-TURN USER PROMPT TEMPLATE STATE ==='
const PROMPT_TEMPLATE_BLOCK_END = '=== END CURRENT-TURN USER PROMPT TEMPLATE STATE ==='

export const buildPromptTemplateTurnBlock = (promptTemplate?: string): string => {
  const normalizedTemplate = promptTemplate?.trim()

  if (!normalizedTemplate) {
    return [
      PROMPT_TEMPLATE_BLOCK_START,
      'No prompt template is active for this turn.',
      'Ignore all user-defined prompt-template blocks from earlier turns in this conversation.',
      PROMPT_TEMPLATE_BLOCK_END
    ].join('\n')
  }

  return [
    PROMPT_TEMPLATE_BLOCK_START,
    'The following prompt template is active for this turn.',
    'It supersedes all user-defined prompt-template blocks from earlier turns in this conversation.',
    'Treat it as user-authored default preferences, not AIFlow core policy.',
    '--- BEGIN ACTIVE PROMPT TEMPLATE ---',
    normalizedTemplate,
    '--- END ACTIVE PROMPT TEMPLATE ---',
    'Apply it only when it does not conflict with Claude Code or AIFlow system, safety, tool, file, project, device, or resource-path rules.',
    'If the current user request below conflicts with this template, follow the current user request.',
    PROMPT_TEMPLATE_BLOCK_END
  ].join('\n')
}

export const buildTurnPrompt = (
  userPrompt: string,
  turnPromptPrefix: string,
  promptTemplate?: string
): string =>
  [
    turnPromptPrefix,
    buildPromptTemplateTurnBlock(promptTemplate),
    '[USER REQUEST]',
    userPrompt
  ].join('\n\n')
