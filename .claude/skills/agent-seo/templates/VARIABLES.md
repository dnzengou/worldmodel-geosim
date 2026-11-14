# Template variables

Replace these in every template file before writing to the target site.

| Placeholder | Meaning | Example |
|---|---|---|
| `{{SITE_NAME}}` | Brand name | `2030 GeoSim` |
| `{{SITE_TAGLINE}}` | One-line pitch | `Agent-native geopolitical risk engine` |
| `{{SITE_DESCRIPTION}}` | 1–2 sentence description | `Open-source Monte Carlo geopolitical simulator with a public JSON API.` |
| `{{CANONICAL_URL}}` | Root URL, no trailing slash | `https://worldmodel-geosim.vercel.app` |
| `{{REPO_URL}}` | Source repo | `https://github.com/dnzengou/worldmodel-geosim` |
| `{{OG_IMAGE_URL}}` | Open Graph image | `{{CANONICAL_URL}}/og-cover.svg` |
| `{{FEATURES}}` | Bullet list of features | see `llms.txt.tmpl` |
| `{{ENDPOINTS}}` | API endpoint table | see `llms-full.txt.tmpl` |
| `{{FAQ}}` | FAQ Q/A pairs for JSON-LD + about.html | see `faq.json.tmpl` |
| `{{CONTACT_EMAIL}}` | Security disclosure contact | `security@example.com` |
| `{{CATEGORY}}` | Schema.org applicationCategory | `BusinessApplication`, `SimulationApplication`, `DeveloperApplication` |
| `{{LICENSE_URL}}` | License link | `{{REPO_URL}}/blob/main/LICENSE` |
| `{{VERSION}}` | semver | `2.4.0` |

## Minimum set for a credible deploy

Fill at least: `SITE_NAME`, `SITE_TAGLINE`, `SITE_DESCRIPTION`, `CANONICAL_URL`, `CONTACT_EMAIL`, `CATEGORY`, and one `FAQ` entry.
