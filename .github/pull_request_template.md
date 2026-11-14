## Summary

<!-- 1–3 bullet points of what changed and why. -->

## Scope

- [ ] Simulation core (`src/simulation/*`)
- [ ] API (`api/index.py`)
- [ ] Frontend SPA (`public/*`)
- [ ] Agent-discovery files (`public/robots.txt`, `llms.txt`, `agent.json`, `.well-known/*`)
- [ ] Docs / README
- [ ] Deployment (`vercel.json`)

## Test plan

- [ ] Local lint / type / unit checks pass
- [ ] `curl /api/health` returns ok against a preview deploy
- [ ] Manual smoke: load `/`, run a scenario, open `/globe`
- [ ] Agent files still valid: `jq . public/agent.json`, `xmllint --noout public/sitemap.xml`

## Risk

<!-- What breaks if this lands wrong? Any rollback plan? -->
