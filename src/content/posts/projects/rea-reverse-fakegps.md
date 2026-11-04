---
title: "用 REA 逆向一款虚拟定位 App，把自己的免 root 定位工具做成"
pubDatetime: 2026-11-04T13:59:36+08:00
category: project
draft: false
tags:
  - Android
  - 逆向工程
  - REA
description: 高德打开 5 秒就跳回真实位置，用 REA + jadx 看清一款闭源虚拟定位 App 的做法，对齐后在小米上跑通。
techStack:
  - Kotlin
  - Android
  - REA
  - jadx
repo: https://github.com/yanqing7914/FakeGps
featured: false
---

这篇记录 FakeGps 的开发过程，重点讲怎么用 [REA](https://github.com/morluto/rea)（Reverse Engineer Anything）分析一个闭源 Android App，以及逆向结果能告诉你什么、不能告诉你什么。

先说结论：REA 帮我在半小时内把对方的核心逻辑看清楚了。照着它的行为对齐以后，我发现自己的实现里有几处多做的事，删掉以后，FakeGps 在小米 14 Pro 上可以正常使用了。

## 1. 背景

需求很简单：做一个免费、免 root 的 Android 模拟定位 App，在小米 14 Pro（HyperOS，Android 15）上能用。

Android 的做法是公开的：在开发者选项里把 App 选为“模拟位置信息应用”，然后调用 `LocationManager.addTestProvider` 注册测试定位来源，再用 `setTestProviderLocation` 不断推送坐标。核心代码几十行。

第一版很快就能用了，微信里的位置会变。但高德地图有个稳定复现的现象：**打开时显示模拟位置，大约 5 秒后跳回真实位置**。而市面上一款付费的虚拟定位 App（下文称 App X）在同一台手机上，用户反馈是正常的。

在没有真机日志的情况下，我改了好几版参数都没用。于是决定用 REA 看看 App X 到底做了什么。

## 2. 边界：逆向是为了理解，不是为了复制

动手之前先划清楚：

- App X 闭源、付费、没有开源协议。**不复制它的代码，不重新打包它**。逆向只用来理解它调用了哪些系统接口、用了什么参数，然后用自己的代码重写。
- 不做任何绕过检测的事。比如改包名躲开别家 App 的黑名单，这类事情不做。
- 这篇文章里不写 App X 的名字、包名和真实类名，示例里的类名都做了替换。

## 3. REA 是什么

REA 是一个面向 AI 编程助手的逆向工具集，以 MCP 服务器的形式接入 Claude Code、Codex、Cursor 这类 Agent，也可以直接在终端里用 CLI。它把 jadx、Ghidra、Hopper、apktool 这些工具包装成统一的命令，输出带证据（哈希、调用记录、原始结果）的 JSON，适合让 Agent 一步步追问。

对 Android 来说，REA 的 APK 分析走 jadx，常用命令有这几个：

| 命令 | 作用 |
| --- | --- |
| `inspect-android-package` | 解析 APK 的清单和声明，确认引擎能加载 |
| `search-android-classes` | 按类名子串搜索（区分大小写） |
| `inspect-android-class` | 列出一个类的方法和字段，包括静态常量值 |
| `inspect-android-method` | 反编译单个方法 |
| `trace-android-references` | 找某个类或方法被哪里调用 |

## 4. 环境搭建

### 4.1 安装 REA 并接入 Agent

REA 要求 Node.js 22.x（≥22.23.4）、24.x（≥24.22.1）或 26.12.1 及以上。我的机器上是 26.12.0，差一个小版本，先升级：

```bash
brew upgrade node
node -v   # v26.12.1
```

然后运行 setup。建议先用 `--dry-run` 看它要改哪些配置文件：

```bash
npx rea-agents setup --all-detected --dry-run
```

它检测到了机器上的 11 个 Agent。我只给常用的几个配置：

```bash
npx rea-agents setup --yes \
  --client claude_code --client codex --client cursor --client gemini_cli --client pi
```

setup 会给每个被修改的配置文件生成 `.rea.backup` 备份，撤销起来很方便。验证一下：

```bash
claude mcp list | grep rea
# rea: npx -y rea-agents@6.8.0 mcp - ✔ Connected
```

### 4.2 准备 jadx 提供者

第一次跑 APK 分析会直接报错：

```text
Set REA_JADX_MCP_JAR to the absolute path of a caller-supplied
jadx-headless-mcp 0.7.1 JAR. REA does not download or install it.
```

REA 不会自己下载 jadx 组件，需要手动准备两样东西：

1. **Java 17**：`brew install openjdk@17`
2. **jadx-headless-mcp 0.7.1**：下载地址可以在 REA 的 npm 包里找到，`dist/android/JadxRelease.js` 里写着固定的 release URL。

```bash
mkdir -p ~/.rea && cd ~/.rea
curl -L -o jadx-headless-mcp-0.7.1-all.jar \
  https://github.com/1013503897/jadx-headless-mcp/releases/download/v0.7.1/jadx-headless-mcp-0.7.1-all.jar
unzip -tq jadx-headless-mcp-0.7.1-all.jar && echo OK   # 一定要校验
```

这里踩了个坑：第一次下载走代理被截断，只下了 2.4 MB（完整的是 42 MB）。`doctor` 报的是 `ZIP archive is malformed: End of central directory not found`。**大文件下完先 `unzip -t` 校验**，APK 也一样。

设置环境变量，然后用 `doctor` 确认：

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH=$JAVA_HOME/bin:$PATH
export REA_JADX_MCP_JAR=$HOME/.rea/jadx-headless-mcp-0.7.1-all.jar

npx rea-agents@6.8.0 doctor --format json | jq '.providerInspections[] | {id, available}'
# { "id": "jadx", "available": true }
```

`healthy` 仍然是 false，因为 Ghidra 和 IDA 没装，分析 APK 用不到它们，可以不管。

## 5. 分析过程

### 5.1 加载 APK

```bash
npx rea-agents@6.8.0 inspect-android-package /tmp/target.apk --format json > pkg.json
```

输出里有一段 `loaded`：

```json
{ "state": "LOADED", "class_count": 8525, "resource_count": 1584 }
```

8525 个类，大部分是第三方 SDK（百度地图、广告、Bugly 等），自己写的代码只占很小一部分。

### 5.2 用类名缩小范围

`search-android-classes` 的第二个参数是**位置参数**，不是 `--query`（我第一次写成了 `--query`，报 `Unknown flag`）。查询区分大小写，所以大小写都要试：

```bash
for q in mock Mock Location Gps; do
  npx rea-agents@6.8.0 search-android-classes /tmp/target.apk "$q" --format json \
    | jq -c '.normalized_result.matches'
done
```

结果很说明问题：

- `mock`（小写）匹配到一堆 `com.example.mockgps.*`，主要是界面
- `Mock`（大写）只匹配到一个类：`com.example.service.MockGpsService`
- `Location` 匹配到的几乎全是百度地图 SDK 的类，跟模拟定位无关

服务类只有一个，范围一下子就缩小了。

### 5.3 看类的“目录”

```bash
npx rea-agents@6.8.0 inspect-android-class /tmp/target.apk \
  "com.example.service.MockGpsService" --format json \
  | jq -r '.normalized_result.methods[] | select(.name | startswith("access$") | not) | .reported_signature'
```

过滤掉编译器生成的 `access$xxx` 以后，剩下的方法名基本就是一份设计说明：

```text
configureProvider(String, boolean, boolean): void
injectProvider(String): boolean
generateLocation(String): Location
recordProviderReadback(String): void
acquireWakeLock(): void
removeProvider(String): void
onStartCommand(Intent, int, int): int
onDestroy(): void
...
```

**字段的静态常量值**更有用，REA 会直接读出 dex 里的常量：

```bash
... | jq -r '.normalized_result.fields[] | select(.dex_static_value) | "\(.name) = \(.dex_static_value.value)"'
```

```text
UPDATE_INTERVAL_MS = 10
READBACK_INTERVAL_MS = 5000
RETRY_INTERVAL_MS = 5000
HEARTBEAT_INTERVAL_MS = 60000
```

推送间隔是 **10 毫秒**，而我当时用的是 200 毫秒。这是第一个具体的差异。

### 5.4 反编译关键方法

`inspect-android-method` 的类名和方法名都是**位置参数**：

```bash
npx rea-agents@6.8.0 inspect-android-method /tmp/target.apk \
  "com.example.service.MockGpsService" configureProvider --format json \
  | jq -r '.normalized_result.source.text'
```

几个关键方法的结论如下（不贴原代码，只写行为）：

- **`configureProvider`**：Android 12 及以上用 `ProviderProperties.Builder`，gps 和 network **都声明** `POWER_USAGE_LOW` 加 `ACCURACY_FINE`，然后 `setTestProviderEnabled(true)`。
- **`injectProvider`**：来源还没就绪就先注册；注册失败的话，5 秒后再重试，不会一直狂刷；就绪后调用 `setTestProviderLocation`。
- **`generateLocation`**：`accuracy=2.0`、`altitude=55.0`、`bearing=1.0`、`time`、`elapsedRealtimeNanos`，extras 里放 `satellites=7`。没有设置 speed，也没有设置各种 accuracy 字段。
- **`recordProviderReadback`**：每 5 秒用 `getLastKnownLocation` 读一次系统里的位置，检查是不是 mock、离目标是否在 10 米以内。它也在做“注入有没有生效”的自检。

### 5.5 REA 拆不开的地方，换 jadx CLI

推送循环在一个匿名内部类 `MockGpsService$b` 里。REA 的 `inspect-android-class` 对这个内部类返回的是空结果，`search-android-classes` 也搜不到它。

这时直接用 jadx CLI，按单个类导出（比全量反编译快得多）：

```bash
brew install jadx
jadx -d out --single-class "com.example.service.MockGpsService" --show-bad-code target.apk
```

jadx 对这个方法的控制流还原得也不完整（`Code decompiled incorrectly`），但加上 `--show-bad-code` 后，主干还是能看懂的：

1. 每次循环先检查 `isLocationEnabled()`
2. 拿 wake lock
3. 依次 `injectProvider("gps")`、`injectProvider("network")`
4. 每 5 秒做一次 readback
5. 成功的话 10ms 后再跑一次；全部失败就退到 5 秒

### 5.6 用全量反编译排除“暗道”

为了确认它有没有用到别的手段（root、Shizuku、VPN、无障碍），我做了一次全量反编译，然后用 grep 来排除：

```bash
jadx -d full --no-res --threads-count 8 target.apk     # 约 4 分钟，8232 个源文件
grep -rl "addTestProvider" full/sources                   # 只有 MockGpsService 一处
grep -rln "VpnService\|shizuku\|Runtime.getRuntime().exec" full/sources
# 只命中第三方 SDK 的工具类，App 自己的代码里没有
```

再用 `aapt2` 看清单，确认它没有声明 VPN 或无障碍服务：

```bash
aapt2 dump badging target.apk | grep uses-permission
aapt2 dump xmltree --file AndroidManifest.xml target.apk | grep -A3 "E: service"
```

**结论：App X 只用了 Android 公开的测试定位接口，只接管 gps 和 network，不接管 fused，10ms 推送一次。没有任何隐藏通道。**

## 6. 和自己的实现对比

| 项目 | App X | FakeGps 早期 | FakeGps 1.4.0 |
| --- | --- | --- | --- |
| 推送间隔 | 10ms | 200ms | 10ms |
| 接管来源 | gps、network | gps、network、fused | gps、network |
| 提供者属性 | 都是低功耗 + 高精度 | gps 高功耗、network 低精度 | 都是低功耗 + 高精度 |
| 位置字段 | accuracy=2、alt=55、bearing=1、satellites=7 | 多设了 speed 和各种 accuracy | 对齐 |
| wake lock | 有 | 没有 | 有 |
| 周期性重新注册 | 没有 | 1.3.0 加过，后来删了 | 没有 |

照着这张表，我把行为全部对齐，代码是自己重写的。顺带发现自己 1.3.0 引入过两个问题：一是“每 2 秒删掉再重新注册来源”，删掉的那一下会留出空档；二是“自己去监听定位”，这会让系统打开真实的定位硬件。两者都可能把真实位置放进来，已经删掉了。

## 7. 对齐之后

对齐后的 1.4.0 第一次在手机上测试，高德仍然会在 5 秒后跳回真实位置。这时候我手里最有用的，是 App 自己导出的**读回数据**：

```text
推送成功 gps=1453 network=1453 失败=0
推送中断: 次数=0
passive: mock=true 距目标=0m age=16ms
fused:   mock=true 距目标=0m age=1668496ms
```

`passive` 是全系统的“旁听”来源，系统发给任何 App 的定位它都能看到。这份数据至少证明了两件事：注入一直是成功的，推送一次都没断；App 也没有被系统冻结。所以问题不在“推不进去”，排查的方向就收窄了。

继续在真机上调试之后，现在 FakeGps 在小米 14 Pro 上可以正常使用。

## 8. 经验

**关于 REA**

- 先 `doctor`，再干活。jadx 提供者要自己准备，下载完先校验完整性。
- CLI 参数以 `--help` 为准，`search-android-classes` 和 `inspect-android-method` 都用位置参数。
- `inspect-android-class` 列出的方法名和静态常量，往往比反编译出来的代码更快告诉你设计意图。`UPDATE_INTERVAL_MS = 10` 这种常量，一眼就能看出差异。
- 匿名内部类、控制流复杂的方法，REA 可能拆不开，这时用 `jadx --single-class --show-bad-code` 补上。
- 想确认“它没有做什么”，全量反编译加 grep 很可靠；要搜整个 APK 时，这比逐个类追问快得多。

**关于逆向本身**

- 逆向能告诉你别人**怎么做的**。照着对齐时，最大的收获往往是发现自己**多做了什么**：多接管的 fused、周期性重新注册、自己去监听定位，这些都是我自己加进去的。
- 比读别人代码更重要的，是在真机上拿到读回数据。从 `getLastKnownLocation` 读回四个定位来源，能直接排除“推不进去”和“被系统冻结”这两类原因。
- 守住边界：理解行为、自己重写，不复制代码，不绕过别人的检测。

**关于工程**

- 第一天就 `git init`，尽早建回归测试。FakeGps 后来补了 13 个单元测试和 5 个设备测试，其中一个用例专门保证“不接管 fused”。我故意把它改回去，测试会立刻报错。
- 诊断工具自己也会出 bug：一个格式串写错，导致点“开始”就闪退；一个监听没挂上，日志里的 0 是假的。观测代码同样需要测试。

---

FakeGps 代码：<https://github.com/yanqing7914/FakeGps>。只用于开发测试，请不要用于考勤打卡、签到等需要真实位置的场景。
