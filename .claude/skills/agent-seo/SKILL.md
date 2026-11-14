---
name: agent-seo
description: Make a website discoverable, callable, and citable by AI agents (ChatGPT, Claude, Perplexity, Gemini, Copilot, Kagi, Mistral, DeepSeek, You.com, Diffbot, Meta AI) as well as classic search. Installs the Generative Engine Optimization (GEO) stack — robots.txt (25+ bot allowlist), sitemap.xml, llms.txt / llms-full.txt, .well-known/ai-plugin.json, .well-known/security.txt, agent.json, ai.txt, humans.txt, JSON-LD structured data (WebSite + SoftwareApplication + Organization + FAQPage + HowTo), Open Graph + Twitter Card, canonical, and a crawler-visible static surface for JS-heavy SPAs. Use when the user asks for SEO, AI SEO, GEO, agent discoverability, LLM discoverability, "make the site agent-friendly", "get indexed by ChatGPT/Perplexity", or similar.
---

# agent-seo — Generative Engine Optimization kit

A drop-in SEO layer that targets both classic search engines **and** the new
class of AI-agent crawlers and answer engines. Modular, lightweight, no
runtime dependencies.

## When to use

- A new or existing website needs to be discovered by AI answer engines
  (ChatGPT search, Perplexity, Claude citations, Gemini, Copilot, You.com,
  Kagi, Mistral, DeepSeek, Meta AI).
- A product has a public JSON API that should be callable by LLM tools and
  autonomous agents without ceremony.
- A JS-heavy SPA renders almost nothing without JavaScript and is therefore
  invisible to many LLM crawlers.
- A B2B/SaaS site wants cite-worthiness and trust signals.

## What it installs

| Path | Purpose |
|---|---|
| `robots.txt` | Explicit `Allow:` for 25+ bots (classic + AI). Reference to sitemap. |
| `sitemap.xml` | Canonical URL set, including agent-facing endpoints. |
| `llms.txt` | Jeremy Howard's compact agent-readable site summary. |
| `llms-full.txt` | Full agent documentation in one plain-text file. |
| `.well-known/ai-plugin.json` | OpenAI-style plugin manifest. |
| `.well-known/security.txt` | Disclosure contact — trust signal. |
| `agent.json` | Generic agent manifest with typed capabilities. |
| `ai.txt` | Content-usage statement for AI training & RAG. |
| `humans.txt` | Authorship/team signal. |
| `about.html` | Dense, static, SSR-friendly methodology/FAQ page — the GEO win for SPAs. |
| `og-cover.svg` | Inline Open Graph image (no external deps). |

Plus edits to `index.html` for Open Graph / Twitter Card / JSON-LD / crawler-visible content block, and a hosting config (`vercel.json`, `netlify.toml`, or an nginx snippet) for the right Content-Type and CORS on the discovery files.

## How to run

1. **Inventory**. Read the site's current `index.html`, routing (SPA? SSR?), hosting (`vercel.json` / `netlify.toml` / Cloudflare / nginx), and primary product page. Note the canonical domain.
2. **Fill the templates** in `templates/` with the site's real brand name, tagline, canonical URL, product description, feature list, scenarios/endpoints, and FAQ Q&A. See `templates/VARIABLES.md` for the full placeholder list.
3. **Write files** into the site's public/output directory (commonly `public/`, `static/`, `dist/`, `out/`, or the repo root).
4. **Patch `index.html`** per `templates/index-head.html` and `templates/crawler-surface.html`. Keep the existing `<title>` style; add JSON-LD and OG tags; add a hidden-but-indexable content block for SPAs.
5. **Hosting headers**: ensure `.txt` files serve as `text/plain`, `agent.json` and `ai-plugin.json` as `application/json`, with `Access-Control-Allow-Origin: *`. Template at `templates/vercel.json.partial`.
6. **Verify**:
   ```
   curl -I https://<site>/robots.txt       # text/plain
   curl    https://<site>/llms.txt         # 200 + content
   curl    https://<site>/.well-known/ai-plugin.json | jq .
   curl    https://<site>/sitemap.xml      | head
   ```
   Then run Google Rich Results Test and Schema.org validator on the home URL.

## Why each file matters

- **robots.txt** — AI crawlers *do* respect it; many sites unintentionally block GPTBot/ClaudeBot via a default `Disallow: /`. Being explicit flips an inherited "no" into a documented "yes".
- **llms.txt / llms-full.txt** — the emerging Markdown-over-HTTP contract for LLM retrieval. Compact, link-dense, agent-first.
- **JSON-LD @graph** — Google, Bing, and the AI answer engines pull `FAQPage`, `HowTo`, `SoftwareApplication` and `Organization` nodes directly into answer boxes and citations.
- **.well-known/ai-plugin.json** — originally the ChatGPT plugin manifest, now reused by multiple agent frameworks as a convention for endpoint discovery.
- **agent.json** — a lighter-weight, framework-neutral manifest; capabilities are typed.
- **About page (dense static HTML)** — the single biggest GEO lever for SPAs: LLM crawlers that don't execute JS see nothing on the SPA home but the whole product on a dense static page.
- **Open Graph / Twitter Card** — governs how the link renders when shared; shared links drive the backlinks that feed classic SEO.
- **security.txt / humans.txt / ai.txt** — low-effort trust signals with outsized credibility weight in LLM "is this site reputable?" heuristics.

## Trust & compliance

- No cloaking: the crawler-visible content block contains the same facts as
  the rendered SPA, just in semantic HTML.
- No deceptive schema: structured data must describe what's actually on the
  page. Fabricated `aggregateRating` or `Review` nodes can trigger manual
  action from Google.
- No hidden keyword stuffing. The hidden block is positioned off-screen but
  not keyword-dense; it mirrors the visible product.
- `ai.txt` and `robots.txt` grants are affirmative permission, not implied.

## Variables

See `templates/VARIABLES.md` for every placeholder the templates use.

## Reference implementation

This repo (`worldmodel-geosim`) ships a working deployment — see
`public/robots.txt`, `public/llms.txt`, `public/agent.json`,
`public/.well-known/ai-plugin.json`, `public/about.html`, and
`public/index.html` for a concrete example.
