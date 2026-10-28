import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'Unpacking, Spread and Rest',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Merge two config objects (overrides win), join two file lists, and split the joined list into its first file and the rest.",
  concepts: ['destructuring', '...spread', 'object merge'],
  python: `config = {**args["defaults"], **args["overrides"]}
files = [*args["files"], *args["extra"]]
first, *rest = files`,
  description: `
<p><code>args</code> is <code>{defaults, overrides, files, extra}</code>. Return
<code>{config, files, first, rest}</code>:</p>
<ul>
  <li><code>config</code> merges <code>defaults</code> and then <code>overrides</code>, so overrides win, like <code>{**a, **b}</code>.</li>
  <li><code>files</code> is <code>files</code> followed by <code>extra</code>, like <code>[*a, *b]</code>.</li>
  <li><code>first</code> and <code>rest</code> come from unpacking the combined list, like <code>first, *rest = files</code>.</li>
</ul>
<p>JavaScript spells these <code>{...a, ...b}</code>, <code>[...a, ...b]</code> and <code>const [first, ...rest] = files</code>.
Objects destructure by <b>name</b>: <code>const { files } = result</code> is Python's <code>files = result["files"]</code>.
Workflows use this all the time to pull fields out of structured agent results.</p>`,
  hints: [
    'const { defaults, overrides, files, extra } = args',
    'const all = [...files, ...extra]; const [first, ...rest] = all',
  ],
  tests: [{
    name: 'merge and unpack',
    args: { defaults: { model: 'haiku', retries: 2, verbose: false }, overrides: { retries: 0, verbose: true }, files: ['a.py', 'b.py'], extra: ['c.py'] },
    expected: { config: { model: 'haiku', retries: 0, verbose: true }, files: ['a.py', 'b.py', 'c.py'], first: 'a.py', rest: ['b.py', 'c.py'] },
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
