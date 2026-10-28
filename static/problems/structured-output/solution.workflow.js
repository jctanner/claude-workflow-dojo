export const meta = {
  name: 'find-todos',
  description: 'List files that contain TODO markers',
}

const FILES = {
  type: 'object',
  properties: { files: { type: 'array', items: { type: 'string' } } },
  required: ['files'],
}

const { files } = await agent('Which files contain TODO markers?', { schema: FILES })
return [...files].sort()
