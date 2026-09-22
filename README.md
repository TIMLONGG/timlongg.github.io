# timlongg.github.io

个人站点：**Hugo + [PaperMod](https://github.com/adityatelange/hugo-PaperMod)**，极简 / 学术风格。
只保留三件事：**博客（含公式与代码高亮）、简历、站内搜索**。

线上地址：<https://timlongg.github.io/>

## 快速开始

```bash
# 首次：拉取主题 submodule（主题不在仓库里，用 submodule 引用）
git clone --recurse-submodules git@github.com:TIMLONGG/timlongg.github.io.git

brew install hugo            # 需要 extended 版（brew 装的就是）
hugo server -D               # 本地预览 http://localhost:1313
hugo --gc --minify           # 构建到 public/
```

## 功能与页面

| 页面 | 地址 | 说明 |
| --- | --- | --- |
| 博客列表 | `/` | 顶部是标题 + 简介 + **搜索框**，下面是文章列表（细分割线，无卡片） |
| 文章 | `/blog/:year/:slug/` | KaTeX 公式、代码高亮 + 复制按钮、可折叠目录、上一篇/下一篇 |
| 归档 | `/archives/` | 按年月分组的全部文章 |
| 简历 | `/cv/` | 学术风格，数据来自 `data/cv.yaml`，支持打印 / 存为 PDF |
| 关于 | `/about/` | 个人简介 |
| 分类 / 标签 | `/categories/`、`/tags/` | 由文章 front matter 自动生成 |
| 搜索索引 | `/index.json` | Fuse.js 的搜索数据源 |

## 目录结构

```text
config/_default/
├── hugo.toml        # 站点信息、语言（zh）、时区、输出格式（首页额外输出 JSON 供搜索用）
├── params.toml      # 主题参数：首页简介、字号开关、目录、代码复制、搜索权重
├── menus.toml       # 顶部导航：归档 / 简历 / 关于
├── permalinks.toml  # URL 约定（换主题也不用改）：/blog/:year/:slug/
├── markup.toml      # Markdown 渲染、代码高亮、公式分隔符
└── related.toml     # 相关文章规则

content/
├── post/<slug>/     # 博客文章：index.md + 同目录图片
└── page/            # 独立页面：about / cv / archives

data/cv.yaml                     # 简历数据（唯一数据源）
layouts/
├── page/cv.html                 # 简历页模板
└── _partials/
    ├── home_info.html           # 首页顶部：简介 + 搜索框
    └── extend_head.html         # 按需加载：搜索 JS（首页）、KaTeX（math: true 的文章）

assets/css/extended/custom.css   # 自定义样式（官方定制入口，不改主题文件）
static/vendor/katex/             # 自托管 KaTeX（离线可用，不依赖 CDN）
scripts/new-post.sh              # 新建文章
```

## 写文章

```bash
scripts/new-post.sh my-note "我的笔记标题" notes    # 分类默认 notes
```

front matter：

```yaml
---
title: 文章标题
slug: my-note                 # 决定 URL：/blog/2026/my-note/
description: 一句话摘要        # 显示在列表卡片和搜索结果里
date: 2026-09-21 19:30:00+0800
categories: [notes]           # 分类：目录名用英文，显示名在 content/categories/<名>/_index.md 里写中文
tags: [标签A, 标签B]
math: true                    # 这篇文章要渲染公式时加上
---
```

- **公式**：行内 `$a^2+b^2=c^2$`，块级 `$$ ... $$`。KaTeX 不支持 `\label`/`\ref` 自动编号，编号请用 `\tag{1}`。
- **代码**：三个反引号 + 语言名，自动高亮并带复制按钮。
- **图片**：和 `index.md` 放同一个目录，正文写 `![图注](figure-1.png)`。
- **提示框**：`> [!NOTE]` / `> [!TIP]` / `> [!WARNING]`（每个之间空一行）。
- 注意：**`date` 不能写成未来时间**，否则 Hugo 默认不构建这篇文章（本地看不到、线上也没有）。

## 维护简历

1. 编辑 `data/cv.yaml`（教育背景、科研经历、论文、项目、荣誉、技能）——不用碰 HTML；
2. 有 PDF 版简历就放到 `static/cv/cv.pdf`，再把 `content/page/cv/index.md` 里 `# pdf: /cv/cv.pdf` 那行的注释去掉；
3. 页面上有「打印 / 存为 PDF」按钮，打印样式已适配（自动隐藏页头页脚）。

## 搜索

- 位置：首页（blog 列表）**最上方**，紧跟在站点简介下面；
- 原理：PaperMod 内置的 Fuse.js，索引是构建时生成的 `/index.json`，**完全本地**（不依赖外部服务）；
- 权重与阈值在 `config/_default/params.toml` 的 `[fuseOpts]` 里调；
- 只改文章标题/正文，索引会在构建时自动更新。

## 部署

推送到 `main` 即可，`.github/workflows/deploy.yml` 会：拉取 submodule → 装 Hugo → 构建 → 发布到 GitHub Pages。

**首次启用需要设置一次**：仓库 Settings → Pages → Build and deployment → Source 选 **`GitHub Actions`**。
（如果选了「Deploy from a branch」，GitHub 会用它自带的 Jekyll 再构建一遍，把 Hugo 站点顶掉，表现为首页变成 README 渲染的页面、点文章全 404。）

## 换主题 / 升级主题

主题以 **git submodule** 固定在 `themes/hugo-PaperMod`（当前 pin 在具体 commit，可复现）。

```bash
# 升级到最新
git submodule update --remote themes/hugo-PaperMod
git add themes/hugo-PaperMod && git commit -m "chore: update PaperMod theme"

# 或手动跑 GitHub Actions 里的 "Update theme"
```

**换主题时**：`content/`、`data/cv.yaml`、`assets/css/`、`static/` 里的内容都能原样保留；需要动的只有
`config/`（主题参数）、`layouts/`（简历页模板 + 两个 partial 覆盖）。这也是当初把简历抽成 `data/cv.yaml`、
把自定义样式放进 `assets/css/extended/` 的原因。
