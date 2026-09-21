# timlongg.github.io

个人站点：**Hugo + [Stack](https://github.com/CaiJimmy/hugo-theme-stack)**，用来放学习笔记、技术分享和日常记录。
支持分类、标签、归档、全文搜索、KaTeX 公式、图片自动压缩，以及一个独立的简历页。

线上地址：<https://timlongg.github.io/>

## 快速开始

```bash
brew install hugo          # 需要 extended 版本（brew 装的默认就是）
hugo server -D             # 本地预览 http://localhost:1313，改文件自动刷新
hugo --gc --minify         # 构建到 public/
```

> 国内网络拉取主题模块时，建议先设置 Go 代理：
> `export GOPROXY="https://goproxy.cn,direct"`

## 目录结构

```text
config/_default/
├── config.toml         # 站点信息、语言（zh）、时区
├── params.toml         # 主题参数：侧边栏、公式开关、组件、评论
├── permalinks.toml     # URL 约定：/blog/:year/:slug/ 和 /:slug/
├── menu.toml           # 社交链接（GitHub / RSS / 邮箱）
├── markup.toml         # Markdown 渲染、代码高亮、公式分隔符
├── module.toml         # 主题模块（Hugo Modules，不在仓库里放主题代码）
└── related.toml        # 相关文章规则（按标签/分类推荐）

content/
├── post/<slug>/        # 博客文章：index.md + 同目录图片
├── page/               # 独立页面：关于 / 简历 / 归档 / 搜索 / 友链
└── categories/         # 分类的中文标题和描述

data/cv.yaml            # 简历数据（唯一数据源）
layouts/page/cv.html    # 简历页模板（渲染 data/cv.yaml）
assets/
├── img/                # 头像、favicon
├── icons/              # 自定义图标（如 file-text.svg）
└── scss/custom.scss    # 自定义样式：中文字体栈、简历样式、打印样式
scripts/
├── new-post.sh         # 新建文章
└── tex2md.sh           # .tex → Markdown（需要 pandoc）
```

## 写一篇文章

```bash
scripts/new-post.sh my-post-slug "文章标题" notes
# 或者
hugo new content post/my-post-slug/index.md
```

front matter 约定：

```yaml
---
title: 文章标题
slug: my-post-slug            # 决定 URL：/blog/2026/my-post-slug/
description: 一句话摘要        # 显示在卡片和搜索结果里
date: 2026-09-21 10:00:00+0800
categories: [notes]           # 分类：一条文章尽量只归一个大类
tags: [Hugo, 教程]             # 标签：可以有很多个
math: true                    # 需要公式时打开（站点已全局开启，可省略）
image: cover.png              # 可选：列表卡片封面
---
```

- **公式**：行内 `$a^2+b^2=c^2$`，块级 `$$ ... $$`（KaTeX 渲染；不支持 `\label`/`\ref`，编号请用 `\tag{1}`）。
- **图片**：和 `index.md` 放同一目录，正文写 `![图注](figure-1.png)`；多张图连续写会自动并排成图集，点击可放大。
- **提示框**：`> [!NOTE]`、`[!TIP]`、`[!WARNING]`、`[!CAUTION]`，注意**每个提示框之间要空一行**。
- **流程图**：代码块语言写 `mermaid`。
- 分类：`categories` 是大类（书架），`tags` 是关键词（便利贴）。分类目录名用英文，显示名在 `content/categories/<slug>/_index.md` 的 `title` 里写中文。

## 维护简历

1. 改 `data/cv.yaml`（教育背景、经历、论文、技能等）——**不用碰 HTML**；
2. 想加 PDF 版：把 PDF 放到 `static/cv/cv.pdf`，然后在 `content/page/cv/index.md` 里取消 `pdf: /cv/cv.pdf` 那行的注释；
3. 页面上还有「打印 / 存为 PDF」按钮，浏览器直接打印即可生成 PDF（打印样式已适配，会自动隐藏侧边栏）。

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并发布到 GitHub Pages。

首次启用需要在 GitHub 仓库里设置一次：

**Settings → Pages → Build and deployment → Source 选择 `GitHub Actions`**

（如果之前是「Deploy from a branch」，改成 GitHub Actions 之后，网页就由 Actions 构建的产物提供。）

## 更新主题

主题通过 Hugo Modules 引用，不占用仓库空间：

```bash
hugo mod get -u github.com/CaiJimmy/hugo-theme-stack/v4    # 升级到最新
hugo mod tidy
```

仓库里还有 `update-theme.yml`，每天自动检查一次更新。
**换主题时**：`content/`、`data/`、`assets/` 里的内容都可以原样保留，只替换 `config/`、`layouts/` 和主题模块即可——这也是当初把封面图放进文章目录、把简历数据抽到 `data/cv.yaml` 的原因。

## 内容与主题分离的原则

- 正文只写标准 Markdown + `$公式$`，不用主题特有的短代码，方便以后换主题；
- URL 由 `permalinks.toml` 显式写死，换主题时保持同样的规则即可不失效；
- 简历、头像、封面等“个人数据”全部独立于主题。
