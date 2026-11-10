---
title: "Herdr：同时跑几十个 Agent 的终端工作区"
pubDatetime: 2026-11-10T11:09:15+08:00
category: thought
draft: false
tags:
  - 随笔
  - AI Agent
  - 工具
  - 终端
description: Herdr 是给多 Agent 场景重写的终端复用器。记录它的概念模型、Agent 状态机制，以及它的命令行能做什么。
---

我现在的 Herdr 里有十几个工作区、五十来个 Agent 窗格同时开着，大部分是 pi，还有几个 Claude Code 和 OpenCode。要是换成普通终端，光是找"哪个跑完了、哪个在等我输入"就得翻半天。

这篇介绍 Herdr 是什么、怎么用，以及它和 tmux 差在哪。

## Herdr 是什么

[Herdr](https://herdr.dev)（[herdrdev/herdr](https://github.com/herdrdev/herdr)）自称 "the runtime your coding agents live on"，GitHub 上四万多星。

先把它当终端复用器看：后台有个常驻 server 持有真实的终端进程，客户端附着上去渲染。所以关掉终端窗口、断开 SSH，里面跑的东西都不停，下次运行 `herdr` 就回到原样。这一点和 tmux 一样。

不一样的是两件事：

- 界面完全能用鼠标。点窗格、点标签、拖分割线、右键菜单、拖选复制，不用记快捷键也能用
- 它认识窗格里跑的是哪个 Agent，把状态汇总到侧边栏，让你一眼看到哪个项目在等输入

## 五个概念

Herdr 的层级是 Session → Workspace → Tab → Pane → Agent：

- **Session**：后台 server 的命名空间。直接运行 `herdr` 就是默认 session；`herdr session attach work` 起一个完全独立的运行时，有自己的窗格和 socket，但共用同一个配置文件
- **Workspace**：项目级容器，一个 repo 或一个任务开一个。侧边栏按 workspace 汇总 Agent 状态
- **Tab**：workspace 里的布局，用来分开 `agents`、`logs`、`server` 这类视角
- **Pane**：真实终端，可以向右或向下切分，客户端断开也照样存活
- **Agent**：窗格里被识别出来的进程

日常用到的其实就是 workspace 和 pane，tab 和 session 属于需要时才用。

## Agent 状态怎么来的

这是 Herdr 和普通终端最大的区别。它把窗格里的 Agent 分成五个状态：

| 状态 | 含义 |
|---|---|
| `working` | 正在跑 |
| `blocked` | 等你输入、批准或做决定 |
| `done` | 跑完了，但你还没看过 |
| `idle` | 完成或等待中，且已经看过 |
| `unknown` | 判断不了 |

`done` 和 `idle` 的区别挺贴心：跑完但没看过的会一直标着 `done`，看过就自动转成 `idle`。这样离开一会儿回来，扫一眼侧边栏就知道哪几个要处理。

判断方式有三条：看前台进程、读屏幕内容、以及 Agent 自己上报。所以分成两类：

- **Herdr 支持的**：Claude Code、Codex、GitHub Copilot CLI、Cursor Agent CLI、OpenCode、pi、Droid、Kimi Code、Qwen Code、Grok CLI 等，状态来自屏幕识别
- **自己上报的**：Crush、Kiro CLI、Muse Code 这类，什么都不用装

其他 Agent 也能正常运行，只是显示成普通终端，看不到状态。

## 集成装不装

`herdr integration install <名字>` 装的东西，和状态识别是两件事。集成主要解决"server 重启后 Agent 会话能不能恢复"。

Herdr 的持久化分几档：

| 场景 | 进程存活 | 布局恢复 | 屏幕历史 | Agent 会话 |
|---|---|---|---|---|
| 断开后重连 | 是 | 是 | 是 | 是（进程没停） |
| server 重启 | 否 | 是 | 需要屏幕历史 | 需要集成 |
| `update --handoff` | 尽力而为 | 是 | 成功则保留 | 成功则保留 |

也就是说，只要不重启 server，Agent 一直在跑。装了集成之后，即使 server 重启，也能把 Claude Code、pi 这些的原生会话接回来，而不是给你一个新 shell。

`herdr integration status` 可以看每个 Agent 装了没有。我这边目前一个都没装，所以状态全靠屏幕识别，重启后会话恢复不了——这是待办。

## 命令行能做什么

Herdr 除了界面，还有一套 CLI 走本地 socket，可以脚本化、也可以让 Agent 反过来操作 Herdr。

几个我常看的：

```bash
herdr status              # 客户端和 server 版本、协议是否兼容
herdr workspace list      # 所有工作区及 Agent 状态
herdr agent list          # 每个 Agent 的种类、状态、目录、终端标题
```

结构化的部分是这几组：

- `workspace`：list / create / get / focus / rename / close
- `tab`：list / create / get / focus / rename / close
- `pane`：split / swap / move / resize / zoom / read / send-text / send-keys / run / wait-output
- `agent`：list / get / read / prompt / wait / focus / attach / start / explain
- `worktree`：以 git worktree 形式开 workspace，create / open / list / remove

里面有两个我觉得最有意思：

```bash
# 等某个 Agent 跑完，超时就失败
herdr agent wait w3:p2 --until done --timeout 60000

# 不抢焦点，直接给某个 Agent 发 prompt
herdr agent prompt w3:p2 "把测试补上"
```

第一条让脚本能串起多个 Agent：等 A 做完再让 B 开始。第二条适合批量下发任务，你继续干自己的事，不用切窗口。

`herdr agent explain <目标> --json` 用来排查状态判断：为什么这个窗格被判成 `working` 而不是 `done`，它会告诉你依据。

还有 `herdr worktree create`，直接把某个分支以 git worktree 的形式开成一个 workspace。同一个仓库并行开几个分支、每个分支一个 Agent，互不干扰，这是个很顺的组合。

## 跨机器

Herdr 支持把多台机器的会话放进同一个窗口：

- `herdr --remote <ssh-host>`：本机当瘦客户端，连远程跑着的 Herdr
- `herdr machine`：管理保存的 SSH 机器

对在服务器上跑长任务的场景有用：任务在远端跑，本机只是看和操作。

## 和 cmux 有什么区别

我之前写过一篇 [cmux](https://gongchenhao.cn/posts/thoughts/cmux-multi-agent-terminal/)，它和 Herdr 都在解决"同时跑很多 Agent"这件事，但做法不一样，我现在两个都装着。

最直接的区别是架构：cmux 是 macOS 原生 GUI 应用，终端直接跑在本机；Herdr 是 client-server，后台一个 server 持有所有终端进程，客户端只是附着上去渲染。这带来的差异是，Herdr 断开重连很自然，还能 `herdr --remote` 连别的机器，cmux 不行。

第二个区别是 Agent 状态的来源。cmux 靠 hook：给你 shell 里的 Agent 装钩子，Agent 一停下就通知 cmux，标签亮起来。Herdr 靠识别：读前台进程和屏幕内容，不用装东西也能把窗格判成 `working` / `blocked` / `done`。前者更准，但得挨个装；后者开箱就有，偶尔会判成 `unknown`。

第三个区别在自动化。两边都有 CLI，但 Herdr 的粒度更细：

- `herdr agent wait w3:p2 --until done --timeout 60000` 可以等某个 Agent 跑完，脚本能串起来
- `herdr agent prompt` 不抢焦点就能给 Agent 发指令
- `herdr pane run`、`wait-output` 可以跑命令并等特定输出
- `herdr worktree create` 直接把某个分支开成 workspace

cmux 这边是 `new-workspace` 批量开窗格、`send` / `send-key` 发输入、`notify` 发通知，够用但没到"等某个 Agent 结束"这一层。

`done` 和 `idle` 这个区分也是 Herdr 独有：跑完没看过的标 `done`，看过转 `idle`。cmux 的通知是亮一下，看过就清掉了，没有"未读"这个状态。

我的实际用法是：Herdr 放主力，所有项目和 Agent 都在里面，靠侧边栏和 CLI 管理；cmux 用来做快速的一次性会话，开一个、问完就关。

## 配置

配置文件在 `~/.config/herdr/config.toml`，没有也能用。主要分区是 `[keys]` 快捷键、`[theme]` 主题、`[ui]` 侧边栏和鼠标行为、`[terminal]` 默认 shell、`[update]` 更新渠道。

内置十来个主题，catppuccin、tokyo-night、dracula、nord、gruvbox、kanagawa、rose-pine 这些都有，还能跟着系统明暗自动切换。`[ui]` 里我改过 `status_indicators`：默认是小圆点，改成 `"symbols"` 后用形状区分，隔远了也能看出哪行在跑、哪行在等我。

改完执行：

```bash
herdr server reload-config
```

想改快捷键之前，`herdr --default-config` 可以打印出全部默认配置，照着改。

## 和 tmux 的取舍

Herdr 好用，但也不是无脑替代 tmux：

- 它是 mouse-first 的，习惯纯键盘、纯 tmux 配置的老手会觉得多了一层
- 它盯的是 AI Agent 这个场景，`agent wait`、`agent prompt`、状态汇总这些能力对纯运维没什么用
- tmux 在哪都能装、配置一两行就够，Herdr 需要一个常驻 server 和稍微多一点的配置

我的用法是把它当"Agent 的调度台"：项目各占一个 workspace，每个 Agent 一个 pane，靠侧边栏看状态，靠 CLI 做批量和等待。

### 我用下来最看重的

是侧边栏。十几个项目、五十多个窗格铺开，靠前面那几个状态符号扫一眼就知道哪个还在跑、哪个停了，不用逐个切过去看。为此我把默认的小圆点换成了形状（`status_indicators = "symbols"`），隔远了也能分辨。

另一个好处是启动成本低：什么都不装，Agent 一跑起来状态就有了，不需要先配 hook 再验证。

键位我没改，`config.toml` 里到现在也没有 `[keys]` 段，鼠标加上少数几个默认快捷键够用。

## 上手三步

1. 装好（`curl -fsSL https://herdr.dev/install.sh | sh`，或 Homebrew），`cd` 到项目里运行 `herdr`
2. 在窗格里启动你常用的 Agent，看侧边栏能不能识别出状态
3. 跑 `herdr integration install <你的 Agent>`，让 server 重启后会话能恢复

现在我这边十几个工作区、五十多个窗格都住在一个 Herdr 里，找"哪个在等我"这件事基本不用花时间了。

