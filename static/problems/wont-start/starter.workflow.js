const WORKFLOW = 'release-notes'

export const meta = {
  name: WORKFLOW,
  description: 'Draft release notes from merged PRs',
}

const PRS = {
  type: 'object',
  properties: { prs: { type: 'array', items: { type: 'string' } } },
  required: ['prs'],
}

const started: number = Date.now()
const { prs } = await agent('List the PRs merged this week.', { schema: PRS })
const notes = await agent(`Write release notes for: ${prs.join(', ')}`)
return { notes, startedAt: started }
