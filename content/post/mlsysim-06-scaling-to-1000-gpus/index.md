---
title: "[MLsysim 06] Scaling to 1000 GPUs 笔记"
slug: mlsysim-06-scaling-to-1000-gpus
date: 2026-09-23T16:02:54+0800
categories:
    - mlsysim
tags:
    - mlsysim
    - 分布式
math: true
---

> At 1024 GPUs, communication overhead is the cost everyone talks about. But is it the dominant one?

## 结论：

规模扩展之后，拖垮训练时间的是可靠性，而不是通信。网络带宽、NVLink、InfiniBand 可以变快；但硬件多久坏一次是物理决定的，集群一大，MTBF 随即减小。512 卡以上差不多一天坏一次，每坏一次就把上次 checkpoint 之后的工作全部丢掉。30 天拉通算下来，checkpoint 和回滚的时间会超过 AllReduce。所以集群一大，第一个要问的不是网络多快，而是多久坏一次。

## scaling efficiency 的精确定义（baseline）

baseline 设定：单节点 8 张 H100（1 DGX），卡间 NVLink，跨节点 InfiniBand NDR。并行 TP=8、PP=1、DP=N/8。TP 把每层权重切到节点内 8 张卡上，PP=1 没有流水线、bubble 为 0，DP 负责节点间复制、梯度 AllReduce。

结果：

```
GPUs:                8
Compute latency:     16,328.7 ms
Communication:       1,336.8 ms
Scaling efficiency:  92.4%
```

scaling efficiency 在这套模型里就是一步之内纯计算时间占整体的比例：

$$
E = \frac{C}{C + Comm_{dp} + Comm_{tp} + Comm_{ep} + Bubble}
  = \frac{1}{1 + Comm/C}
$$

代进去，$16328.7/(16328.7+1336.8)=92.43\%$。

那 1336.8 ms 是哪来的。本例 dp=1、ep=1、pp=1，所以全部来自 TP 的激活 AllReduce。TP 每层做两次（attention 输出投影、MLP down-projection），传的是激活张量 `[batch, seq, hidden]`。ring allreduce 的推导放在另一篇笔记，这里只用它的 α-β 时间公式：

$$
T_{ring} = \frac{2(N-1)}{N}\cdot\frac{M}{\beta} + 2(N-1)\alpha
$$

代入本例：激活大小 $64 \times 2048 \times 8192 \times 2 = 2\text{ GiB}$（fp16 每元素 2 字节），每层两次所以 $M = 4\text{ GiB}$，ring 系数 $2\times7/8=1.75$，$\beta=450$ GB/s（H100 单向，双向合计 900），$\alpha=0.5\,\mu s$：

$$
T_{layer} = \frac{1.75 \times 4.295\text{ GB}}{450\text{ GB/s}} + 2\times 7 \times 0.5\,\mu s
          = 16.703 + 0.007 = 16.71\text{ ms}
$$

80 层就是 $16.71\times80=1336.8$ ms。带宽项 1336.2 ms，延迟项只有 0.56 ms，属于大消息、带宽受限。

另外记一下，这一步 Engine.solve 返回的 roofline 其实是 memory-bound，模型状态远超显存触发了 offload，所以那个 16328.7 ms 名义上叫 Compute latency，实际主要是访存时间，不是 FLOPs。它的构成：

$$
traffic = W + 0.1\,W\cdot B = 141.2\times(1+0.1\times64) = 1044.9\text{ GB}
$$

$W$ 是 fp16 权重 141.2 GB，激活流量的启发式是每样本读 10% 权重。模型装不下显存（10922 GB > 80 GiB），源码把全部流量按降级带宽计价：$\beta=\min(\text{HBM }3350,\ \text{PCIe }64)=64$ GB/s。

$$
t_{memory} = \frac{1044.9}{64} = 16326.2\text{ ms}, \qquad
t_{compute} = \frac{6\times70.6\times10^9\times64}{494.5\times10^{12}} = 54.8\text{ ms}
$$

