// Start everything at once, then await together (asyncio.gather).
const [readme, files] = await Promise.all([
  agent('Summarize the README'),
  Promise.all(args.map(f => agent(`Summarize ${f}`))),
])
return { readme: `README: ${readme}`, files }
