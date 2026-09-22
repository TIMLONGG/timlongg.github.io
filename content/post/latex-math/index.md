---
title: 公式速查：在 Markdown 里写 LaTeX
slug: latex-math
description: KaTeX 能渲染什么、怎么写行内与块级公式、以及几个容易踩的坑。
date: 2026-09-20 21:00:00+0800
draft: true
categories:
    - notes
tags:
    - LaTeX
    - 数学
    - KaTeX
math: true
---

这篇是公式写法的速查表。本站用 [KaTeX](https://katex.org/) 渲染公式，写得跟 LaTeX 基本一样，但**它只负责数学排版，不是完整的 LaTeX 编译器**，所以像 `\ref`、`\cite` 这类交叉引用不可用。

<!--more-->

## 行内公式与块级公式

行内用单个 `$`，块级用 `$$` 单独成段：

```markdown
勾股定理 $a^2 + b^2 = c^2$，高斯积分 $\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$。
```

勾股定理 $a^2 + b^2 = c^2$，高斯积分 $\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$。

块级公式会自动居中、单独占一行：

$$
\frac{\partial \mathcal{L}}{\partial \theta}
= \frac{1}{N} \sum_{i=1}^{N} \nabla_\theta \ell\!\left(f_\theta(x_i),\, y_i\right)
$$

## 常用的几类写法

**多行对齐**（`aligned`，用 `&` 对齐等号）：

$$
\begin{aligned}
(a+b)^2 &= a^2 + 2ab + b^2 \\
(a-b)^2 &= a^2 - 2ab + b^2
\end{aligned}
$$

**矩阵与向量**：

$$
\mathbf{W} = \begin{bmatrix}
w_{11} & w_{12} \\
w_{21} & w_{22}
\end{bmatrix},
\qquad
\mathbf{x} = \begin{pmatrix} x_1 \\ x_2 \end{pmatrix}
$$

**分段函数**（`cases`）：

$$
\mathrm{ReLU}(x) =
\begin{cases}
x, & x > 0 \\
0, & x \le 0
\end{cases}
$$

**上下标、希腊字母、运算符**：

$$
\alpha, \beta, \gamma, \Gamma, \lambda, \mu, \sigma, \Sigma, \Omega,\quad
\hat{y},\ \tilde{x},\ \bar{x},\ \vec{v},\quad
\le,\ \ge,\ \ne,\ \approx,\ \propto,\ \in,\ \subset,\ \forall,\ \exists
$$

## 手动编号

KaTeX 不支持 `\label` / `\ref` 自动编号与交叉引用，需要编号时用 `\tag` 手写：

$$
E = mc^2 \tag{1}
$$

正文里直接写「式 (1)」即可。

## 容易踩的坑

> [!WARNING]
> **成对的美元符号会被当成公式。** 例如正文里想写「$5 到 $10」需要转义成 `\$5 到 \$10`；这就是配置里打开行内 `$` 分隔符的代价。

- **KaTeX 覆盖面**：amsmath 的绝大多数命令（`aligned`、`cases`、`bmatrix`、`\operatorname` 等）都支持。
- **不支持的**：`\label`/`\ref`/`\eqref` 自动编号、`\begin{equation}` 环境、TikZ 绘图、`\include` 等宏包加载。
- **化学式**：`\ce{H2O}` 需要额外加载 mhchem 扩展，本站默认没开；写成 `\mathrm{H_2O}` 也能看。
- **不认识的命令**：KaTeX 会直接把源码标红显示出来，不会整页崩掉，所以写错了很容易发现。

> [!TIP]
> 需要写整份 `.tex` 文档时，建议不要硬塞进 Markdown：用 `pandoc` 先转成 Markdown（`scripts/tex2md.sh` 有示例），或者干脆用 Overleaf 维护，博客里只留链接和结论。