$latency = \max(16326.2, 54.8) + 2.41 = 16328.7$ ms，overhead 是 80 层 × 0.01 ms × 3 次发射加 dispatch。每样本流量 $= W/B + 0.1W$：B=64 时 16.33 GB（255 ms），B=8 时 31.77 GB（496 ms），涨的那块是 $W/B$，即权重搬运摊销这个与 batch 无关的固定项。这个 $W/B$ 后面解释 U 形左半段时会再用到。

## Young-Daly公式的推导

设置：每隔 $\tau$ 存一次，写一次要 $\delta$，集群 MTBF 是 $M$，总时长 $T$。

存得太勤，写盘次数多；存得太疏，坏了以后回滚丢的多。两边浪费分别是

$$
W_{write} = \frac{T}{\tau}\delta
$$

$$
W_{rollback} = \frac{T}{M}\cdot\frac{\tau}{2}
$$

加起来

$$
W(\tau) = \frac{T\delta}{\tau} + \frac{T\tau}{2M}
$$

对 $\tau$ 求导

$$
\frac{dW}{d\tau} = -\frac{T\delta}{\tau^2} + \frac{T}{2M} = 0
\;\Rightarrow\; \tau^2 = 2\delta M
\;\Rightarrow\; \tau^* = \sqrt{2\delta M}
$$

这就是 Young-Daly 最优间隔。它的含义是让两边相等，$\delta/\tau = \tau/(2M)$。

512 卡验证一下，$\delta=60$ s，$M=67.0$ h $=241200$ s：

$$
\tau^* = \sqrt{2\times60\times241200} = 5380\text{ s} = 1.49\text{ h}
$$

这个式子在 $\delta \ll M$ 时成立。$\delta$ 接近 $M$ 的时候 Young 一阶式会不准，需要用 Daly 的高阶形式。

## 规模扫描，为什么效率是U形

从 8 卡扫到 1024 卡，TP 固定 8，DP 随规模涨：

```
GPUs  Nodes  Comm (ms)  Bubble (ms)  Efficiency
───────────────────────────────────────────────
8         1     1336.8          0.0       92.4%
32        4      393.4          0.0       93.6%
64        8      236.2          0.0       94.4%
128      16      280.4          0.0       93.4%
256      32      302.4          0.0       92.9%
512      64      313.5          0.0       92.7%
1024    128      319.1          0.0       92.6%
```

先升后降，峰在 64 卡。

### 先把 Amdahl 摘出去

Amdahl 说的是固定工作量下串行分数 $f$ 限制加速比：

$$
Speedup(N) = \frac{1}{f + (1-f)/N}
$$

但这张表不满足它的前提：全局 batch = max(64, N) 随规模在涨，每步的工作量在变；而且 $E$ 是单步计算占比，不是 speedup/N。所以 U 形其实用不着 Amdahl，它就是下面这个关于 $N$ 的闭环公式。

### 闭环公式

$$
E(N) = \frac{C(L)}{C(L) + k\,L + T_{dp}(N)}, \qquad
L(N) = \frac{\max(64,N)}{N/8} = \max\!\left(\frac{512}{N},\ 8\right)
$$

$L$ 是 local batch，$C(L)$ 是上一节的 roofline，$T_{tp}=kL$ 线性于 local batch（$k=20.95$ ms/样本），$T_{dp}(N)$ 是 DP 梯度 AllReduce、只随 $N$ 增。代入 roofline：

$$
C(L) = 2206\,(1+0.1L)\ \text{ms}
$$

### 逐项拆解

