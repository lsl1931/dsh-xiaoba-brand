# dsh-xiaoba-brand

[English](README.md) | 中文

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）Web 界面插件：
把侧栏与欢迎页的品牌标志替换成你自己的形象与字标，并改写欢迎页文案。**所有内容都可配置。**

装上它，Web UI 里这些位置会变：

| 位置 | 原本 | 换成 |
|---|---|---|
| 侧栏左上角图标 | DeepSeek 鲸鱼 | 你的图形（默认内嵌小八） |
| 侧栏左上角文字 | `deepseek` + HARNESS 徽章 | 你的名称 + **HARNESS 徽章原样保留** |
| 欢迎页图标 | 动画鲸鱼 | 你的图形 |
| 欢迎页标题 | 探索未至之境 | 你的标题 |
| 欢迎页徽章 | 预览版 | 你的徽章文字 |

## 安装

两种方式，任选其一（都以 ```~/.dsh/profiles/web``` 为 profile 目录为例；桌面端路径是
```%APPDATA%\dsh-desktop\harness\profiles\web```）。

### 方式 A：`link:`（开发态，改源码即时生效）

```bash
git clone https://github.com/lsl1931/dsh-xiaoba-brand.git ~/dsh-xiaoba-brand
cd ~/dsh-xiaoba-brand && node tools/build.mjs
```

然后在 profile 的 `package.json` 里加依赖与 bundle：

```json
{
  "dependencies": {
    "dsh-xiaoba-brand": "link:/home/你的用户名/dsh-xiaoba-brand"
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

再在 profile 目录建软链：

```bash
ln -s ~/dsh-xiaoba-brand ~/.dsh/profiles/web/node_modules/dsh-xiaoba-brand
```

### 方式 B：`file:`（快照拷贝）

把 `link:` 换成 `file:/绝对路径/dsh-xiaoba-brand`。适用于不希望源码被实时读取的场景。

### 重启

```bash
pkill -f 'dsh web'
dsh web --no-open --port 3080
```

只改 `cordis.patch.yml` 的配置时，HMR 开启的话会自行热重载；否则重启生效。

## 配置

全部配置写在 profile 的 `cordis.patch.yml` 里。**每一项都可省略**，省略即用括号内默认值。

```yaml
- insert:
    - id: dsh-xiaoba-brand
      name: 'dsh-xiaoba-brand'
      config:
        sidebarMarkScale: 1.5      # (1.5) 侧栏图标缩放；插槽给的基准是 24px
        heroMarkScale: 2           # (2)   欢迎页图标缩放；基准 34px
        wordmarkScale: 1.5         # (1.5) "名称 + HARNESS 徽章" 整体缩放
        headline: '你的标题'        # ("") 欢迎页标题；空串=保持原样
        previewBadge: '你的徽章'    # ("") 欢迎页徽章；空串=保持原样
        sourceHeadline: '探索未至之境'    # (探索未至之境) 要被替换的原标题
        sourcePreviewBadge: '预览版'      # (预览版)     要被替换的原徽章
```

**注意**：
- `headline` / `previewBadge` 留空**不会**清空文案，而是保留 DSH 原文。
- `sourceHeadline` / `sourcePreviewBadge` 必须与 DSH 当前实际文案**完全一致**才会被替换。DSH 升级改动文案后，需要同步这里。
- 缩放值是**乘数**。侧栏图标插槽传 24px，`1.5` 即 36px；欢迎页传 34px，`2` 即 68px。

## 换成你自己的形象和名称

### 换图形

替换 `assets/xiaoba.svg`，然后重新构建：

```bash
node tools/build.mjs
```

要求：
- 纯 SVG，**不含** `<style>`、`<mask>`、`<clipPath>`（会被内联进 `<svg>`）
- 不出现反引号 `\``、`${`、反斜杠 \\（构建脚本会断言，避免生成无法解析的文件）
- 自带上色（若图形是彩色的，不要依赖 `currentColor`）

### 换名称字标

字标是**矢量轮廓**，不是文本。当前仓库里的 `assets/wordmark-linhaoming.path.txt`
由 Windows 的 **Segoe UI Bold** 生成（详见下方「许可与来源」）。

要换成别的名字，需要重新生成轮廓。任何能把文字转成 SVG path 的工具都行，例如：

- Inkscape：文字转路径 → 另存为纯 SVG → 提取 `d` 属性
- `fonttools` + `svgpathtools`
- FontForge

生成后：
1. 把路径写入 `assets/wordmark-linhaoming.path.txt`
2. 调整 `tools/build.mjs` 里的 `LINHAO_TRANSFORM`（`translate(tx ty) scale(s)`）把它对齐到原始 `deepseek` 字标占据的盒子里
3. `node tools/build.mjs`

