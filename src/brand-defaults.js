// 品牌默认值与取值规则的唯一来源（single source of truth）。
//
// 为什么要有这个文件：host half 与 client half 以前各自维护一份同样的 DEFAULTS
// 和一套同样的取值规则，任一侧改动而另一侧没跟上，宿主注入的值与客户端回退值
// 就会不一致 —— 而这种不一致只在某些配置组合下才显现，极难排查。
//
// 现在：
//   host   (src/index.js)          -> 直接 import 本文件
//   client (src/client.template.js)-> DEFAULTS 由 tools/build.mjs 生成为字面量
//                                     （XIAOBA_DEFAULTS）嵌进产物，不再手抄
//   selftest                       -> 断言生成产物内嵌值与本文件一致

/** 每一项都可选；缺省或非法一律回退到这里的默认值。 */
export const DEFAULTS = {
  // 标识缩放。插槽给的是名义尺寸（侧栏 24、hero 34），这些倍数在基线上放大。
  sidebarMarkScale: 1.5,
  heroMarkScale: 2,
  wordmarkScale: 1.5,
  // hero 文案。空串表示保留上游原文。
  headline: "",
  previewBadge: "",
  // 本插件要重写的上游原文；上游默认文案变更时才需要改这里。
  sourceHeadline: "探索未至之境",
  sourcePreviewBadge: "预览版"
};

/**
 * 把一个原始配置值收敛到默认值。
 * @param key - 选项名，同时决定期望类型。
 * @param value - 来自 cordis.patch.yml 的原始值，可能是 undefined。
 * @returns 可用时返回该值，否则返回默认值。
 */
export function coerceOption(key, value) {
  const fallback = DEFAULTS[key];
  if (typeof fallback === "number") {
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return typeof value === "string" ? value : fallback;
}

/**
 * 把条目的原始配置解析成发布到页面的完整对象。
 * @param raw - Loader 解析出来的 config，可能不存在。
 * @returns 补齐默认值后的全部选项。
 */
export function resolveOptions(raw) {
  const source = raw !== null && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of Object.keys(DEFAULTS)) out[key] = coerceOption(key, source[key]);
  return out;
}
