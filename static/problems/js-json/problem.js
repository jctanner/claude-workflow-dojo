import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Printing and Comparing Objects',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Print an object into a sentence as JSON, read a field out of a JSON string, and say whether two objects have the same contents.",
  concepts: ['[object Object]', 'JSON.stringify/parse', '=== is identity'],
  python: `import json
line = f"result for {args['id']}: {json.dumps(args['result'])}"
count = json.loads(args["raw"])["count"]
same = args["a"] == args["b"]      # dict == compares contents`,
  description: `
<p><code>args</code> is <code>{id, result, raw, a, b}</code>. Return <code>{line, count, same}</code>:</p>
<ul>
  <li><code>line</code> is <code>result for F1: {"sev":"high","files":2}</code>, the object printed as JSON.</li>
  <li><code>count</code> is the <code>count</code> field parsed out of the JSON <i>string</i> <code>raw</code>.</li>
  <li><code>same</code> says whether objects <code>a</code> and <code>b</code> have the same contents.</li>
</ul>
<p>Three Python habits that fail quietly:</p>
<ul>
  <li>Putting an object in a string gives <code>[object Object]</code>, not a repr. Use <code>JSON.stringify(obj)</code>, which is <code>json.dumps</code>.</li>
  <li>A JSON <i>string</i> has no fields until you parse it: <code>JSON.parse(s)</code> is <code>json.loads</code>.</li>
  <li><code>===</code> on objects or arrays asks "same object?" (Python's <code>is</code>), never "same contents?". Two equal-looking objects
  are <code>!==</code>. For plain data, compare <code>JSON.stringify(a) === JSON.stringify(b)</code>.</li>
</ul>`,
  hints: ['`result for ${args.id}: ${JSON.stringify(args.result)}`', 'JSON.parse(args.raw).count'],
  tests: [{
    name: 'printing and parsing',
    args: { id: 'F1', result: { sev: 'high', files: 2 }, raw: '{"count": 3}', a: { x: [1, 2] }, b: { x: [1, 2] } },
    expected: { line: 'result for F1: {"sev":"high","files":2}', count: 3, same: true },
  }].map(t => ({
    ...t,
    check: r => (r && typeof r.line === 'string' && r.line.includes('[object Object]')
      ? 'Your line contains [object Object]: an object in a template string does not print its contents. Use JSON.stringify.'
      : expectEqual(r, t.expected)),
  })),
};
