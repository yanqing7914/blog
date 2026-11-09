---
title: "Starship：一行配置换掉默认终端提示符"
pubDatetime: 2026-11-09T16:15:14+08:00
category: thought
draft: false
tags:
  - 随笔
  - 工具
  - 终端
description: Starship 是用 Rust 写的跨 shell 提示符。记录它怎么工作、怎么配置，以及我现在用的 Gruvbox Rainbow 配置。
---

我装 Starship，是想让终端提示符可视化一点：当前在哪个目录、哪个分支、现在几点，不用敲命令，看一眼提示符就知道。

这篇记录 Starship 是什么、怎么工作、怎么配置，以及我现在的配置。本文基于 Starship 1.26.0、zsh、macOS。

## Starship 是什么

[Starship](https://starship.rs/) 是一个命令行提示符，用 Rust 写，开源在 [starship/starship](https://github.com/starship/starship)，ISC 许可证，GitHub 上有 6 万多星。

它做的事情很简单：每次显示提示符时，检查当前目录和环境，只把相关的信息显示出来。在 git 仓库里显示分支和状态，在 Node 项目里显示 Node 版本，离开项目这些就消失。

它有三个特点：

- 跨 shell：bash、zsh、fish、PowerShell、cmd、nushell 等都能用，同一份配置到处共用
- 快：模块并行执行，我在博客仓库里跑 `starship timings`，每个模块都在 3ms 以内
- 一个配置文件：所有设置都在 `~/.config/starship.toml` 里

## 安装

需要两样东西：Starship 本身，和一个 Nerd Font 字体。提示符里的图标和箭头分隔符都靠 Nerd Font 显示，没装的话会变成方块。我装的是 JetBrains Mono Nerd Font。

macOS 上用 Homebrew 安装：

```bash
brew install starship
```

然后在 `~/.zshrc` 末尾加一行：

```bash
eval "$(starship init zsh)"
```

重开终端就生效了。其他 shell 的接入方式在官网首页都有，bash 是 `eval "$(starship init bash)"`，fish 是 `starship init fish | source`。

## 它是怎么工作的

`starship init zsh` 输出的是一段 shell 函数。它会挂到 zsh 的提示符钩子上，每次要显示提示符时调用一次 `starship prompt`，并把上一条命令的退出码、执行耗时、终端宽度、后台任务数等信息作为参数传进去。

Starship 拿到这些信息后，并行跑各个模块，再按配置把结果拼起来输出。

判断“当前是什么项目”靠的是看文件：目录里有 `package.json` 就显示 Node 版本，有 `Cargo.toml` 就显示 Rust 版本。没有命中的模块不输出任何内容，所以提示符只会显示和当前目录有关的东西。

## 配置怎么写

配置文件是 `~/.config/starship.toml`，可以分三层理解。

### 顶层 format：决定显示哪些模块

```toml
format = "$directory$git_branch$git_status$nodejs$character"
```

`$模块名` 按顺序排列，就是提示符从左到右的内容。不写 `format` 时用默认顺序。

### 模块配置：改单个模块

每个模块一张表，常用的字段是 `format`、`symbol`、`style` 和 `disabled`：

```toml
[git_branch]
symbol = "🌱 "
style = "bold purple"

[username]
disabled = true
```

### 格式字符串语法

这是 Starship 配置里最需要理解的部分：

- `$变量`：插入变量，例如 `$branch`、`$version`
- `[文字](样式)`：给一段文字加样式，例如 `[on](red bold)`
- `(...)`：括号里的变量都为空时，整段不显示，避免出现空的色块
- 样式写法：`fg:green bg:blue`、`bold italic`、`fg:#bf5700`，也可以引用自定义调色板里的颜色名

另外几个常用的全局选项：`right_format` 用来配置右侧提示符；`command_timeout` 和 `scan_timeout` 用来限制模块运行时间，防止提示符被拖慢；`palette` 和 `[palettes.xxx]` 用来定义调色板。

## 模块有多少

`starship module --list` 能列出一百多个模块，大致是这几类：

- 语言和工具链：nodejs、python、rust、golang、java、bun、deno、swift、zig……
- 版本控制：git_branch、git_status、git_commit、git_metrics（增删行数）、git_state（正在 rebase 或 merge）
- 云和容器：aws、gcloud、azure、kubernetes、docker_context、terraform
- 环境：conda、pixi、nix_shell、direnv、mise
- 系统：os、hostname、username、battery、time、cmd_duration（命令耗时）、status（退出码）、jobs

不够用还可以写 `[custom.xxx]`，自己指定一条命令，把输出作为模块显示。

## 不想自己配：用预设

官方有 12 个预设，`starship preset --list` 可以列出来：

```text
bracketed-segments  catppuccin-powerline  gruvbox-rainbow  jetpack
nerd-font-symbols   no-empty-icons        no-nerd-font     no-runtime-versions
pastel-powerline    plain-text-symbols    pure-preset      tokyo-night
```

一条命令就能写入配置：

```bash
starship preset gruvbox-rainbow -o ~/.config/starship.toml
```

注意 `-o` 会直接覆盖原文件，已经有自己配置的话先备份。

## 我现在的配置

我用的是 gruvbox-rainbow 预设，只改了一处：把用户名模块关掉。用户名每次都一样，显示出来只占位置。

```toml
[username]
disabled = true
```

在博客仓库里跑 `starship explain`，提示符从左到右是：

- 系统图标
- 目录 `…/blog-site`（最多保留 3 级）
- git 分支 `main`
- Node 版本 `v26.13.0`
- 当前时间
- 换行后的输入符（一个绿色箭头）

各段用 Gruvbox 的橙、黄、青、蓝色块拼起来，中间用箭头字符衔接。

在家目录下是这样的：

![在家目录下的 Starship 提示符：苹果图标、~ 目录和时间 16:18](./assets/starship-prompt-home.png)

家目录不是 git 仓库，也不是 Node 项目，所以分支和版本这两段直接不显示，只剩系统图标、目录和时间。进到项目目录，分支就会出现在目录后面。

我平时最常看的就是时间和分支：时间知道命令是什么时候跑的，分支确认自己没在错的分支上改代码。

## 几个好用的子命令

| 命令 | 作用 |
|---|---|
| `starship explain` | 逐段解释当前提示符里每一块是什么 |
| `starship timings` | 每个模块的耗时，提示符变慢时用来排查 |
| `starship print-config` | 输出合并默认值之后的完整配置 |
| `starship toggle <模块>` | 临时开关某个模块 |
| `starship preset <名称>` | 输出官方预设 |
| `starship bug-report` | 生成带环境信息的 GitHub issue |

## 新功能：给 Claude Code 当状态栏

较新的版本加了 `starship statusline claude-code`。在 Claude Code 的 `.claude/settings.json` 里这样配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "starship statusline claude-code"
  }
}
```

Claude Code 底部的状态栏就交给 Starship 渲染，可以显示当前模型、上下文用量和会话花费，样式同样写在 `starship.toml` 的 `[profiles]` 里。这个功能我还没试过。

## 小结

想要一个信息清楚、不用自己写 zsh 主题的提示符，Starship 的门槛很低：装好字体，`brew install`，加一行 `eval`，再挑一个预设就能用。

对我来说，换上之后目录、分支和时间都直接摆在提示符上，比原来那行纯文字直观多了。
