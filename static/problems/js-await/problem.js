import { expectEqual, mentioned } from '../_kit.js';

const FILES = ['api.py', 'db.py', 'cli.py'];

export default {
  tier: 0,
  title: 'Promises Are Coroutines',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Summarize the README and every file with agents, all at the same time, and return the answers.",
  concepts: ['async/await', 'Promise', 'Promise.all ≈ asyncio.gather'],
  python: `readme = await agent("Summarize the README")
summaries = await asyncio.gather(*(agent(f"Summarize {f}") for f in files))
return {"readme": f"README: {readme}", "files": summaries}`,
  description: `
<p>This is the bridge into workflows. <code>agent(prompt)</code> is an async function: calling it returns a
<b>Promise</b>, the equivalent of a Python coroutine or awaitable, and <code>await</code> gets the value. Each call takes 1s.</p>
<p><code>args</code> is a list of files. Return <code>{readme, files}</code>. <code>readme</code> is
<code>"README: " + </code> the answer to <code>agent('Summarize the README')</code>. <code>files</code> holds one
<code>agent(\`Summarize \${file}\`)</code> answer per file, in order, all fetched <b>concurrently</b>. The limit is 2s.</p>
<ul>
  <li>Forgetting <code>await</code> gives you a Promise object, and in a string it prints as <code>[object Promise]</code>.
  Python warns about a never-awaited coroutine; JavaScript stays silent.</li>
  <li><code>await Promise.all(array.map(f =&gt; agent(...)))</code> is <code>asyncio.gather</code>. <code>await</code> inside a
  <code>for</code> loop runs the calls one at a time.</li>
  <li>In Tier 1 you'll use the workflow's own <code>parallel(thunks)</code> instead. It is <code>Promise.all</code> plus failure
  handling.</li>
</ul>`,
  hints: [
    "const readme = await agent('Summarize the README')",
    'const files = await Promise.all(args.map(f => agent(`Summarize ${f}`)))',
  ],
  wallClockMs: 2000,
  respond(call) {
    const f = mentioned(call.prompt, FILES);
    if (f) return { output: `${f} summary`, duration: 1000 };
    return { output: 'readme summary', duration: 1000 };
  },
  tests: [{
    name: 'readme and three files',
    args: FILES,
    expected: { readme: 'README: readme summary', files: ['api.py summary', 'db.py summary', 'cli.py summary'] },
  }].map(t => ({
    ...t,
    check: r => (JSON.stringify(r ?? null).includes('[object Promise]') || JSON.stringify(r ?? null).includes('{}')
      ? 'Your result contains a Promise that was never awaited ([object Promise] or {}). Add await.'
      : expectEqual(r, t.expected)),
  })),
};
