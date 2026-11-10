---
title: "从 Prompt 到 Loop：AI Agent 的四层工程"
pubDatetime: 2026-11-10T15:51:15+08:00
category: thought
draft: false
tags:
  - 随笔
  - AI Agent
  - 写作
description: Prompt、Context、Harness、Loop 四个 engineering 各管什么、彼此什么关系，附出处和我自己博客流程里的例子。
---

这一年和 AI Agent 打交道，冒出来一串 engineering：prompt engineering、context engineering、harness engineering，最近又多了一个 loop engineering。名字越来越多，很容易混。

我花了点时间把出处翻了一遍，发现它们其实是一层套一层的关系，每一层管的范围比上一层大：

| 层 | 管什么 | 一句话 |
|---|---|---|
| Prompt | 一次请求怎么写 | 把话说清楚 |
| Context | 每一步模型能看到什么 | 把信息喂对 |
| Harness | 一个 Agent 在什么环境里干活 | 让它少犯错、错了能发现 |
| Loop | 谁来驱动 Agent、什么时候停 | 让系统代替你去催它 |

下面一层层说。

## Prompt engineering：把一次请求写好

这是最早、也最直观的一层：你给模型一段话，它回你一段话，你琢磨怎么写这段话能让回答更好。

常见手法有这些：

- 交代角色和任务，比如“你是一个代码审查者，找出这段代码里的并发问题”
- 给几个示例（few-shot），让模型照着格式来
- 规定输出格式，比如 JSON、表格、固定的标题结构
- 让模型先列步骤再回答

Prompt engineering 的单位是**一次调用**。它假设模型能看到的就是你这次写的这段话，问题在于写得好不好。

这个假设在聊天场景成立，到了 Agent 就不够用了。Agent 要连续调用很多次工具，每一步看到的东西都不一样，光把第一句话写好解决不了问题。

## Context engineering：决定模型每一步看到什么

2025 年 6 月，Andrej Karpathy 在 X 上表态支持用“context engineering”替代“prompt engineering”。他的理由是，大家一听 prompt 就想到日常随手写的一句任务描述，可真正的 LLM 应用里，要做的是：

> the delicate art and science of filling the context window with just the right information for the next step.

也就是在每一步，往上下文窗口里放进**刚好合适**的信息。他列出的东西包括任务描述、few-shot 示例、RAG 检索结果、多模态数据、工具、状态和历史、压缩。放少了或者形式不对，模型拿不到需要的东西；放多了或者不相关，成本上去，效果反而下降。

所以 context engineering 关心的问题变成了：

- **放什么**：系统提示、相关文件、检索到的文档、上一步工具的输出
- **不放什么**：无关的历史、过长的日志
- **怎么压缩**：对话太长时总结前文，只保留关键状态
- **放在哪**：常驻的规则放系统提示，按需加载的知识做成 Skill，用到时再读

Prompt 变成了 context 的一部分。你写的那段话依然重要，但它和工具结果、文件内容、历史记录一起，共同决定了模型这一步的判断。

## Harness engineering：给 Agent 搭工作环境

Harness 原意是马具。在 Agent 语境里有个流行的公式：

> Agent = Model + Harness

模型之外的一切都算 harness：系统提示、工具、规则文件、测试、lint、hook、检查脚本。

### 一句话版本

Mitchell Hashimoto（Ghostty、HashiCorp 的作者）在 2026 年 2 月的博客 *My AI Adoption Journey* 里给了一个很好记的定义：

> anytime you find an agent makes a mistake, you take the time to engineer a solution such that the agent never makes that mistake again.

每发现 Agent 犯一次错，就花时间做一个机制，让它以后再也不犯。他的手段有两种：

1. **更好的隐式提示**：在 AGENTS.md 里加一行。Ghostty 的 AGENTS.md 每一行都对应 Agent 曾经的一次坏行为
2. **真正的工具**：截图脚本、只跑相关测试的脚本，再在 AGENTS.md 里告诉 Agent 它们存在

### 系统化的框架

Thoughtworks 的 Birgitta Böckeler 在 2026 年 4 月发表于 Martin Fowler 网站的 *Harness engineering for coding agent users* 把这件事拆成两个维度。

**按作用时机**：

- **Guides（前馈）**：Agent 动手前引导它，提高第一次就做对的概率。例子是 AGENTS.md、Skills、脚手架脚本
- **Sensors（反馈）**：Agent 动手后检查，让它自我纠正。例子是测试、lint、类型检查、架构约束测试

两者缺一不可。只有反馈，Agent 会反复犯同一个错；只有前馈，规则写了也不知道有没有生效。

**按执行方式**：

- **计算型**：确定性的，跑在 CPU 上，毫秒到秒级，结果可靠。测试、linter、类型检查都是
- **推理型**：语义分析、AI 代码审查、LLM 当评委。更慢更贵，结果不确定，但能做语义判断

文中还有一个很实用的细节：给 Agent 看的报错，最好直接写上“应该怎么改”，作者称之为“一种正面的 prompt injection”。

至于人的角色，从逐行审代码，变成迭代 harness：同一个问题出现第二次，就该补一条规则或一个检查。

### 和 context engineering 的关系

同一篇文章的看法是：context engineering 提供了把 guides 和 sensors 交给 Agent 的手段，给 coding agent 搭 harness 是 context engineering 的一种具体形式。规则要进上下文，检查结果也要进上下文，Agent 才能据此调整。

## Loop engineering：别再亲自催 Agent

这是最新的一层。2026 年 6 月，几个人几乎同时说了同一件事：

