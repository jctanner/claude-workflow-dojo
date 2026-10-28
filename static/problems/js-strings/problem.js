import { expectEqual } from '../_kit.js';

export default {
  tier: 0,
  title: 'split() Drops the Rest',
  difficulty: 'Medium',
  category: 'JS',
  goal: "Turn each log line into <code>{level, service, message}</code>, keeping the whole message even when it contains colons.",
  concepts: ['trim', 'split limit', 'indexOf/slice', 'join'],
  python: `level, rest = line.strip().split(" ", 1)      # maxsplit keeps the rest
service, message = rest.split(": ", 1)`,
  description: `
<p><code>args</code> is an array of log lines like <code>"  ERROR auth: token refresh failed: timeout "</code>.
Return <code>[{level, service, message}]</code>, for example
<code>{level: 'ERROR', service: 'auth', message: 'token refresh failed: timeout'}</code>.</p>
<ul>
  <li><code>.strip()</code> is <code>.trim()</code>. <code>in</code> is <code>.includes()</code>. <code>s[a:b]</code> is <code>s.slice(a, b)</code>.
  <code>s.find(x)</code> is <code>s.indexOf(x)</code>, which also returns -1.</li>
  <li>The trap: Python's <code>split(sep, 1)</code> keeps the rest of the string. JavaScript's
  <code>split(sep, 2)</code> <b>throws the rest away</b>: <code>'a b c'.split(' ', 2)</code> gives <code>['a', 'b']</code>.</li>
  <li>To split once, find the separator with <code>indexOf</code> and use <code>slice</code>. Or split fully and
  <code>join</code> the tail back: <code>const [first, ...rest] = s.split(' ')</code>, then <code>rest.join(' ')</code>.</li>
</ul>`,
  hints: [
    'const t = line.trim(); const sp = t.indexOf(" "); level = t.slice(0, sp); rest = t.slice(sp + 1)',
    'The message itself contains ": ", so split on the first one only.',
  ],
  tests: [{
    name: 'messages with colons',
    args: ['  ERROR auth: token refresh failed: timeout ', 'WARN billing api: retrying in 5s', 'INFO cdn: ok'],
    expected: [
      { level: 'ERROR', service: 'auth', message: 'token refresh failed: timeout' },
      { level: 'WARN', service: 'billing api', message: 'retrying in 5s' },
      { level: 'INFO', service: 'cdn', message: 'ok' },
    ],
  }].map(t => ({ ...t, check: r => expectEqual(r, t.expected) })),
};
