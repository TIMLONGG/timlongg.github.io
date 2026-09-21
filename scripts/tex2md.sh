#!/usr/bin/env bash
# 把 LaTeX 文档转成 Markdown（需要先安装 pandoc: brew install pandoc）
#
# 用法：
#   scripts/tex2md.sh notes/paper.tex > content/post/my-note/index.md
#
# 建议把 .tex 源文件单独放在 tex/ 目录里（不参与构建），
# 转换后的 .md 才放进 content/post/。
set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "用法: scripts/tex2md.sh <file.tex>" >&2
    exit 1
fi

if ! command -v pandoc >/dev/null 2>&1; then
    echo "未找到 pandoc，请先执行：brew install pandoc" >&2
    exit 1
fi

src="$1"
if [[ ! -f "$src" ]]; then
    echo "文件不存在：$src" >&2
    exit 1
fi

# --wrap=preserve    保持原有换行，方便 diff
# --mathjax          数学公式转成 $...$ / $$...$$，交给 KaTeX 渲染
# --extract-media   把图片抽到 images/ 目录（之后记得把它们挪到文章目录里）
pandoc "$src" \
    --from latex \
    --to markdown+tex_math_dollars+pipe_tables+footnotes \
    --wrap=preserve \
    --extract-media=./images \
    "$@"

cat >&2 <<'EOF'

---
转换完成，接下来：
1. 在输出顶部补上 front matter（title / date / categories / tags / description）；
2. 把 ./images 里的图片挪到文章目录，并把引用路径改成相对路径；
3. 检查 \ref / \cite 之类的交叉引用，Markdown 里需要改成手写编号或链接。
EOF
