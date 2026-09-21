#!/usr/bin/env bash
# 新建一篇文章：scripts/new-post.sh my-post-slug "文章标题" [分类]
# 会在 content/post/<slug>/ 下生成 index.md，并打印提示
set -euo pipefail

slug="${1:-}"
title="${2:-}"
category="${3:-notes}"

if [[ -z "$slug" || -z "$title" ]]; then
    echo "用法: scripts/new-post.sh <slug> <标题> [分类，默认 notes]" >&2
    exit 1
fi

dir="content/post/$slug"
if [[ -e "$dir" ]]; then
    echo "已存在：$dir" >&2
    exit 1
fi

mkdir -p "$dir"
today="$(date +%Y-%m-%d)"
now="$(date +%Y-%m-%dT%H:%M:%S%z)"

cat > "$dir/index.md" <<EOF
---
title: $title
slug: $slug
description: 一句话摘要（会显示在卡片和搜索结果里）
date: $now
categories:
    - $category
tags:
    - 标签
math: true
---

摘要写在 \`<!--more-->\` 之前，列表卡片上会显示这一段。

<!--more-->

## 小节标题

正文。公式写 \$E = mc^2\$ 或：

\$\$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
\$\$

图片直接和 index.md 放同一目录，正文里写相对路径：

\`\`\`markdown
![图注](figure-1.png)
\`\`\`
EOF

echo "已创建 ${dir}/index.md（日期 ${today}）"
echo "本地预览：hugo server -D"
