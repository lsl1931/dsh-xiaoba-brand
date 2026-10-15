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

import { DEFAULTS, resolveOptions } from "./brand-defaults.js";

/** Page global the client half reads. */
const GLOBAL_NAME = "__DSH_XIAOBA_BRAND__";


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
