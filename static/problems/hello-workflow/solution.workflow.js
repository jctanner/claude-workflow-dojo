export const meta = {
  name: 'summarize-readme',
  description: 'Summarize the repository README',
}

const summary = await agent('Summarize the README in one sentence.')
return summary
