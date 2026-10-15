// dsh-xiaoba-brand 离线自检：零依赖、不需要浏览器、不需要宿主、不需要 profile。
//
// 覆盖三件事：
//   1) 生成产物 lib/client.js 内嵌的 DEFAULTS 与单一来源 src/brand-defaults.js 一致；
//   2) hero 文案重写的命中规则（精确匹配，绝不子串匹配）；
//   3) 未命中时可观测：恰好告警一次，而不是品牌静默消失。
//
// 用法: node selftest-xiaoba-brand.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULTS as SOURCE_DEFAULTS, coerceOption, resolveOptions } from "./src/brand-defaults.js";

const here = dirname(fileURLToPath(import.meta.url));
const clientSource = readFileSync(join(here, "lib", "client.js"), "utf8");

let failures = 0;
const fail = (message) => {
  console.error("[fail] " + message);
  failures += 1;
};
const ok = (condition, message) => {
  if (!condition) fail(message);
};

// ---- 装载浏览器 half：它就是被 <script> 执行的那段代码 ----------------------
var reactStub = {
  createElement: function (type, props) {
    var children = Array.prototype.slice.call(arguments, 2);
    return { type: type, props: props, children: children };
  },
  useEffect: function () {},
  useRef: function (init) { return { current: init }; },
  useState: function (init) { return [typeof init === "function" ? init() : init, function () {}]; }
};

function loadClient(injected) {
  var registered = null;
  globalThis.window = { __ModuleLoader__: { load: function (mod) { registered = mod; } } };
  if (injected === undefined) delete globalThis.__DSH_XIAOBA_BRAND__;
  else globalThis.__DSH_XIAOBA_BRAND__ = injected;
  var fakeRequire = function (spec) {
    if (spec === "react") return reactStub;
    throw new Error("client half 意外 require: " + spec);
  };
  new Function("window", "require", clientSource)(globalThis.window, fakeRequire);
  if (registered === null) fail("client half 没有注册模块");
  if (registered.id !== "dsh-xiaoba-brand") fail("client half 注册的 id 不对: " + registered.id);
  return registered.factory(fakeRequire);
}

// ---- 1) 默认值单一来源 ------------------------------------------------------
var mod = loadClient();
ok(mod.__test !== undefined, "client half 没有导出 __test");
ok(
  JSON.stringify(mod.__test.DEFAULTS) === JSON.stringify(SOURCE_DEFAULTS),
  "生成产物内嵌的 DEFAULTS 与 src/brand-defaults.js 不一致（忘了跑 node tools/build.mjs？）"
);
// 用带引号的 JSON 键来数"定义"：模板里的 CONFIG.sidebarMarkScale 是使用，不是第二份定义。
var definitions = clientSource.split('"sidebarMarkScale"').length - 1;
ok(
  definitions === 1,
  "lib/client.js 里默认值字面量出现 " + definitions + " 次（应为 1，来自 XIAOBA_DEFAULTS）：默认值被手抄了第二份，会漂移"
);

// ---- 2) 取值规则（host 侧单一来源） -----------------------------------------
ok(coerceOption("sidebarMarkScale", 3) === 3, "合法数字应透传");
ok(coerceOption("sidebarMarkScale", -1) === SOURCE_DEFAULTS.sidebarMarkScale, "负数应回退默认值");
ok(coerceOption("sidebarMarkScale", 0) === SOURCE_DEFAULTS.sidebarMarkScale, "0 应回退默认值");
ok(coerceOption("sidebarMarkScale", Number.NaN) === SOURCE_DEFAULTS.sidebarMarkScale, "NaN 应回退默认值");
ok(coerceOption("sidebarMarkScale", "2") === SOURCE_DEFAULTS.sidebarMarkScale, "字符串应回退默认值");
ok(coerceOption("headline", "X") === "X", "合法字符串应透传");
ok(coerceOption("headline", 42) === SOURCE_DEFAULTS.headline, "非字符串应回退默认值");
var resolved = resolveOptions({ headline: "X", sidebarMarkScale: 0 });
ok(resolved.headline === "X", "resolveOptions 未透传合法字符串");
ok(resolved.sidebarMarkScale === SOURCE_DEFAULTS.sidebarMarkScale, "resolveOptions 未收敛非法数字");
ok(Object.keys(resolved).length === Object.keys(SOURCE_DEFAULTS).length, "resolveOptions 应补齐全部键");
ok(resolveOptions(null).headline === "", "resolveOptions 应接受 null");