原始 `deepseek` 字标的盒子是 `x 26.956..121.517`、高 `17.015`（viewBox 单位），
HARNESS 徽章从 `x=129.348` 开始。把新轮廓缩放平移到这个盒子，徽章位置和 7.83 单位间距
就保持不变。

## 工作原理

### 三个插槽

DSH 的品牌是插槽化的，这个插件**不修改任何 DSH 源码**：

| 插槽 | 谁先占据 | 本插件 |
|---|---|---|
| `sidebar.brand.mark` | `dsh-client-ui-brand-official`（priority 0） | 以 `priority: -1` 覆盖 |
| `sidebar.brand.name` | 同上 | 以 `priority: -1` 覆盖 |
| `conversation.hero.brand.mark` | 无人注册（官方刻意留空，走动画鲸鱼回退） | 直接注册 |

插槽注册表对 `kind: "single"` 的规则是「**同一 priority 重复注册报错，数值最小者渲染**」，
所以 `-1` 能干净地盖过官方品牌，而不碰那个包。

### HARNESS 徽章为什么原样保留

官方字标是一个 SVG：鲸鱼 + 七个 `deepseek` 字形 + 圆角矩形徽章 + 七个白色 HARNESS 字形
（用 clipPath 裁进矩形）。本插件**只丢弃名称字形**，徽章矩形、HARNESS 字形和它们的
主题色填充都原样搬过来，因此徽章仍是官方美术与主题令牌。

### 配置怎么进浏览器

客户端插件读不到 `cordis.patch.yml`。Host 半监听 `webserver/index-inject` 把解析后的选项
推进页面全局变量，客户端半读 `globalThis.__DSH_XIAOBA_BRAND__` —— 与官方
`dsh-client-ui-sidebar-documentpreview` 同一通道。

### 欢迎页文案为什么要改 DOM

`hero.headline` / `hero.preview` 是 `dsh-client-ui-conversation` 拥有的 i18n 字符串，而
`LocaleRuntime.register` 对已存在的命名空间语言**直接抛错**，无法通过本地化服务覆盖。
因此改为在 DOM 里精确改写：只在 hero 的 `_titleGroup` 内、且**完整匹配**原字符串时替换，
不做子串匹配。

### 为什么需要注入样式

侧栏把品牌块写死了高度并裁切溢出（`.brandIdentity{height:24px}` 套在
`.brand{overflow:hidden}` 里）。只放大 SVG 会被裁掉，所以插件注入少量 CSS 放开这两处约束。

## 开发

```bash
node tools/build.mjs     # 由 src/ + assets/ 生成 lib/
node --check lib/client.js
```

- `src/client.template.js` — 浏览器半的源码（配置、插槽接线、DOM 补丁、样式）
- `src/index.js` — Node 半（校验并把配置注入页面）
- `tools/build.mjs` — 构建脚本，零依赖
- `assets/` — 内联素材
- `lib/` — **生成物，不要手改**

**零运行时依赖**：插件不 import 任何内核包，因此可以用普通的 `link:` 安装。

## 兼容性

- 面向 `@deepseek-ai/dsh` **0.1.6-alpha.2** 开发与验证
- 依赖插槽名 `sidebar.brand.mark` / `sidebar.brand.name` / `conversation.hero.brand.mark`
  与 CSS 类名后缀 `_titleGroup` / `_brandIdentity` 等。DSH 若改动这些，插件需要跟进。
- DSH 处于开发者预览阶段，破坏性变更随时可能发生。

## 许可与来源

本项目以 **MIT** 发布（见 [LICENSE](LICENSE)），但请注意内置素材的来源限制：

| 素材 | 来源 | 说明 |
|---|---|---|
| `assets/xiaoba.svg` | 由提供者上传，VTracer 光栅描摹产物 | 请确认你拥有该图形的分发权 |
| `assets/wordmark-linhaoming.path.txt` | **Segoe UI Bold** 文字轮廓 | **微软字体。字体轮廓的再分发可能受 EULA 限制**，商用前请自行确认，或换成开源字体（如 Inter、Noto Sans，OFL 许可）重新生成 |
| `assets/harness-badge.json` | 从 `@deepseek-ai/dsh-client-ui-primitives` 的官方字标中提取 | 仅搬运官方美术以保持徽章一致；版权归 DeepSeek |

**建议**：若要商用或广泛分发，请把字标换成**开源许可字体**重新生成，并替换为你拥有权利的图形。
