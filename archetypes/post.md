{{- /*
    笔记模板：`hugo new content post/<slug>/index.md` 会自动套用本文件。
    下面把 front matter 和正文的常见写法都列全了，写的时候删掉用不到的部分即可。
*/ -}}
---
title: "{{ .File.ContentBaseName }}"
slug: "{{ .File.ContentBaseName }}"          # 决定 URL：/blog/<年份>/<slug>/
description: 一句话摘要                        # 显示在标题下、首页卡片和搜索结果里
date: {{ .Date }}                             # 不要写成未来时间，否则不会被构建
draft: true                                   # 写完改成 false（或删掉这行）才会发布
categories:                                   # 分类（左侧栏 / 分类页），可多个
    - notes
tags:                                         # 标签（标签页 / 相关文章 / 站内搜索）
    - 标签A
    - 标签B
math: true                                    # 有公式才加，用于按需加载 KaTeX
# image: cover.png                            # 同目录封面图（可选）
# hideSummary: true                           # 首页卡片不显示摘要（可选）
# searchHidden: true                          # 不被站内搜索收录（可选）
# aliases: ["/old-url/"]                      # 旧链接 301 跳转到本文（可选）
---

## 二级标题（自动进右侧目录）

普通段落：**加粗**、*斜体*、`行内代码`、[链接](https://example.com)。

行内公式写 $E = mc^2$；块级公式单独成段：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,\mathrm{d}x = \sqrt{\pi}
$$

- 无序列表项
- 第二项

1. 有序列表项
2. 第二项

代码块用三个反引号 + 语言名，自动高亮并带复制按钮：

```python
def hello(name: str) -> str:
    return f"hello {name}"
```

图片和 `index.md` 放在同一目录，正文里用相对路径：

![图注](figure-1.png)

表格：

| 列 A | 列 B |
| --- | --- |
| 1 | 2 |

提示框（GitHub 风格，多个提示框之间空一行）：

> [!NOTE]
> 备注

> [!TIP]
> 提示

> [!IMPORTANT]
> 重要

> [!WARNING]
> 警告

> [!CAUTION]
> 注意

> 普通引用（不加 `[!类型]` 就是普通引用块）。

---

### 三级标题（在目录里再缩进一级）

#### 四级标题（目录到这一级为止同，见 config/_default/markup.toml）

写完把 `draft` 改成 `false` 即可发布。
