import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeSubmittedPost } from '../server.mjs'

const analyze = (text, context = 'standalone') => analyzeSubmittedPost(text, context)

const allowCases = [
  ['neutral identity mention', 'Muslims across the city are preparing to celebrate Eid.'],
  ['anti-generalization', 'Muslims are not a monolith and deserve equal treatment.'],
  ['religious criticism', 'I disagree with Islam and think this doctrine is mistaken.'],
  ['policy criticism', 'The proposed blasphemy law restricts free expression and should be repealed.'],
  ['government criticism', "The Saudi government's sentencing policy is authoritarian."],
  ['individual conduct', 'That imam should publish the audit of the charity funds.'],
  ['unrelated neutral speech', 'The city should add more buses during rush hour.'],
]

for (const [name, text] of allowCases) {
  test(`allows ${name}`, () => {
    const result = analyze(text)
    assert.equal(result.action, 'Allow')
    assert.ok(result.severityScore < 30, `unexpected score ${result.severityScore}`)
  })
}

test('does not treat a protected-group mention as harm by itself', () => {
  const result = analyze('Muslims live in communities around the world.')
  assert.equal(result.action, 'Allow')
  assert.equal(result.severity, 'None')
  assert.equal(result.targetShort, 'Protected group')
})

test('flags explicit group exclusion', () => {
  const result = analyze('No Muslims should be hired for public-facing jobs.')
  assert.equal(result.action, 'Moderator Review')
  assert.equal(result.severity, 'High')
  assert.ok(result.evidence.some(item => item.label === 'Exclusion cue'))
})

test('escalates group exclusion paired with mobilization', () => {
  const result = analyze('No Muslims should be hired. Share this with every employer.')
  assert.equal(result.action, 'Escalate')
  assert.equal(result.severity, 'Severe')
  assert.equal(result.coordination, 88)
})

test('flags group-directed hostility', () => {
  const result = analyze('I hate Muslims and cannot trust them.')
  assert.equal(result.action, 'Moderator Review')
  assert.equal(result.severity, 'High')
})

test('escalates a group-directed violence cue', () => {
  const result = analyze('Attack Muslims when they gather.')
  assert.equal(result.action, 'Escalate')
  assert.equal(result.severity, 'Severe')
})

test('allows explicit counterspeech despite quoted exclusion', () => {
  const result = analyze('Quoting a leaflet: “Keep Muslims out.” This message is hateful and we reject it.', 'counterspeech')
  assert.equal(result.action, 'Allow')
  assert.equal(result.policy, 'CONTEXT-QUOTE-2.0')
})

test('allows reporting context while exposing the safeguard', () => {
  const result = analyze('The report documents posters saying no Muslims are welcome.', 'reporting')
  assert.equal(result.action, 'Allow')
  assert.match(result.distinction, /Context safeguard/i)
})

test('quotation alone lowers but does not erase harmful risk', () => {
  const result = analyze('Quoting the post: “No Muslims should be hired.”', 'quotation')
  assert.notEqual(result.action, 'Allow')
  assert.ok(result.severityScore >= 30)
})

test('detects operational coordination aimed at an institution', () => {
  const result = analyze('Flood the replies at 9. Use the mosque image and exact caption.')
  assert.equal(result.action, 'Reduce Reach')
  assert.equal(result.coordination, 88)
  assert.equal(result.campaign, null)
  assert.match(result.signals.join(' '), /no graph corroboration/i)
})

test('returns the complete investigation contract', () => {
  const result = analyze('No Muslims should be hired.')
  for (const key of ['id', 'target', 'intent', 'severity', 'severityScore', 'confidence', 'context', 'coordination', 'action', 'policy', 'why', 'distinction', 'evidence', 'signals']) {
    assert.ok(Object.hasOwn(result, key), `missing ${key}`)
  }
  assert.ok(Array.isArray(result.evidence) && result.evidence.length > 0)
})