| GPUs | dp | local_batch | Compute C | Comm_TP | Comm_DP | Comm 合计 | C/Comm | Eff |
|---|---|---|---|---|---|---|---|---|
| 8    | 1   | 64 | 16328.7 | 1336.8 | 0.0   | 1336.8 | 12.2 | 92.4% |
| 32   | 4   | 16 | 5738.7  | 334.6  | 58.8  | 393.4  | 14.6 | 93.6% |
| 64   | 8   | 8  | 3973.7  | 167.6  | 68.6  | 236.2  | 16.8 | 94.4% |
| 128  | 16  | 8  | 3973.7  | 167.6  | 112.8 | 280.4  | 14.2 | 93.4% |
| 256  | 32  | 8  | 3973.7  | 167.6  | 134.9 | 302.4  | 13.1 | 92.9% |
| 512  | 64  | 8  | 3973.7  | 167.6  | 145.9 | 313.5  | 12.7 | 92.7% |
| 1024 | 128 | 8  | 3973.7  | 167.6  | 151.5 | 319.1  | 12.5 | 92.6% |

TP 通信 $kL$ 线性于 local_batch（传的是激活量）；DP 通信跟 batch 无关（梯度只取决于模型大小），但随 dp 增大。

**左半段（N≤64）：$L=512/N$ 递减，通信占比为什么变小**

$$
\frac{T_{tp}}{C} = \frac{kL}{a(1+0.1L)}, \qquad a=2206
$$

对 $L$ 求导是 $\dfrac{k}{a(1+0.1L)^2} > 0$，单调递增。所以 $L$ 变小，这个占比就变小，效率升。机制说人话：$C$ 里有一块与 batch 无关的权重搬运 $a=2206$ ms，batch 越小这块占比越大，把线性的 TP 通信稀释了。数值上 $T_{tp}/C$ 从 8.2%（L=64）降到 4.2%（L=8）。

**右半段（N≥64）：$L$ 被钉死在 8**

$C = 2206\times1.8 = 3971$ ms 不动，$kL=168$ ms 也不动，只剩 $T_{dp}(N)$ 从 68.6 涨到 151.5（dp≥16 跨节点，从 ring 变 hierarchical），分母变大，效率降。

**验证**：纯代入闭合式，不查表。

| N | L | C(L) | k·L | T_dp | E |
|---|---|---|---|---|---|
| 32   | 16 | 5736 | 335 | 58.8  | 5736/6130 = 93.6% ✓ |
| 64   | 8  | 3971 | 168 | 68.6  | 3971/4207 = 94.4% ✓ |
| 1024 | 8  | 3971 | 168 | 151.5 | 3971/4290 = 92.6% ✓ |

峰在 64 卡就是 $L(N)=\max(512/N, 8)$ 的拐点，由 batch_size = max(64,N) 这个配置直接决定。如果真要做严格的 Amdahl 实验，应该固定 global batch = 64 去扫 N、看加速比饱和，那是另一个实验，这张表不是。

## 可靠性揭示

同一批集群再跑可靠性模型，30 天、单次写入 60 s：

```
GPUs  Nodes  Cluster MTBF  Failures/30d  Optimal Ckpt
─────────────────────────────────────────────────────
8         1      4285.7 h           0.2        12.0 h
32        4      1071.4 h           0.7         6.0 h
64        8       535.7 h           1.3         4.2 h
128      16       267.9 h           2.7         3.0 h
256      32       133.9 h           5.4         2.1 h
512      64        67.0 h          10.8         1.5 h
1024    128        33.5 h          21.5         1.1 h
```

### MTBF 是怎么算出来的

节点 MTBF 用串联系统。节点里 8 GPU、8 NIC、2 PSU，任意一个坏了整节点就不可用，故障率相加：

$$
\lambda_{node} = \frac{8}{50000} + \frac{8}{150000} + \frac{2}{100000}
              = 1.600\times10^{-4} + 5.333\times10^{-5} + 2.000\times10^{-5}
              = 2.333\times10^{-4}\ \text{/h}
$$

$$
MTBF_{node} = \frac{1}{\lambda_{node}} = 4285.7\text{ h}
$$

