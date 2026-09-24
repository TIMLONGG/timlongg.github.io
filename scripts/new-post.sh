#!/usr/bin/env bash
# 新建一篇笔记：scripts/new-post.sh my-note
# 套用 archetypes/post.md 模板，生成 content/post/my-note/index.md
set -euo pipefail

slug="${1:-}"

if [[ -z "$slug" ]]; then
    echo "用法: scripts/new-post.sh <slug>" >&2
    exit 1
fi

if [[ -e "content/post/$slug" ]]; then
    echo "已存在: content/post/$slug" >&2
    exit 1
fi

hugo new content "post/$slug/index.md"
echo
echo "本地预览: hugo server -D   ->   http://localhost:1313"
echo "发布前把 index.md 里的 draft 改成 false。"
