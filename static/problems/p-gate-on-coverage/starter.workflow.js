export const meta = {
  name: 'publish-then-review',
  description: 'Publish, then review only what was published',
}

const PUBLISHED = {
  type: 'object',
  required: ['recorded'],
  properties: { recorded: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
}

const pub = await agent('Run `python3 scripts/publish.py` once and return what it prints.', { label: 'publish', schema: PUBLISHED })
if (!pub) log('publish: no result')

const reviews = await parallel(args.map(id => () => agent(`review ${id}`)))
return args.filter((id, i) => reviews[i])
