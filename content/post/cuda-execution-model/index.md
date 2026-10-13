---
title: "[GPU硬件]  CUDA 执行模型（Execution Model）"
slug: cuda-execution-model
date: 2026-10-13T15:52:18+08:00
categories:
    - GPU硬件
math: true
---

## CUDA 执行模型（Execution Model）

> cs336 Lecture 5 slide paged 11

<img src="Pasted image 20261013145417.png" alt="Pasted image 20261013145417.png">


### 最重要的三个组件：

Thread （线程）：真正干活的搬运工。线程是GPU执行的最小单位。  
特点：（SIMT，单指令多输入）。所有的线程在同一时刻执行相同的指令，但是它们处理的数据是不同的。这是一种数据并行的模式。

Blocks（线程块）：若干个线程组成一个Block。  
特点：一个Block被绑定在某一个SM（Streaming Multiprocessor，流多处理器）上运行。同一个Block内的线程可以共享一块Shared Memory，并且可以进行同步。

Warp（线程束）：硬件调度的最小单位。这是GPU硬件架构的关键。硬件并非一个一个去调度线程，而是把32个连续编号的线程打包成一组，称为一个Warp。  
特点：Warp是GPU执行指令的基本单位。如果一个Warp里的32个线程都执行同一条指令，效率最高。

### 任务分配过程

#### Grid -> Block -> SM
<img src="Pasted image 20261013150419.png" alt="Pasted image 20261013150419.png" width="478">


蓝色框是一个CUDA Program（Grid，包含成千上万个Block，比如图中画了4096个）  
分配逻辑：绿色箭头”assign to an SM”表示，这些Block会被分发到GPU芯片上的各个SM去执行。
- 一个SM可以同时运行多个Block。
- 一个Block只能在一个SM上运行。

#### Block -> Warp
<img src="Pasted image 20261013151033.png" alt="Pasted image 20261013151033.png" width="323">


黄色框展示了$Block_i$的内部结构。一个Block里面有256个线程，硬件将256个线程每32个一组，切分成8个Wrap。每个Warp里有32个线程。


#### Warp -> Scheduler -> Core
<img src="Pasted image 20261013151850.png" alt="Pasted image 20261013151850.png" width="452">

最右侧绿色部分是SM内部的执行细节。粉色框表示Warp Scheduler（线程束调度器），SM里面有4个调度器。  
当某个Warp准备好了，调度器就会把它发送给执行单元。  
执行单元图中分为Int32（整数运算单元）和FP32（浮点数运算单元）。
- 图中“Warp 1 instruction 10”，意思是调度器正在把Warp 1的第10条指令发出去执行。
- 32个线程同时在这个单元阵列里进行运算。

####  总结

<img src="Pasted image 20261013155218.png" alt="Pasted image 20261013155218.png">


一个 CUDA 程序（Grid）包含成千上万个线程块（Block），这些 Block 被分发到 GPU 芯片上的多个流多处理器（SM）上执行（一个 SM 可运行多个 Block，但一个 Block 只能在一个 SM 上）；其次，进入 SM 内部后，一个 Block 中的线程（例如 256 个）会被硬件按每 32 个一组打包成多个 Warp（如 256/32 = 8 个 Warp），Warp 是硬件调度和执行的最小单位；最后，SM 内部的 Warp 调度器（Scheduler）将就绪的 Warp 指令发送给底层的执行单元（如 INT32 或 FP32 核心），让 Warp 中的 32 个线程以 SIMT（单指令多线程）的方式并行执行同一条指令，从而完成最终的运算。
