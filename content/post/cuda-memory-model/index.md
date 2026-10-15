---
title: "[GPU硬件]  GPU 内存模型（Memory Model）"
slug: cuda-memory-model
date: 2026-10-15T00:00:00+08:00
categories:
    - GPU硬件
---

> cs336 Lecture 5 slide paged 12

<img src="Pasted image 20261013213536.png" alt="Pasted image 20261013213536.png">

Device是 GPU 端，一次 GPU kernel 启动一个 Grid，Grid 包含多个 Block，每个 Block 包含多个 Thread。  
每一个Thread可以读写它自己的register和local memory；  
每一个Block可以读写同一份shared memory；  
所有Block的Thread都可以读写一份global memroy，都可以读取同一份constant memory。

Host 是 CPU 端：负责准备数据、向 GPU 传输数据、启动计算，再取回结果。

**示例**：Block (0,0) 中，一个线程把数据写入 shared memory，块内同步后，其他线程就能读取。Block (0,1) 中的线程一般不能直接读取前一个 Block 的 shared memory；跨块交换结果通常要借助 global memory，并安排正确的同步。
