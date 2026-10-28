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
const covered = new Set(pub && pub.recorded === 'publish' ? pub.items || [] : [])

const toReview = args.filter(id => covered.has(id))
const skipped = args.filter(id => !covered.has(id))
if (skipped.length) log(`not reviewed, no recorded publish: ${skipped.join(' ')}`)

const reviews = await parallel(toReview.map(id => () => agent(`review ${id}`)))
return toReview.filter((id, i) => reviews[i])
