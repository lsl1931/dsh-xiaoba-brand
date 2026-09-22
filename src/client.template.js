// dsh-xiaoba-brand client half: config-driven brand replacement for the Web UI.
//
// Three slot registrations replace the DeepSeek brand presentation, and a narrow
// DOM patch rewrites the conversation hero copy:
//
//   sidebar.brand.mark            -> configured mark   (priority -1 shadows brand-official)
//   sidebar.brand.name            -> configured wordmark
//   conversation.hero.brand.mark  -> configured mark   (unoccupied; replaces the fish fallback)
//
// Written JSX-free (React.createElement) and in CJS export form so that
// tools/build.mjs can wrap it in the factory-form CJS the client module system
// consumes (window.__ModuleLoader__.load). The only bare import is \`react\`,
// which the shell seeds in its frozen platform module table.
//
// Configuration arrives through a Host-injected page global, the same channel
// dsh-client-ui-sidebar-documentpreview uses: the Node half listens on
// \`webserver/index-inject\` and pushes an object whose keys normalize here.
// Every field falls back to a default, so a deployment that writes nothing in
// cordis.patch.yml still gets a working brand replacement.

var React = require("react");
var h = React.createElement;
var useEffect = React.useEffect;

var NS = "dsh-xiaoba-brand";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Defaults applied when the Host injects nothing or a partial object. */
var DEFAULTS = {
  // Mark scale multipliers. The slot hands the mark a nominal size (24 in the
  // sidebar, 34 in the hero); these grow it from that baseline.
  sidebarMarkScale: 1.5,
  heroMarkScale: 2,
  wordmarkScale: 1.5,
  // Hero copy. Empty strings leave the stock text untouched.
  headline: "",
  previewBadge: "",
  // Stock hero strings this plugin rewrites. Change these only if the upstream
  // default copy changes.
  sourceHeadline: "探索未至之境",
  sourcePreviewBadge: "预览版"
};

function readConfig() {
  var injected = typeof globalThis === "undefined" ? undefined : globalThis.__DSH_XIAOBA_BRAND__;
  var out = {};
  for (var k in DEFAULTS) out[k] = DEFAULTS[k];
  if (injected === null || typeof injected !== "object") return out;
  for (var key in DEFAULTS) {
    var v = injected[key];
    if (typeof DEFAULTS[key] === "number") {
      if (typeof v === "number" && isFinite(v) && v > 0) out[key] = v;
    } else if (typeof v === "string") {
      if (typeof v === "string") out[key] = v;
    }
  }
  return out;
}

var CONFIG = readConfig();

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

/** The configured mark at a slot-requested base size. */
function XiaobaMark(props) {
  var base = props.size === undefined ? 24 : props.size;
  var size = Math.round(base * CONFIG.sidebarMarkScale);
  return h("svg", {
    width: size,
    height: size,
    viewBox: XIAOBA_VIEWBOX,
    className: props.className,
    "aria-hidden": "true",
    dangerouslySetInnerHTML: { __html: XIAOBA_INNER }
  });
}

/** The hero mark, enlarged independently of the sidebar one. */
function XiaobaHeroMark(props) {
  var base = props.size === undefined ? 34 : props.size;
  var size = Math.round(base * CONFIG.heroMarkScale);
  return h("svg", {
    width: size,
    height: size,
    viewBox: XIAOBA_VIEWBOX,
    className: props.className,
    "aria-hidden": "true",
    dangerouslySetInnerHTML: { __html: XIAOBA_INNER }
  });
}

// ---------------------------------------------------------------------------
// Wordmark: the replacement name followed by the original HARNESS badge.
//
// The stock brand is one SVG (viewBox 182x24) holding the whale, seven
// "deepseek" glyphs, a rounded badge rect and seven white HARNESS glyphs clipped
// to it. Only the name glyphs are dropped here: the badge rect, the HARNESS
// glyphs and their theme-token fills are carried over verbatim, so the badge
// keeps the exact official artwork.
//
// Geometry: the replacement glyphs were fitted to the SAME box the stock name
// occupied (x 26.956..121.517, height 17.015), so the badge does not move and
// the original 7.83u gap before it is preserved. Regenerate through
// tools/build.mjs if the name outline changes.
// ---------------------------------------------------------------------------

var BADGE_INVERTED = "var(--dsw-alias-label-primary-inverted)";

function XiaobaWordmark(props) {
  var base = props.size === undefined ? 24 : props.size;
  var size = Math.round(base * CONFIG.wordmarkScale);
  return h("svg", {
    width: size * 156 / 24,
    height: size,
    className: props.className,
    viewBox: WORDMARK_VIEWBOX,
    fill: "none",
    "aria-hidden": "true"
  }, [
    h("path", { key: "name", d: LINHAO_PATH, fill: "currentColor", transform: LINHAO_TRANSFORM }),
    h("rect", { key: "badge", x: "129.348", y: "5.5", width: "52", height: "14", rx: "2", fill: "currentColor" }),
    h("g", { key: "badge-text", clipPath: "url(#dsh-xiaoba-badge-clip)" },
      HARNESS_GLYPHS.map(function (d, i) {
        return h("path", { key: i, d: d, fill: BADGE_INVERTED });
      })),
    h("defs", { key: "defs" },
      h("clipPath", { id: "dsh-xiaoba-badge-clip" },
        h("rect", { width: "46", height: "14", fill: "white", transform: "translate(132.348 5.5)" })))
  ]);
}

