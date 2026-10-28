// args: string[] of files → {readme: "README: ...", files: [summary per file]}
const readme = agent('Summarize the README')
const files = []
for (const f of args) {
  files.push(await agent(`Summarize ${f}`))
}
return { readme: 'README: ' + readme, files }
