export const meta = {
  name: 'find-todos',
  description: 'List files that contain TODO markers',
}

const answer = await agent('Which files contain TODO markers?')
// TODO: this is prose. Ask for structured output and return the sorted paths.
return answer
