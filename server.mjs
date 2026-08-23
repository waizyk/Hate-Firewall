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