8 张 GPU 的故障率是乘 8，不是取最好那张。所以节点 MTBF 比最弱部件（GPU 50000 h）低了一个数量级。

集群层面节点之间也是串联：

$$
MTBF_{cluster} = \frac{MTBF_{node}}{N_{nodes}}
$$

1024 卡是 128 节点，$4285.7/128 = 33.5$ h。这就是 1/N 衰减的来源，卡数翻倍 MTBF 减半。

Failures/30d 就是 $720/MTBF$，1024 卡是 21.5 次。Optimal Ckpt 是 $\sqrt{2\delta M}$，$M$ 越小间隔越短。

## 隐藏成本

30 天里两类损失并排：

```
GPUs  Comm Loss (h)  Ckpt Loss (h)  Ckpt/Comm
─────────────────────────────────────────────
64            40.4            9.5       0.2x
256           50.9           19.0       0.4x
512           52.7           26.9       0.5x
1024          53.5           38.1       0.7x
```

### 两列怎么算的

通信损失就是整步里非计算部分的总时长：

$$
Comm\ Loss = (1-E)\times 720\text{ h}
$$

64 卡 $(1-0.9439)\times720=40.4$ h，1024 卡 $(1-0.9257)\times720=53.5$ h，涨得很慢。

检查点损失是写入加回滚：

$$
Ckpt\ Loss = \frac{720}{\tau}\cdot\frac{\delta}{3600} + N_{fail}\cdot\frac{\tau}{2}
$$

$\tau$ 是该规模的 Young-Daly 间隔，$\delta=141.2$ s。512 卡时 $\tau=1.5$ h、$N_{fail}=10.8$，写入 $480\times141.2/3600=18.8$ h，回滚 $10.8\times0.75=8.1$ h，合计 26.9 h。1024 卡时 $\tau=1.1$ h、$N_{fail}=21.5$，写入约 25.7 h，回滚约 11.8 h，约 38 h。

### Key Insight

通信损失从 40 h 到 53 h，几乎没动；检查点损失从 9.5 h 到 38 h，翻了四倍。原因是通信损失只跟 $1-E$ 挂钩，而 $E$ 随规模只掉几个百分点；检查点损失跟故障次数和回滚时间挂钩，故障次数正比于规模，同时 $\tau$ 还被压缩，两个效应一起放大。Ckpt/Comm 从 0.2x 涨到 0.7x，方向很清楚。所以一个看起来调得不错的任务，可能有 10% 到 30% 的墙钟时间花在 checkpoint I/O 和回滚上，只看通信效率是看不出来的。

## 检查点大小问题

```
── Checkpoint Analysis ─────────────────────
Model: Llama-3.1-70B
Checkpoint size: 988.4 GB
Write time: 141.2 s
MFU penalty 1h: 3.92%
Storage bottleneck: True
```

### 四个指标怎么来的

Checkpoint size 存的是混合精度 Adam 的完整状态，每个参数 14 字节：FP32 权重主副本 4、一阶动量 4、二阶动量 4、FP16 权重 2。梯度是临时的，不存。Llama-3-70B 有 70.6e9 个参数：

$$
size = 70.6\times10^9 \times 14\text{ B} = 988.4\text{ GB}
$$

Write time 用 DGX H100 本地 NVMe 带宽 7 GB/s，单写入者，有效带宽取 $\min(7\times1, 500)=7$ GB/s：

$$
t_{write} = \frac{988.4\text{ GB}}{7\text{ GB/s}} = 141.2\text{ s}
$$

MFU penalty 是因为 checkpoint 同步写，写盘时训练停摆。1 小时间隔下

$$
penalty = \frac{141.2}{3600} = 3.92\%
$$

Storage bottleneck 的判据是写入超过 60 s，141.2 > 60，所以是 True。

这个问题的严重性在于 checkpoint size 只跟模型有关，固定 988 GB，但集群越大 Young-Daly 要求的间隔越短（1024 卡是 1.1 h），单次写入占的比例就越高，累计损失随之放大。大集群要用异步 checkpoint 和分片写入（FSDP、n_writers > 1）来缓解。

