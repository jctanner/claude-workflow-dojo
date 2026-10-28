import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: "Empty Isn't False",
  difficulty: 'Easy',
  category: 'JS',
  goal: "Return two lists of ids: results with at least one finding, and results with non-empty notes.",
  concepts: ['truthiness', '[] and {} are truthy', '.length'],
  python: `with_findings = [r["id"] for r in args if r["findings"]]   # [] is falsy in Python
with_notes = [r["id"] for r in args if r["notes"]]`,
  description: `
<p><code>args</code> is an array of results <code>{id, findings, notes}</code>. Return
<code>{withFindings, withNotes}</code>: the ids whose <code>findings</code> array is non-empty, and the ids whose
<code>notes</code> string is non-empty.</p>
<p>In Python, empty containers are falsy. In JavaScript they are <b>not</b>:</p>
<ul>
  <li>Falsy: <code>false</code>, <code>0</code>, <code>''</code>, <code>null</code>, <code>undefined</code>, <code>NaN</code>. Nothing else.</li>
  <li><code>[]</code> and <code>{}</code> are <b>truthy</b>. Test <code>arr.length &gt; 0</code> or <code>Object.keys(obj).length &gt; 0</code>.</li>
  <li>The empty string <i>is</i> falsy, as in Python.</li>
</ul>
<p>Workflow agents often return <code>{findings: []}</code>. <code>if (result.findings)</code> is always true.</p>`,
  hints: ['r.findings.length > 0', "Strings behave like Python, so r.notes works (or r.notes !== '')"],
  tests: [{
    name: 'mixed',
    args: [
      { id: 'a', findings: ['x'], notes: '' },
      { id: 'b', findings: [], notes: 'looked fine' },
      { id: 'c', findings: ['y', 'z'], notes: 'two issues' },
      { id: 'd', findings: [], notes: '' },
    ],
    expected: { withFindings: ['a', 'c'], withNotes: ['b', 'c'] },
  }].map(t => ({
    ...t,
    check: r => (r && Array.isArray(r.withFindings) && r.withFindings.length === 4
      ? 'withFindings kept every id: an empty array [] is truthy in JavaScript. Check .length.'
      : expectEqual(r, t.expected)),
  })),
};
