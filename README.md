# dsh-xiaoba-brand

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) web-UI plugin that
replaces the brand presentation in the sidebar and on the welcome hero with your own mark and
wordmark, and rewrites the hero copy. **Everything is configurable.**

With it installed, these spots change:

| Where | Stock | Becomes |
|---|---|---|
| Sidebar top-left mark | DeepSeek whale | Your artwork (the bundled mark by default) |
| Sidebar top-left text | `deepseek` + HARNESS badge | Your name + **the HARNESS badge, untouched** |
| Hero mark | Animated whale | Your artwork |
| Hero headline | 探索未至之境 | Your headline |
| Hero badge | 预览版 | Your badge text |

## Install

Two ways; both use `~/.dsh/profiles/web` as the profile directory
(the desktop build uses `%APPDATA%\dsh-desktop\harness\profiles\web`).

### A. `link:` (development: source edits take effect immediately)

```bash
git clone https://github.com/lsl1931/dsh-xiaoba-brand.git ~/dsh-xiaoba-brand
cd ~/dsh-xiaoba-brand && node tools/build.mjs
```

Add the dependency and bundle to the profile's `package.json`:

```json
{
  "dependencies": {
    "dsh-xiaoba-brand": "link:/home/you/dsh-xiaoba-brand"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "...",
        "dsh-xiaoba-brand"
      ]
    }
  }
}
```

Then link it into the profile's module directory:

```bash
ln -s ~/dsh-xiaoba-brand ~/.dsh/profiles/web/node_modules/dsh-xiaoba-brand
```

### B. `file:` (snapshot copy)

Use `file:/absolute/path/dsh-xiaoba-brand` instead of `link:` when you do not want the source
read live.

### Restart

```bash
pkill -f 'dsh web'
dsh web --no-open --port 3080
```

With HMR enabled, a `cordis.patch.yml`-only change reloads on its own; otherwise restart.

## Configuration

All options live in the profile's `cordis.patch.yml`. **Every key is optional**; the parenthesised
value is the default.

```yaml
- insert:
    - id: dsh-xiaoba-brand
      name: 'dsh-xiaoba-brand'
      config:
        sidebarMarkScale: 1.5      # (1.5) sidebar mark multiplier; the slot asks for 24px
        heroMarkScale: 2           # (2)   hero mark multiplier; the slot asks for 34px
        wordmarkScale: 1.5         # (1.5) "name + HARNESS badge" multiplier
        headline: 'Your headline'  # ("")  hero headline; empty keeps the stock copy
        previewBadge: 'Your badge' # ("")  hero badge; empty keeps the stock copy
        sourceHeadline: '探索未至之境'    # (探索未至之境) stock headline to replace
        sourcePreviewBadge: '预览版'      # (预览版)     stock badge to replace
```

Notes:

- An empty `headline` / `previewBadge` **keeps** the DSH copy; it does not blank it.
- `sourceHeadline` / `sourcePreviewBadge` must match the copy DSH actually renders, exactly.
  When an upgrade changes that copy, update these.
- Scales are multipliers. The sidebar slot passes 24px, so `1.5` renders 36px; the hero passes
  34px, so `2` renders 68px.

## Use your own artwork and name

### Swap the mark

Replace `assets/xiaoba.svg` and rebuild:

```bash
node tools/build.mjs
```

Requirements:

- Plain SVG, with **no** `<style>`, `<mask>` or `<clipPath>` (it is inlined into an `<svg>`)
- No backtick, `${` or backslash (the build asserts on these so it cannot emit an unparseable file)
- Self-coloured; do not rely on `currentColor` if the artwork is multicolour

### Swap the name wordmark

The wordmark is **vector outlines**, not text. The one in this repo
(`assets/wordmark-linhaoming.path.txt`) was generated from **Segoe UI Bold** — see
"Licensing and provenance" below.

To use another name, regenerate the outlines with any text-to-path tool:

- Inkscape: Path > Object to Path, save as plain SVG, lift the `d` attributes
- `fonttools` + `svgpathtools`
- FontForge

Then:

1. Write the path into `assets/wordmark-linhaoming.path.txt`
2. Adjust `LINHAO_TRANSFORM` in `tools/build.mjs` (`translate(tx ty) scale(s)`) to fit it into the
   box the stock `deepseek` wordmark occupied