// ---- 3) hero 命中规则（真值表） ---------------------------------------------
var withCopy = loadClient({ headline: "H", previewBadge: "P" }).__test;
var cfg = withCopy.readConfig();
ok(cfg.headline === "H" && cfg.previewBadge === "P", "注入的配置没有生效: " + JSON.stringify(cfg));
ok(withCopy.heroReplacement(cfg.sourceHeadline, cfg) === "H", "命中 headline 时未替换");
ok(withCopy.heroReplacement(cfg.sourcePreviewBadge, cfg) === "P", "命中 badge 时未替换");
ok(withCopy.heroReplacement("上游改过的文案", cfg) === undefined, "不匹配时不应替换");
ok(withCopy.heroReplacement(cfg.sourceHeadline + "后缀", cfg) === undefined, "必须精确匹配，不能子串匹配");
var noCopy = loadClient({}).__test;
var cfg0 = noCopy.readConfig();
ok(noCopy.heroReplacement(cfg0.sourceHeadline, cfg0) === undefined, "未配置替换值时不应替换");

// ---- 4) 未命中必须可观测（恰好一次） ----------------------------------------
var warns = [];
var originalWarn = console.warn;
console.warn = function () { warns.push(Array.prototype.join.call(arguments, " ")); };
try {
  var miss = loadClient({ headline: "H", previewBadge: "P" }).__test;
  var missNodes = [{ textContent: "上游改过的文案", children: [] }];
  globalThis.document = { querySelectorAll: function () { return [{ querySelectorAll: function () { return missNodes; } }]; } };
  miss.patchHeroCopy();
  miss.patchHeroCopy();
  miss.patchHeroCopy();
  ok(warns.length === 1, "未命中时应恰好告警一次（MutationObserver 会反复调用），实际 " + warns.length + " 次");
  ok(String(warns[0]).indexOf("未命中") !== -1, "告警文案应说明未命中: " + warns[0]);
  ok(missNodes[0].textContent === "上游改过的文案", "未命中时不应改写文本");

  warns.length = 0;
  var hit = loadClient({ headline: "H", previewBadge: "P" }).__test;
  var hitNodes = [{ textContent: "探索未至之境", children: [] }, { textContent: "预览版", children: [] }];
  globalThis.document = { querySelectorAll: function () { return [{ querySelectorAll: function () { return hitNodes; } }]; } };
  hit.patchHeroCopy();
  ok(hitNodes[0].textContent === "H", "命中 headline 时 DOM 文本应被替换");
  ok(hitNodes[1].textContent === "P", "命中 badge 时 DOM 文本应被替换");
  ok(warns.length === 0, "命中时不应告警，实际 " + warns.length + " 次");

  // 没有任何锚点时不算"未命中"：会话页之外本来就没有 hero。
  warns.length = 0;
  var noAnchor = loadClient({ headline: "H" }).__test;
  globalThis.document = { querySelectorAll: function () { return []; } };
  noAnchor.patchHeroCopy();
  ok(warns.length === 0, "没有 _titleGroup 锚点时不应告警");
} finally {
  console.warn = originalWarn;
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.__DSH_XIAOBA_BRAND__;
}

console.log(
  failures === 0
    ? "[ok] 默认值单一来源、取值规则、hero 命中真值表、未命中告警全部通过"
    : "[FAIL] " + failures + " 项未通过"
);
if (failures > 0) process.exit(1);