// ---------------------------------------------------------------------------
// Hero copy patch
//
// hero.headline / hero.preview are i18n strings owned by
// dsh-client-ui-conversation. LocaleRuntime.register rejects a second
// registration for an existing namespace locale, so the copy cannot be
// overridden through the locale service. It is rewritten in the DOM instead,
// scoped to the hero title group, and only on an exact match of the stock
// string -- never a substring match on unrelated text.
//
// The hero markup is:
//   <div class="..._headline">
//     <span class="..._fishHitbox">   (the mark slot)
//     <span class="..._titleGroup">
//       <span>HEADLINE</span>
//       <span class="..._previewBadge">PREVIEW</span>
//
// Class names carry a build-time hash prefix, so the group is located by its
// stable _titleGroup suffix and the copy by exact text.
// ---------------------------------------------------------------------------

function patchHeroCopy() {
  if (typeof document === "undefined") return;
  if (CONFIG.headline === "" && CONFIG.previewBadge === "") return;
  var groups = document.querySelectorAll("[class*='_titleGroup']");
  for (var g = 0; g < groups.length; g += 1) {
    var nodes = groups[g].querySelectorAll("span");
    for (var i = 0; i < nodes.length; i += 1) {
      var el = nodes[i];
      if (el.children.length !== 0) continue;
      if (CONFIG.headline !== "" && el.textContent === CONFIG.sourceHeadline) el.textContent = CONFIG.headline;
      else if (CONFIG.previewBadge !== "" && el.textContent === CONFIG.sourcePreviewBadge) el.textContent = CONFIG.previewBadge;
    }
  }
}

function watchHeroCopy() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return function () {};
  }
  patchHeroCopy();
  var observer = new MutationObserver(function () { patchHeroCopy(); });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return function () { observer.disconnect(); };
}

// ---------------------------------------------------------------------------
// Stylesheet: release the fixed heights that would crop an enlarged mark.
//
// The sidebar pins its identity block with fixed heights and clips overflow
// (.brandIdentity{height:24px} inside .brand{overflow:hidden}), so a larger mark
// is cropped rather than drawn. These rules lift those constraints for the
// sidebar only. Class names carry a build-time hash prefix, so each selector
// matches the stable suffix through [class*=...].
// ---------------------------------------------------------------------------

var STYLE_ID = NS + "/sizing.css";
var CSS = [
  "[class*='_brandIdentity']{height:auto!important;align-items:center}",
  "[class*='_brandName']{height:auto!important;line-height:1.1}",
  "[class*='_railMark']{height:auto!important}",
  "[class*='_brand']{overflow:visible}",
  "[class*='_logoRow']{height:auto!important;align-items:center}"
].join("");

/** Mount the plugin stylesheet once, tagged the way the client module system expects. */
function mountStyle() {
  var selector = "style[data-plugin-css='" + STYLE_ID + "']";
  if (document.querySelector(selector) === null) {
    var tag = document.createElement("style");
    tag.dataset.pluginCss = STYLE_ID;
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }
  return function () {
    var existing = document.querySelector(selector);
    if (existing) existing.remove();
  };
}

// ---------------------------------------------------------------------------
// Plugin wiring
//
// priority: -1 on the two sidebar slots: they are kind "single" and
// dsh-client-ui-brand-official already registers at the implicit priority 0.
// The slot registry rejects a second registration at the SAME priority and
// renders the lowest priority, so -1 shadows the official brand without
// touching that package. conversation.hero.brand.mark is unoccupied (the
// official build deliberately leaves the hero on its animated fish fallback),
// so that registration needs no priority.
// ---------------------------------------------------------------------------

var inject = ["slots"];

function apply(ctx) {
  if (typeof document === "undefined") return;

  ctx.effect(mountStyle, NS + ": stylesheet");
  ctx.effect(function () { return watchHeroCopy(); }, NS + ": hero copy");

  ctx.slots.inject("sidebar.brand.mark", function () {
    return ctx.slots.register(
      { name: "sidebar.brand.mark", priority: -1, locale: NS },
      XiaobaMark
    );
  });

  ctx.slots.inject("sidebar.brand.name", function () {
    return ctx.slots.register(
      { name: "sidebar.brand.name", priority: -1, locale: NS },
      XiaobaWordmark
    );
  });

  ctx.slots.inject("conversation.hero.brand.mark", function () {
    return ctx.slots.register(
      { name: "conversation.hero.brand.mark", locale: NS },
      XiaobaHeroMark
    );
  });
}

exports.inject = inject;
exports.apply = apply;