3. `node tools/build.mjs`

The stock `deepseek` wordmark occupies `x 26.956..121.517` with height `17.015` (viewBox units),
and the HARNESS badge starts at `x=129.348`. Fit the new outlines into that box and the badge
position and its 7.83-unit gap stay unchanged.

## How it works

### Three slots

DSH's brand is slot-driven, so this plugin **modifies no DSH source**:

| Slot | Occupied by | This plugin |
|---|---|---|
| `sidebar.brand.mark` | `dsh-client-ui-brand-official` (priority 0) | overrides at `priority: -1` |
| `sidebar.brand.name` | same | overrides at `priority: -1` |
| `conversation.hero.brand.mark` | nobody (the official build deliberately leaves the animated-whale fallback) | registers directly |

For `kind: "single"` slots the registry's rule is *a second registration at the same priority
throws, and the lowest priority renders*, so `-1` cleanly shadows the official brand without
touching that package.

### Why the HARNESS badge survives

The official wordmark is a single SVG: whale + seven `deepseek` glyphs + a rounded badge rect +
seven white HARNESS glyphs clipped into it. This plugin drops **only the name glyphs**; the badge
rect, the HARNESS glyphs and their theme-token fills are carried over verbatim, so the badge keeps
the official artwork and tokens.

### How configuration reaches the browser

A client plugin cannot read `cordis.patch.yml`. The Host half listens on
`webserver/index-inject` and pushes the resolved options as a page global, and the client half
reads `globalThis.__DSH_XIAOBA_BRAND__` — the same channel the official
`dsh-client-ui-sidebar-documentpreview` uses.

### Why the hero copy is patched in the DOM

`hero.headline` / `hero.preview` are i18n strings owned by `dsh-client-ui-conversation`, and
`LocaleRuntime.register` throws on a second registration for an existing namespace locale, so the
copy cannot be overridden through the locale service. It is rewritten in the DOM instead: only
inside the hero `_titleGroup`, and only on an **exact** match of the stock string — never a
substring match.

### Why a stylesheet is injected

The sidebar pins its identity block with a fixed height inside a clipping parent
(`.brandIdentity{height:24px}` within `.brand{overflow:hidden}`), so an enlarged SVG alone would
be cropped. The plugin injects a few rules that lift those two constraints.

## Development

```bash
node tools/build.mjs     # generate lib/ from src/ + assets/
node --check lib/client.js
```

- `src/client.template.js` — browser half (config, slot wiring, DOM patch, styles)
- `src/index.js` — Node half (validates and injects the config)
- `tools/build.mjs` — build script, zero dependencies
- `assets/` — inlined assets
- `lib/` — **generated; do not edit**

**Zero runtime dependencies**: nothing imports a kernel package, so a plain `link:` install works.

## Compatibility

- Built and verified against `@deepseek-ai/dsh` **0.1.6-alpha.2**
- Depends on the slot names `sidebar.brand.mark`, `sidebar.brand.name`,
  `conversation.hero.brand.mark` and on CSS class suffixes such as `_titleGroup` /
  `_brandIdentity`. If DSH changes them, the plugin needs an update.
- DSH is in developer preview; breaking changes are expected.

## Licensing and provenance

This project is MIT-licensed (see [LICENSE](LICENSE)), but note the provenance of the bundled
assets:

| Asset | Source | Note |
|---|---|---|
| `assets/xiaoba.svg` | Uploaded by the provider; a VTracer raster trace | Confirm you hold the rights to redistribute the artwork |
| `assets/wordmark-linhaoming.path.txt` | **Segoe UI Bold** glyph outlines | **A Microsoft font. Redistributing glyph outlines may be restricted by its EULA** — verify before commercial use, or regenerate from an open font (e.g. Inter, Noto Sans, OFL) |
| `assets/harness-badge.json` | Lifted from the official wordmark in `@deepseek-ai/dsh-client-ui-primitives` | Carried over only to keep the badge identical; copyright remains with DeepSeek |

**Recommendation**: for commercial or wide distribution, regenerate the wordmark from an
open-licensed font and substitute artwork you own.