- Peter Steinberger 在 X 上发帖：“you shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents.”
- Addy Osmani 在博客 *Loop Engineering* 里引用了 Claude Code 负责人 Boris Cherny 的话：“I don't prompt Claude anymore. I have loops running that prompt Claude and figuring out what to do. My job is to write loops.”

Addy Osmani 给的定义是：

> Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead.

以前的用法是你打一句、看结果、再打下一句，Agent 是工具，你全程握着它。Loop engineering 要你搭一个小系统：**自己发现活、分给 Agent、检查结果、记下做完了什么、决定下一步**，由这个系统去催 Agent，而不是你。

他说 loop “在 harness 上面一层”：harness 装备的是单次运行，loop 是定时跑、会派生小帮手、会自我喂养的外层系统。

### 一个 loop 由什么组成

Addy Osmani 列了五个部件加一个记忆：

1. **Automations**：按计划自动触发，做发现和分诊，这是 loop 的心跳
2. **Worktrees**：用 git worktree 隔离并行任务，两个 Agent 不会改到同一个文件
3. **Skills**：把项目知识写成 SKILL.md，Agent 不用靠猜
4. **Plugins / connectors**：用 MCP 等方式把 Agent 接到你已有的工具上
5. **Sub-agents**：一个出主意，另一个负责检查
6. **State（记忆）**：一个 markdown 文件或 Linear 看板，记录做完了什么、下一步是什么

第六点看着简单，却是所有长时间运行 Agent 的共同依赖。他的原话是：“The agent forgets, the repo doesnt.” 模型每次运行之间会忘光，记忆必须存在磁盘上，不能只放在上下文里。

他还提到，Claude Code 和 Codex 现在都有一个叫 `/goal` 的原语：持续工作，直到你写的条件真的成立，比如“test/auth 下的测试全过、lint 干净”。每一轮之后由另一个小模型判断是否完成，**写代码的 Agent 不给自己打分**。

### 要警惕的代价

Addy Osmani 自己也说，这还很早期，他持保留态度，token 成本尤其要小心。

开源社区里，[cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering) 整理了一批 loop 模式（每日分诊、PR 看护、CI 清扫、依赖升级等），并建议按 **L1 只报告 → L2 辅助 → L3 无人值守** 逐级放权，而且只有在校验器连续一周判断正确之后才升级。

花叔的《Loop Engineering 橙皮书》把代价归成四类：验证债、理解力腐蚀、token 爆炸、认知让渡。说到底，系统替你催 Agent 之后，你离代码更远了，更得有可靠的检查兜底。

## 四层放在一起看

拿“让 Agent 修一个失败的测试”举例，四层分别在做什么：

| 层 | 在这个任务里做什么 |
|---|---|
| Prompt | 写清楚“修好 `test/auth` 里失败的用例，不要改测试本身” |
| Context | 把失败日志、相关源码、最近的提交放进上下文，过长的日志先截断 |
| Harness | AGENTS.md 里写明测试命令；提交前 hook 自动跑 lint 和测试，失败就把报错喂回去 |
| Loop | CI 每次失败自动触发，Agent 在独立 worktree 里修，`/goal` 判断测试全过才停，结果写进进度文件，等人审核 |

越往下，人参与得越少，系统承担得越多。但下层并不会取代上层：loop 里的每一次 Agent 调用，依然要靠好的 context 和 harness，prompt 也依然要写清楚。

## 我自己的例子

我发博客的流程就是一个小 harness，回头看正好能对上这几层：

- **Prompt / Context**：`SKILL.md` 和写作规范告诉 Agent 文章怎么组织、哪些内容只能来自我本人
- **Harness 的前馈**：一份禁用表达清单，列出写作套话和空洞的总结句，不许出现在正文里
- **Harness 的计算型反馈**：`style_lint.py` 扫描禁用表达；`blog_publish.py check` 拦住带“待补充”标记、敏感信息、超出文章目录的改动；发布前还要跑一次构建
- **完成的定义**：只有 `verify` 确认线上页面返回 200 且包含标题，才算发布完成

写上一篇 Herdr 的时候，文章里还留着两处待补充的占位，`check` 直接拒绝发布。这就是 sensor 在起作用：Agent 想偷懒，检查不让。

这个流程目前还停在 harness 这一层：每一篇都是我开口让 Agent 写，它不会自己去发现“该写一篇了”，所以还算不上 loop。

## 小结

四个词背后其实是同一个问题，越问越大：

- Prompt：这句话怎么写？
- Context：这一步该让模型看到什么？
- Harness：怎样让 Agent 少犯错、犯了错能自己发现？
- Loop：怎样连“催 Agent”这件事都不用我亲自做？

不用急着追最新的那个词。我自己的体会是，先把 harness 搭扎实：规则写清楚，检查自动跑，错一次补一条。loop 是在这之上才立得住的东西。

## 参考

- Andrej Karpathy 关于 context engineering 的帖子：https://x.com/karpathy/status/1937902205765607626
- Mitchell Hashimoto，*My AI Adoption Journey*：https://mitchellh.com/writing/my-ai-adoption-journey
- Birgitta Böckeler，*Harness engineering for coding agent users*：https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html
- Addy Osmani，*Loop Engineering*：https://addyosmani.com/blog/loop-engineering/
- Peter Steinberger 的帖子：https://x.com/steipete/status/2063697162748260627
- cobusgreyling/loop-engineering：https://github.com/cobusgreyling/loop-engineering
- 花叔，《Loop Engineering 橙皮书》：https://github.com/alchaincyf/loop-engineering-orange-book
