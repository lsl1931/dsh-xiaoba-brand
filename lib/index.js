// dsh-xiaoba-brand host half.
//
// The plugin contributes browser presentation only, but the client half needs
// configuration, and a client plugin cannot read cordis.patch.yml directly. The
// Host therefore publishes the resolved options into every rendered page as a
// global, the same channel @deepseek-ai/dsh-client-ui-sidebar-documentpreview
// uses:
//
//   host:   ctx.on("webserver/index-inject", (table) => table.push({...}))
//   client: globalThis.__DSH_XIAOBA_BRAND__
//
// The row is emitted on every index render, so it always reflects the options
// the Loader resolved for this entry.
//
// No schema dependency on purpose: validation lives in `resolveOptions` below
// so the plugin stays zero-dependency and can be installed with a plain
// `link:` reference. Every field is optional; a deployment that writes nothing
// in cordis.patch.yml still gets a working brand replacement.

/** Page global the client half reads. */
const GLOBAL_NAME = "__DSH_XIAOBA_BRAND__";

/** Defaults, mirroring src/client.template.js. */
const DEFAULTS = {
  sidebarMarkScale: 1.5,
  heroMarkScale: 2,
  wordmarkScale: 1.5,
  headline: "",
  previewBadge: "",
  sourceHeadline: "探索未至之境",
  sourcePreviewBadge: "预览版"
};

/**
 * Coerce one raw option value onto its default.
 * @param key - option name, which selects the expected type.
 * @param value - raw value from cordis.patch.yml, possibly undefined.
 * @returns the value when it is usable, otherwise the default.
 */
function coerce(key, value) {
  const fallback = DEFAULTS[key];
  if (typeof fallback === "number") {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return typeof value === "string" ? value : fallback;
}

/**
 * Resolve raw entry options into the object published to the page.
 * @param raw - the Loader-resolved config for this entry, possibly absent.
 * @returns every option, with defaults filled in.
 */
function resolveOptions(raw) {
  const source = raw !== null && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of Object.keys(DEFAULTS)) out[key] = coerce(key, source[key]);
  return out;
}

/**
 * Publish the resolved brand options into browser pages.
 * @param ctx - Host context serving browser pages.
 * @param config - options written in this entry's cordis.patch.yml.
 */
export function apply(ctx, config) {
  const options = resolveOptions(config);
  ctx.on("webserver/index-inject", (table) => {
    table.push({ kind: "global", name: GLOBAL_NAME, value: options });
  });
}

export { DEFAULTS, GLOBAL_NAME, resolveOptions };