## Exercise

### Exercise 1 — 2048 GPU（256 节点）先预测

先手算：节点 MTBF 4285.7 h，集群 $4285.7/256 \approx 16.7$ h，30 天故障约 $720/16.7 \approx 43$ 次。

```
── 2048-GPU Cluster (256 nodes) ────────────
GPUs:               2048
Nodes:              256
Cluster MTBF:       16.74 h
Expected failures:  43.0
P fail in run:      100.0%
Optimal ckpt:       0.747 h
Goodput:            97.3%
```

预测 16.7 h / 43 次，实测 16.74 h / 43.0 次，吻合。1/N 律很干净：512 卡 67.0 h、1024 卡 33.5 h、2048 卡 16.7 h，每翻倍减半。30 天必然碰到故障，最优间隔被压到 0.75 h。

### Exercise 2 — 512 卡扫描 checkpoint 间隔 0.5–8 h

用前面两个公式，$\delta=60$ s，$N_{fail}=10.8$：

$$
write(\tau) = \frac{720}{\tau}\cdot\frac{1}{60}, \qquad
rollback(\tau) = 10.8\times\frac{\tau}{2}
$$

```
Interval (h)  Ckpt write (h)  Rollback (h)  Total (h)
─────────────────────────────────────────────────────
0.50                   24.00          2.69      26.69
0.75                   16.00          4.03      20.03
1.00                   12.00          5.38      17.38
1.25                    9.60          6.72      16.32
1.50                    8.00          8.06      16.06
2.00                    6.00         10.75      16.75
3.00                    4.00         16.13      20.13
4.00                    3.00         21.50      24.50
6.00                    2.00         32.26      34.26
8.00                    1.50         43.01      44.51
```

最小值在 $\tau=1.5$ h，和解析解 1.49 h 一致。写成连续形式是 $W(\tau)=12/\tau+5.38\tau$，左边写入主导，右边回滚主导。谷底附近 1–2 h 很平，实际不用卡那么准。

### Exercise 3 — GPU 可靠性翻倍（MTTF 100k h）

```
── 1024-GPU Next-gen (GPU MTTF 100k h) ─────
Cluster MTBF:       51.0 h
Expected failures:  14.1

原 1024 卡 MTBF             : 33.5 h
翻倍可靠性 1024 卡 MTBF     : 51.0 h   (提升 x1.52)
原 512 卡 MTBF              : 67.0 h
翻倍后单节点 MTBF           : 6521.7 h   (原 4285.7 h，x1.52)
匹配原 512 卡 MTBF 所需节点数: 97.4 -> 约 779 个 GPU
```

节点 MTBF 从 4285.7 h 到 6521.7 h，比值 1.52。GPU 只占节点故障率的 69%（$1.6\times10^{-4}/2.33\times10^{-4}$），NIC 和 PSU 把它稀释了，所以不是 2 倍。要回到原 512 卡的 67.0 h，需要 $6521.7/67.0=97.4$ 个节点，约 779 卡。也就是说可靠性翻倍差不多能多撑 1.52 倍的规模。只改 GPU 收益有限，NIC、PSU、光模块得一起动，或者上冗余。

### Self-check

```
── Self-check: node MTTF ───────────────────
Node MTBF:  4,285.7 h
```

$$
\frac{1}{8/50000 + 8/150000 + 2/100000}
= \frac{1}{2.333\times10^{-4}} = 4286\text{ h}
$$

节点 MTTF 远低于最弱的单个组件（GPU 50000 h），因为 8 张 GPU 的故障率相加后还要加 8 NIC、2 PSU。数量和单件可靠性同等重要。

## Reference

- [MLSysim 06 — Scaling to 1000 GPUs](https://mlsysbook.ai/mlsysim/tutorials/06_scaling_1000_gpus.html)
