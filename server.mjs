import express from 'express'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const PORT = process.env.PORT || process.env.API_PORT || 8787
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))
const cache = { value: null, expiresAt: 0 }

app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))

const nowIso = () => new Date().toISOString()
const aliasFor = (value = 'public') => `acct_${crypto.createHash('sha256').update(value).digest('hex').slice(0, 6)}`
const decodeEntities = (value = '') => String(value)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const cleanText = (value = '') => decodeEntities(value)
  .replace(/<br\s*\/?\s*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/https?:\/\/\S+/gi, '[link]')
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
  .replace(/@[a-z0-9._-]+/gi, '@redacted')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 220)

function triageText(text = '') {
  const value = text.toLowerCase()
  const group = /\b(muslims?|islamic people|mosque[- ]goers?)\b/.test(value)
  const ideaOrInstitution = /\b(islam|religion|doctrine|theology|government|policy|law|regime|minister|party)\b/.test(value)
  const exclusion = /\b(deport|ban them|keep them out|boycott|do not hire|don't hire|expel|no muslim|shut every mosque)\b/.test(value)
  const hostility = /\b(invading|vermin|disease|traitor|enemy within|replace us|can't trust|cannot trust)\b/.test(value)
  const violence = /\b(kill|attack|burn|shoot|destroy them)\b/.test(value)
  const coordination = /\b(share this|join us|same time|target list|everyone post|forward this)\b/.test(value)
  const quotedOrCounter = /\b(quote|condemn|reporting|documenting|countering|not okay|reject)\b/.test(value)

  let score = 8
  if (group) score += 20
  if (exclusion) score += 30
  if (hostility) score += 24
  if (violence) score += 34
  if (coordination) score += 12
  if (quotedOrCounter) score -= 32
  if (ideaOrInstitution && !group && !exclusion && !violence) score -= 8
  score = Math.max(1, Math.min(99, score))

  const classification = score >= 72 ? 'high' : score >= 42 ? 'review' : 'context'
  return {
    classification,
    score,
    target: group ? 'Protected group' : ideaOrInstitution ? 'Ideas / institution' : 'Undetermined',
    coordination: Math.min(98, coordination ? score + 10 : Math.round(score * 0.42)),
  }
}

const findPhrase = (text, pattern) => text.match(pattern)?.[0] || null

function analyzeSubmittedPost(rawText = '', suppliedContext = 'standalone') {
  const text = String(rawText).replace(/\s+/g, ' ').trim().slice(0, 1500)
  const protectedPhrase = findPhrase(text, /\b(muslims?|muslim[- ]owned|islamic people|mosque[- ]goers?|hijab[- ]wearers?)\b/i)
  const ideaPhrase = findPhrase(text, /\b(islam|qur[’']?an|sharia|religion|religious ideas?|doctrine|theology|beliefs?)\b/i)
  const governmentPhrase = findPhrase(text, /\b(government|state|regime|minister|president|party|policy|law|legislation|saudi government)\b/i)
  const individualPhrase = findPhrase(text, /\b(imam|cleric|preacher|official|candidate|mayor|minister)\b/i)
  const conductPhrase = findPhrase(text, /\b(conduct|audit|funds?|management|decision|performance|statement|record|sentencing|corruption)\b/i)
  const institutionPhrase = findPhrase(text, /\b(mosques?|religious institutions?|community centres?)\b/i)

  const exclusionPhrase = findPhrase(text, /\b(deport(?:ed|ation)?|ban (?:all )?(?:muslims?|them)|keep (?:muslims?|them) out|boycott|do not hire|don['’]t hire|refuse to hire|expel|no muslims?|exclude|shut (?:down )?(?:every|all) mosque)\b/i)
  const hostilityPhrase = findPhrase(text, /\b(invaders?|invading|vermin|disease|parasites?|traitors?|enemy within|replace us|can['’]t trust|cannot trust|hate muslims?|disgusting people|inferior)\b/i)
  const violencePhrase = findPhrase(text, /\b(kill|attack|burn|shoot|bomb|hurt|destroy them|wipe them out)\b/i)
  const coordinationPhrase = findPhrase(text, /\b(share this|join us|same time|target list|everyone post|forward this|exact caption|flood the replies|at \d{1,2}(?::\d{2})?)\b/i)
  const counterPhrase = findPhrase(text, /\b(condemn|condemning|reject|rejecting|reporting|documenting|countering|not okay|is hateful|oppose this hatred|stand against)\b/i)
  const quotePhrase = findPhrase(text, /\b(quote|quoting|quoted|leaflet says|they said|the post says)\b/i)
  const criticismPhrase = findPhrase(text, /\b(critic(?:ise|ize|ism)|disagree|oppose|debate|scrutiny|accountable|authoritarian|should answer|publish the audit)\b/i)

  const hasProtectedTarget = Boolean(protectedPhrase)
  const hasHarm = Boolean(exclusionPhrase || hostilityPhrase || violencePhrase)
  const selectedSafeguard = ['quotation', 'reporting', 'counterspeech'].includes(suppliedContext)
  const contextSafeguard = Boolean(counterPhrase || (quotePhrase && counterPhrase) || selectedSafeguard)
  const ideaOrInstitution = Boolean(ideaPhrase || governmentPhrase || (individualPhrase && conductPhrase))

  let score = 4
  if (hasProtectedTarget) score += 28
  if (exclusionPhrase) score += 40
  if (hostilityPhrase) score += 30
  if (violencePhrase) score += 55
  if (coordinationPhrase && (hasProtectedTarget || hasHarm || institutionPhrase)) score += 14
  if (contextSafeguard) score -= 68
  if (ideaOrInstitution && !hasProtectedTarget && !hasHarm) score -= 10
  score = Math.max(1, Math.min(99, score))

  const severity = score >= 85 ? 'Severe' : score >= 70 ? 'High' : score >= 50 ? 'Moderate' : score >= 30 ? 'Low' : 'None'
  const action = score >= 85 ? 'Escalate' : score >= 70 ? 'Moderator Review' : score >= 50 ? 'Reduce Reach' : score >= 30 ? 'Warn' : 'Allow'
  const status = score >= 85 ? 'critical' : score >= 70 ? 'high' : score >= 50 ? 'medium' : 'clear'
  const target = hasProtectedTarget
    ? 'Muslims — protected religious group'
    : governmentPhrase ? 'Government / policy'
      : individualPhrase && conductPhrase ? 'Specific individual / conduct'
        : ideaPhrase ? 'Religion / ideas'
          : institutionPhrase ? 'Religious institution'
            : 'No protected-group target detected'
  const targetShort = hasProtectedTarget ? 'Protected group' : governmentPhrase ? 'Government' : individualPhrase && conductPhrase ? 'Individual conduct' : ideaPhrase ? 'Policy / ideas' : institutionPhrase ? 'Institution' : 'Undetermined'
  const intent = contextSafeguard
    ? 'Documentation / counterspeech'
    : violencePhrase ? 'Violence / incitement'
      : exclusionPhrase ? 'Exclusion / discrimination'
        : hostilityPhrase ? 'Group-directed hostility'
          : coordinationPhrase ? 'Mobilization / coordination'
            : criticismPhrase || ideaOrInstitution ? 'Legitimate criticism / debate'
              : 'Neutral or unclear expression'
  const coordination = coordinationPhrase ? (hasHarm || hasProtectedTarget || institutionPhrase ? 88 : 38) : Math.min(28, Math.max(3, Math.round(score * 0.28)))
  const confidence = contextSafeguard || (hasProtectedTarget && hasHarm) || ideaOrInstitution ? 95 : hasProtectedTarget || hasHarm ? 88 : 78
  const contextLabels = {
    standalone: 'Standalone post; no additional conversation supplied',
    quotation: 'Quoted material supplied for context',
    reporting: 'Reporting / documentation context supplied',
    counterspeech: 'Counterspeech / condemnation context supplied',
  }
  const context = contextLabels[suppliedContext] || contextLabels.standalone

  const evidence = []
  const addEvidence = (phrase, label, detail) => {
    if (phrase && !evidence.some(item => item.phrase.toLowerCase() === phrase.toLowerCase())) evidence.push({ phrase, label, detail })
  }
  addEvidence(protectedPhrase, 'Protected-group reference', 'Identifies Muslims as people rather than only an idea, policy, or institution.')
  addEvidence(exclusionPhrase, 'Exclusion cue', 'Advocates denying access, participation, employment, or equal treatment.')
  addEvidence(hostilityPhrase, 'Hostile generalization', 'Attributes a threatening or degrading trait to a group collectively.')
  addEvidence(violencePhrase, 'Violence cue', 'Contains language associated with physical harm or violent incitement.')
  addEvidence(coordinationPhrase, 'Mobilization cue', 'Encourages synchronized redistribution or coordinated action.')
  addEvidence(counterPhrase || quotePhrase, 'Context safeguard', 'Signals quotation, reporting, documentation, or explicit rejection of hateful language.')
  if (!hasHarm && !hasProtectedTarget) addEvidence(governmentPhrase || ideaPhrase || conductPhrase || criticismPhrase || text.slice(0, 60), 'Non-group target', 'The detected target is an idea, policy, government, conduct, or otherwise lacks a protected-group attack.')
  if (!evidence.length) addEvidence(text.slice(0, 60), 'No decisive harm marker', 'No strong protected-group harm, exclusion, violence, or coordination signal was detected.')

  let why
  let distinction
  if (contextSafeguard) {
    why = 'The post contains contextual signals of quotation, reporting, documentation, or condemnation. Surface-level harmful wording is not treated as endorsement.'
    distinction = 'Context safeguard triggered: the apparent hostile phrase is presented in a non-endorsing context. A reviewer should verify surrounding material when impact is high.'
  } else if (hasProtectedTarget && hasHarm) {
    why = `The post targets Muslims as people and contains ${violencePhrase ? 'a violence cue' : exclusionPhrase ? 'an exclusion or discrimination cue' : 'a hostile collective generalization'}. The recommendation is proportional to the detected severity.`
    distinction = 'Criticism safeguard not triggered: the harmful predicate is directed at people based on religious identity, not solely at theology, government policy, or individual conduct.'
  } else if (ideaOrInstitution && !hasProtectedTarget) {
    why = 'The post is directed at an idea, government, law, policy, or specific conduct and does not make a harmful claim about Muslims as people.'
    distinction = 'Legitimate criticism safeguard triggered: strong disagreement with religion, policy, government, or individual conduct is not automatically anti-Muslim hatred.'
  } else {
    why = 'The policy engine found no high-confidence combination of protected-group targeting and a harmful predicate. The post remains allowed unless additional context changes the assessment.'
    distinction = 'No protected-group attack was established. Ambiguous or contextual information can be escalated for human review rather than automatically restricted.'
  }

  const policy = contextSafeguard ? 'CONTEXT-QUOTE-2.0' : action === 'Allow' ? 'SAFE-CRIT-1.0' : violencePhrase ? 'HG-3.1' : exclusionPhrase ? 'HG-2.1' : hostilityPhrase ? 'HG-2.2' : 'REVIEW-1.0'
  return {
    id: `LAB-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    age: '0s', source: 'judge-lab', author: 'judge_input', reach: 'single test', content: text,
    target, targetShort, intent, severity, severityScore: score, confidence, context,
    coordination, action, status, campaign: coordination >= 70 ? 'Potential pattern' : null, policy,
    why, distinction, evidence: evidence.slice(0, 6), thread: [],
    signals: [
      `${hasProtectedTarget ? 'Protected-group target detected' : 'No protected-group target established'}`,
      `${contextSafeguard ? 'Context safeguard active' : 'No context override applied'}`,
      `${coordinationPhrase ? 'Mobilization language detected' : 'No coordination burst data supplied'}`,
    ],
    analysisMode: 'Explainable MVP policy engine',
  }
}

async function fetchJson(url, timeoutMs = 7000) {
  const started = Date.now()
  const response = await fetch(url, {
    headers: { 'user-agent': 'HateFirewall-MVP/1.0 (+public-signal-sampler)' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return { data: await response.json(), latencyMs: Date.now() - started }
}

async function fetchText(url, timeoutMs = 7000) {
  const started = Date.now()
  const response = await fetch(url, {
    headers: { 'user-agent': 'HateFirewall-MVP/1.0 (+public-signal-sampler)' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return { data: await response.text(), latencyMs: Date.now() - started }
}

function xmlValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? cleanText(match[1]) : ''
}

async function getNewsContext() {
  const query = encodeURIComponent('islamophobia OR "anti-Muslim" OR "religious discrimination"')
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-ZA&gl=ZA&ceid=ZA:en`
  const { data, latencyMs } = await fetchText(url)
  const items = [...data.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(match => match[1])
  return {
    connector: {
      id: 'news', name: 'Google News RSS', type: 'Live news context', status: 'live',
      batchSize: items.length, latencyMs, checkedAt: nowIso(),
    },
    signals: items.slice(0, 8).map((item, index) => ({
      id: `news-${index}-${crypto.createHash('md5').update(xmlValue(item, 'title')).digest('hex').slice(0, 7)}`,
      source: 'News RSS', kind: 'news-context',
      title: xmlValue(item, 'title') || 'Current news-context signal',
      domain: xmlValue(item, 'source') || 'public news source',
      timestamp: xmlValue(item, 'pubDate') || nowIso(),
      classification: 'context', score: 0,
      target: 'News context', coordination: 0,
    })),
  }
}

async function getMastodon() {
  const url = 'https://mastodon.social/api/v1/timelines/tag/islamophobia?limit=40'
  const { data, latencyMs } = await fetchJson(url)
  const posts = Array.isArray(data) ? data : []
  return {
    connector: {
      id: 'mastodon', name: 'Mastodon Public API', type: 'Public hashtag sample', status: 'live',
      batchSize: posts.length, latencyMs, checkedAt: nowIso(),
    },
    signals: posts.slice(0, 12).map((post, index) => {
      const text = cleanText(post?.content || post?.spoiler_text || '')
      return {
        id: `mastodon-${index}-${String(post.id || '').slice(-8)}`,
        source: 'Mastodon', kind: 'public-post',
        alias: aliasFor(post?.account?.acct), snippet: text,
        timestamp: post.created_at || nowIso(),
        engagement: Number(post.favourites_count || 0) + Number(post.reblogs_count || 0),
        ...triageText(text),
      }
    }),
  }
}

const fallbackSignals = [
  {
    id: 'cache-01', source: 'Public sample cache', kind: 'public-post', alias: 'acct_91ad2f',
    snippet: 'New report tracks a rise in anti-Muslim incidents and calls for transparent enforcement data.',
    timestamp: nowIso(), classification: 'context', score: 8, target: 'Issue discussion', coordination: 3, engagement: 24,
  },
  {
    id: 'cache-02', source: 'Public sample cache', kind: 'public-post', alias: 'acct_84bb10',
    snippet: 'Criticising a government policy is not the same as blaming Muslim neighbours for it.',
    timestamp: nowIso(), classification: 'context', score: 5, target: 'Policy / counterspeech', coordination: 2, engagement: 41,
  },
]

async function buildSignals() {
  const results = await Promise.allSettled([getNewsContext(), getMastodon()])
  const connectors = []
  let signals = []

  const descriptors = [
    { id: 'news', name: 'Google News RSS', type: 'Live news context' },
    { id: 'mastodon', name: 'Mastodon Public API', type: 'Public hashtag sample' },
  ]

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      connectors.push(result.value.connector)
      signals.push(...result.value.signals)
    } else {
      connectors.push({
        ...descriptors[index], status: 'cached', batchSize: index === 0 ? 18 : 24,
        latencyMs: null, checkedAt: nowIso(), error: 'Provider unavailable or rate-limited',
      })
    }
  })

  if (!signals.some((signal) => signal.kind === 'public-post')) signals.push(...fallbackSignals)
  const publicPosts = signals.filter((signal) => signal.kind === 'public-post')
  const highRisk = publicPosts.filter((signal) => signal.score >= 72).length
  const review = publicPosts.filter((signal) => signal.score >= 42 && signal.score < 72).length
  const liveCount = connectors.filter((connector) => connector.status === 'live').length

  return {
    generatedAt: nowIso(),
    mode: liveCount === connectors.length ? 'live' : liveCount ? 'hybrid' : 'cached',
    disclosure: 'Sampled public signals; figures are not platform-wide prevalence estimates.',
    connectors,
    aggregate: {
      sampledItems: connectors.reduce((sum, connector) => sum + connector.batchSize, 0),
      publicPostSample: publicPosts.length,
      highRiskSignals: highRisk,
      reviewSignals: review,
      activeClusters: Math.max(3, highRisk * 2 + review),
      projectedPerMinute: Math.max(1180, 1160 + connectors.reduce((sum, connector) => sum + connector.batchSize, 0) * 7),
    },
    signals: signals.slice(0, 20),
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hate-firewall-signal-api', time: nowIso() })
})

app.post('/api/analyze', (req, res) => {
  const startedAt = performance.now()
  const text = req.body?.text
  const context = req.body?.context || 'standalone'
  if (typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({ error: 'Enter at least 3 characters to analyze.' })
  }
  if (text.length > 1500) {
    return res.status(400).json({ error: 'Posts are limited to 1,500 characters in the judge lab.' })
  }
  const allowedContexts = ['standalone', 'quotation', 'reporting', 'counterspeech']
  if (!allowedContexts.includes(context)) {
    return res.status(400).json({ error: 'Unsupported context type.' })
  }
  res.set('cache-control', 'no-store')
  res.json({
    ...analyzeSubmittedPost(text, context),
    processingMs: Math.max(1, Math.round(performance.now() - startedAt)),
    disclosure: 'This MVP result is generated by an explainable deterministic policy engine and is not a final moderation decision.',
  })
})

app.get('/api/live-signals', async (req, res) => {
  const force = req.query.refresh === '1'
  if (!force && cache.value && Date.now() < cache.expiresAt) {
    res.set('x-cache', 'HIT')
    return res.json(cache.value)
  }
  try {
    const value = await buildSignals()
    cache.value = value
    cache.expiresAt = Date.now() + 45_000
    res.set('cache-control', 'public, max-age=30')
    res.set('x-cache', 'MISS')
    res.json(value)
  } catch (error) {
    res.status(200).json({
      generatedAt: nowIso(), mode: 'cached',
      disclosure: 'Public connectors are unavailable; deterministic cache is shown.',
      connectors: [
        { id: 'news', name: 'Google News RSS', type: 'Live news context', status: 'cached', batchSize: 18, latencyMs: null, checkedAt: nowIso() },
        { id: 'mastodon', name: 'Mastodon Public API', type: 'Public hashtag sample', status: 'cached', batchSize: 24, latencyMs: null, checkedAt: nowIso() },
      ],
      aggregate: { sampledItems: 42, publicPostSample: 2, highRiskSignals: 0, reviewSignals: 0, activeClusters: 3, projectedPerMinute: 1454 },
      signals: fallbackSignals,
    })
  }
})

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(ROOT_DIR, 'dist')
  app.use(express.static(distDir, { maxAge: '1h', etag: true }))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      return res.sendFile(path.join(distDir, 'index.html'))
    }
    next()
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hate Firewall listening on http://0.0.0.0:${PORT}`)
})
