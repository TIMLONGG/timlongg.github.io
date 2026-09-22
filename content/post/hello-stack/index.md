---
title: 站点开张：为什么用 Hugo + Stack
slug: hello-stack
description: 记录这个站点的技术选型、目录结构、分类约定和部署方式，兼作站点使用说明。
date: 2026-09-21 10:00:00+0800
draft: true
categories:
    - announcements
tags:
    - Hugo
    - Stack
image: cover.png
---

欢迎来到我的新站点 🎉。这里用来放**笔记、技术分享和日常记录**，取代了原来的单文件首页。

在此之前我比较过 Jekyll / Hexo / Astro 的十来个主题，最后选了 [Hugo](https://gohugo.io/) + [Stack](https://github.com/CaiJimmy/hugo-theme-stack)，原因写在下面，也算给以后的自己留个交代。

<!--more-->

## 为什么是 Hugo + Stack

| 需求 | Stack 的答案 |
| --- | --- |
| 分类整理笔记 | `categories` 是真正的分类，`tags` 是细粒度标签，另有按年份的归档页 |
| 公式渲染 | 内置 KaTeX，`math: true` 打开，配置里已装好 goldmark passthrough |
| 图片方便 | 文章和图片放同一个目录（page bundle），正文直接写相对路径，自动压缩、生成多尺寸 |
| 以后换主题 | 内容（`content/`）和主题彻底分离，换主题只动配置，文章一行不用改 |

## 目录结构

```text
content/
├── post/                # 博客文章（每篇一个目录）
│   └── hello-stack/
│       ├── index.md     # 正文
│       └── cover.png    # 封面图，和正文放一起
├── page/                # 独立页面：关于、简历、归档、搜索、友链
└── categories/          # 给分类加上中文标题和描述
data/
└── cv.yaml              # 简历数据（唯一数据源，与主题解耦）
```

## 分类约定

- **分类（categories）** 是大类，用来分区整理：一条文章尽量只归 1 个分类。
- **标签（tags）** 是关键词，可以有很多个，用于横向串联同一主题的文章。
- 归档页（`/archives/`）会按年份自动列出全部文章，同时顶部会展示分类云。

## 新增一篇文章

```bash
hugo new content post/my-new-post/index.md
```

然后写 front matter：

```yaml
---
title: 文章标题
slug: my-new-post          # URL 里用到的短名，决定 /blog/2026/my-new-post/
date: 2026-09-21 10:00:00+0800
description: 一句话摘要，会显示在卡片和搜索结果里
categories: [notes]
tags: [标签A, 标签B]
math: true                 # 需要公式时打开（站点已全局开启，可省略）
image: cover.png           # 可选，列表卡片的封面图
---
```

## 部署方式

推送到 `main` 分支后，GitHub Actions 会自动：

1. 安装 Hugo（extended）和 Go；
2. `hugo --gc --minify` 构建静态站点；
3. 把 `public/` 发布到 GitHub Pages。

所以本地只需要：

```bash
hugo server -D      # 本地预览，带热重载
hugo                # 构建到 public/
```

> [!TIP]
> 写完文章后先在本地 `hugo server` 看一眼，确认公式、图片、分类都正常，再 push。
