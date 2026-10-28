import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'try/except Is try/catch',
  difficulty: 'Easy',
  category: 'JS',
  goal: "Add up <code>count</code> from the JSON strings that parse, and list the indexes of the ones that don't.",
  concepts: ['try/catch', 'throw', 'error.message'],
  python: `total, bad = 0, []
for i, raw in enumerate(args):
    try:
        total += json.loads(raw)["count"]
    except (ValueError, KeyError) as e:
        bad.append(i)`,
  description: `
<p><code>args</code> is an array of JSON strings, and some of them are broken. Sum the <code>count</code> field of the valid
ones. Return <code>{total, bad}</code>, where <code>bad</code> lists the indexes that failed to parse.</p>
<ul>
  <li><code>try { … } catch (e) { … }</code> is <code>try/except</code>. There's no exception type in <code>catch</code>:
  it catches <b>everything</b>, so inspect <code>e.message</code> if you need to tell errors apart.</li>
  <li><code>raise ValueError("x")</code> is <code>throw new Error('x')</code>. <code>finally</code> is the same.</li>
  <li><code>JSON.parse</code> throws on bad input, like <code>json.loads</code>.</li>
</ul>
<p>In workflows you rarely need this inside <code>parallel()</code>: a thunk that throws resolves to <code>null</code> automatically.</p>`,
  hints: ['for (const [i, raw] of args.entries()) { try { … } catch (e) { bad.push(i) } }'],
  tests: [{
    name: 'some broken',
    args: ['{"count": 2}', '{count: 3}', '{"count": 5}', 'not json'],
    expected: { total: 7, bad: [1, 3] },
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
