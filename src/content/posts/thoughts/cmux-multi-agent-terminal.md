---
title: "cmux：给多 Agent 编程准备的终端"
pubDatetime: 2026-11-09T13:46:36+08:00
category: thought
draft: false
tags:
  - 随笔
  - AI Agent
  - 工具
description: 同时跑 pi、Claude Code、OpenCode、Codex，原生终端切来切去太累，换成 cmux 后切 session 顺手多了。
---

我平时写代码会同时开好几个 Agent：pi、Claude Code、OpenCode、Codex。之前全靠 macOS 原生终端，一个 Agent 一个窗口或标签页，开多了就得一个个点过去看，哪个在跑、哪个停下来等我，得自己记。

后来换成了 cmux，最直接的感受是：切换 session 快了，用起来很丝滑。现在我一般同时跑三个 Agent。

这篇记录 cmux 是什么、我怎么装的、日常怎么用。版本是 0.65.2，macOS。

## cmux 是什么

cmux（[manaflow-ai/cmux](https://github.com/manaflow-ai/cmux)）是一个 macOS 原生终端，底层用的是 Ghostty 的 libghostty，专门照顾“同时跑很多个 AI 编程 Agent”这个场景：

- 左侧是竖排的工作区列表，每个工作区能看到 git 分支、监听端口和最近一条通知
- Agent 停下来等输入时，对应的工作区会亮起提醒
- 支持分屏，还有内置浏览器窗格
- 带一个 `cmux` 命令行，通过 Unix socket 控制整个应用，能用脚本开工作区、发按键、发通知

搜 cmux 时容易搜到另一个同名项目 soheilhy/cmux，那是 Go 写的连接复用库，让 gRPC、HTTP 共用一个端口，和这个终端没有关系。

## 安装：让 Agent 装

cmux 是我直接让 Agent 帮我装的，没自己动手。装好后有 `/Applications/cmux.app`，命令行 `cmux` 是 app 里自带的二进制，被链接到了 `/opt/homebrew/bin/cmux`。

这也是 cmux 对 Agent 友好的地方：它的帮助信息本身就是写给 Agent 看的。`cmux --help` 里专门有一段 Agent Help，告诉 Agent 去跑 `cmux guide` 或 `cmux --skill` 拿完整说明，改配置前先备份。所以后面配置、装 hook 这些事，也可以接着交给 Agent。

配置分两层：

- 终端本身的外观（字体、主题、透明度、快捷键）沿用 Ghostty 的配置文件 `~/.config/ghostty/config`
- cmux 自己的设置放在 `~/.config/cmux/cmux.json`

两边改完都不用重启，执行一句：

```bash
cmux reload-config
```

我目前没改过任何配置，`cmux.json` 只有 schema 声明，默认设置已经够用：

```json
{
  "$schema": "https://raw.githubusercontent.com/manaflow-ai/cmux/main/web/data/cmux.schema.json",
  "schemaVersion": 1
}
```

带上 `$schema` 之后，在编辑器里写配置有字段补全，不用猜键名。

## Agent 通知

多 Agent 并行时，最浪费时间的往往不是 Agent 慢，而是它早就停下来等你，你却在另一个窗口里没看到。cmux 的做法是给各家 Agent 装 hook，Agent 一停下就通知 cmux：

```bash
# 给 PATH 上所有支持的 Agent 装 hook
cmux hooks setup

# 或者只装一个
cmux hooks opencode install
```

我用的四个都在支持列表里。Claude Code 和 pi 通过 cmux 的包装命令启动时会自动注入 hook，不用单独装；Codex 和 OpenCode 用 `cmux hooks` 装一下就行。

收到通知后可以直接跳过去：

```bash
cmux jump-to-unread       # 跳到最近一条未读通知所在的位置
cmux list-notifications   # 列出所有通知
```

## 用命令行开工作区

`cmux` 命令行基本覆盖了界面上的操作。最常用的是开工作区：

```bash
# 在新工作区打开某个目录
cmux ~/blog-site

# 指定名字、目录和启动命令
cmux new-workspace --name blog --cwd ~/blog-site --command "npm run dev"
```

既然每天都要开几个 Agent，可以把它写成一个开工脚本，一次把工作区都开好。下面是一个示例，项目路径换成自己的：

```bash
#!/usr/bin/env bash
# start-agents.sh：每个 Agent 一个工作区
set -euo pipefail

cmux new-workspace --name "pi"     --cwd ~/project-a --command "pi"
cmux new-workspace --name "claude" --cwd ~/project-b --command "claude"
cmux new-workspace --name "codex"  --cwd ~/project-c --command "codex"
```

如果想在一个工作区里左右分屏，一边跑 Agent、一边跑开发服务器，可以用 `--layout`：

```bash
cmux new-workspace --name "blog" --cwd ~/blog-site --layout '{
  "direction": "horizontal", "split": 0.5,
  "children": [
    {"pane": {"surfaces": [{"type": "terminal", "command": "opencode"}]}},
    {"pane": {"surfaces": [{"type": "terminal", "command": "npm run dev"}]}}
  ]
}'
```

还有几个适合写进脚本的命令：

- `cmux send` / `cmux send-key`：往某个窗格里输入文字或按键
- `cmux notify --title ... --body ...`：自己发一条通知，比如长任务跑完提醒自己
- `cmux set-status` / `cmux set-progress`：在侧边栏显示自定义状态和进度条

## 多 Agent 协作

cmux 不只是把 Agent 并排放着，还能让它们互相传话。这部分我用过：

- `cmux agent message <目标> <内容>`：给另一个窗格里的 Agent 发消息
- `cmux agent inbox`：查看收到的消息
- `cmux claude-teams` / `cmux codex-teams`：以团队模式启动 Claude Code 或 Codex
- `cmux agent-hibernation`：让闲置的 Agent 休眠

## 和原生终端比

我之前一直用 macOS 原生终端。换过来最明显的差别就是切 session：所有 Agent 都排在左边的侧边栏里，点一下或用快捷键就能切过去，谁在等输入一眼能看出来，不用一个个窗口翻。

cmux 的局限也说一下：

- 只支持 macOS
- 迭代很快，命令和配置项可能随版本变化，本文基于 0.65.2，用之前可以先跑 `cmux help` 或 `cmux guide` 对一下

## 三步上手

1. 安装 cmux（让 Agent 装也行），打开一个项目目录：`cmux <项目路径>`
2. 执行 `cmux hooks setup`，让 Agent 停下时能通知到你
3. 有固定工作流后，用 `cmux new-workspace` 写一个开工脚本

现在我同时跑三个 Agent，切来切去不再是负担。
