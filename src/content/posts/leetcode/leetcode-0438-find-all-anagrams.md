---
title: "力扣 438. 找到字符串中所有字母异位词：定长窗口与差异计数"
pubDatetime: 2026-11-11T14:34:31+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 滑动窗口
  - 哈希表
  - C++
description: 438 题的三种 C++ 解法：从每个窗口重新计数，到定长窗口只改两格，再到用 bad 记录差异数把比较降成常数时间。
problems:
  - id: 438
    title: 找到字符串中所有字母异位词
    difficulty: 中等
    url: https://leetcode.cn/problems/find-all-anagrams-in-a-string/
---

力扣第 438 题：给两个字符串 `s` 和 `p`，找出 `s` 里所有和 `p` 互为字母异位词的子串，返回它们的起始下标。`s = "cbaebabacd"`、`p = "abc"` 时答案是 `[0, 6]`，对应子串 `"cba"` 和 `"bac"`。

这题是前面两道题拼起来的：判断异位词用第 49 题的「数 26 个字母的出现次数」，枚举子串用第 3 题的滑动窗口。只是这题的窗口长度固定，等于 `p` 的长度。

因为只有小写字母，所有方案都用长度 26 的数组当计数器，`c - 'a'` 把字母换成 0～25 的下标。

## 方案一：每个窗口排序后比较

最直接的想法：把 `s` 里每个长度为 `m` 的子串取出来，和 `p` 都排序，比较是否相同。异位词排序后必然一样。

```cpp
class SolutionSort {
public:
    vector<int> findAnagrams(string s, string p) {
        int n = (int)s.size(), m = (int)p.size();
        vector<int> res;
        sort(p.begin(), p.end());                 // p 的身份证
        for (int i = 0; i + m <= n; i++) {
            string sub = s.substr(i, m);          // 从 i 开始取 m 个字符
            sort(sub.begin(), sub.end());
            if (sub == p) res.push_back(i);
        }
        return res;
    }
};
```

- **`s.substr(起点, 长度)`**：第二个参数是长度，不是终点下标
- **`i + m <= n`** 和 `i <= n - m` 等价，但前者不用担心 `n - m` 为负
- **`p` 能直接 `sort`**：参数是值传递，动的是拷贝，不影响调用方

时间 $O((n-m+1) \cdot m \log m)$，每个窗口都要排序一次。

## 方案二：定长窗口，只改两格

方案一每换一个窗口，都要从头数一遍。但相邻两个窗口只差两个字符：

```
起点 0: c b a
起点 1:   b a e
```

中间的 `b a` 没变，出去的是 `c`，进来的是 `e`。所以拿上一个窗口的计数，把出去的减 1、进来的加 1，就是新窗口的计数。

```cpp
class SolutionCount {
public:
    vector<int> findAnagrams(string s, string p) {
        int n = (int)s.size(), m = (int)p.size();
        vector<int> res;
        if (m > n) return res;

        array<int, 26> need{}, window{};          // {} 全部初始化为 0
        for (char c : p) need[c - 'a']++;

        for (int r = 0; r < n; r++) {
            window[s[r] - 'a']++;                 // ① 右边进来
            if (r >= m) window[s[r - m] - 'a']--; // ② 左边出去
            if (r >= m - 1 && window == need)     // ③ 窗口满了就比较
                res.push_back(r - m + 1);
        }
        return res;
    }
};
```

### 两个计数器

- **`need`**：`p` 里每个字母出现几次，算一次就不再变
- **`window`**：当前窗口里每个字母出现几次，随窗口滑动更新

两个数组每一格都相等，说明窗口里的字母组成和 `p` 一样，就是异位词。

`window` 只在循环外面建一次，后面一直改它，不重新清零。

### 三个下标怎么算

窗口右端是 `r`，长度是 `m`：

| 要算的 | 公式 | `r=2, m=2` 时 |
| --- | --- | --- |
| 窗口起点 | `r - m + 1` | 1 |
| 刚被挤出去的字符 | `s[r - m]` | `s[0]` |
| 窗口什么时候装满 | `r >= m - 1` | 从 `r=1` 开始 |
| 什么时候开始有字符出去 | `r >= m` | 从 `r=2` 开始 |

前 `m` 轮只进不出，窗口慢慢填满。之后每轮进一个、出一个，长度一直是 `m`。

### 走一遍最短的例子

`s = "abab"`、`p = "ab"`、`m = 2` 的实际运行过程：

```
need: a=1 b=1
r=0  ① 进 'a'            window: a=1       ③ 窗口还没满
r=1  ① 进 'b'            window: a=1 b=1   ③ 窗口 "ab" 相等，记下起点 0
r=2  ① 进 'a'  ② 出 'a'  window: a=1 b=1   ③ 窗口 "ba" 相等，记下起点 1
r=3  ① 进 'b'  ② 出 'b'  window: a=1 b=1   ③ 窗口 "ab" 相等，记下起点 2
```

`r=2` 时窗口一度变成 3 个字符，把最左边的 `s[0]` 减掉，又回到 2 个。

### array 和普通数组的区别

这里用 `array<int, 26>` 而不是 `int[26]`，关键在 `window == need` 这一行。

`array` 可以直接用 `==` 比较内容；普通数组比较的是两个数组的**地址**，永远是 `false`。实测两个内容完全相同的数组：

```
array x==y 内容相同时:   true
int a[3]==b[3] 内容相同时: false
```

编译器对后者会直接警告 `array comparison always evaluates to false`。

另外 `{}` 不能省。写了 `array<int, 26> need{}` 才是 26 个 0，不写的话是内存里残留的随机数：

```
不写{} 的 junk: 48 0 16 0 -200392448
```

时间 $O(26 \cdot n)$：`r` 走 `n` 步，每步改两格，但 `window == need` 要比较 26 格。空间 $O(26)$。

## 方案三：用 bad 记录差异数（提交版）

方案二的瓶颈是每步都要比较 26 格。其实只关心「有没有不一样的」，不关心具体哪几格不一样。

换个角度记：`diff[c] = 窗口里 c 的个数 - p 里 c 的个数`。`diff` 全是 0 就是异位词。

再用一个整数 `bad` 表示 `diff` 里有几格不是 0。`bad == 0` 就说明是异位词，比较只要看一个数。

```cpp
class Solution {
public:
    vector<int> findAnagrams(string s, string p) {
        int n = (int)s.size(), m = (int)p.size();
        vector<int> res;
        if (m > n) return res;

        int diff[26] = {0};
        for (char c : p) diff[c - 'a']--;
        int bad = 0;
        for (int x : diff) if (x != 0) bad++;

        auto change = [&](int idx, int delta) {
            if (diff[idx] == 0) bad++;      // 改之前是 0，改完就不是 0 了
            diff[idx] += delta;
            if (diff[idx] == 0) bad--;      // 改完变成 0，这一格对上了
        };

        for (int r = 0; r < n; r++) {
            change(s[r] - 'a', +1);
            if (r >= m) change(s[r - m] - 'a', -1);
            if (r >= m - 1 && bad == 0) res.push_back(r - m + 1);
        }
        return res;
    }
};
```

### diff 的初值是 -1

```cpp
for (char c : p) diff[c - 'a']--;
```

`p = "ab"` 时，`diff` 里 `a` 和 `b` 都是 `-1`，其他是 0。意思是「窗口里还欠这两个字母」。等窗口把它们吃进来，`diff` 就回到 0。

### change 维护 bad

改一格之前，如果这一格是 0，改完就不是 0 了，所以 `bad++`。
改完之后，如果这一格变成 0，说明这一格对上了，所以 `bad--`。

这两句不是随便加的，顺序也不能反：先看改之前，再看改之后。

### 走一遍

同样用 `s = "abab"`、`p = "ab"`：

```
初始 diff: a=-1 b=-1  bad=2
r=0 进'a' → diff: b=-1          bad=1
r=1 进'b' → diff: (空)          bad=0  窗口"ab" 是异位词
r=2 进'a' → diff: a=1           bad=1 出'a' → diff: (空)  bad=0  窗口"ba" 是异位词
r=3 进'b' → diff: b=1           bad=1 出'b' → diff: (空)  bad=0  窗口"ab" 是异位词
```

`r=2` 这一轮，`a` 进来时 `diff[a]` 从 0 变成 1，`bad` 从 0 变成 1；接着 `a` 出去时 `diff[a]` 又回到 0，`bad` 变回 0。中间那一下 `bad` 临时是 1，说明窗口里确实多了一个 `a`，但出去的也是 `a`，一进一出抵消了。

时间 $O(n + m)$，每步只改两格、判断一个整数。空间 $O(26)$。

### lambda 的 [&]

```cpp
auto change = [&](int idx, int delta) { ... };
```

`[&]` 表示按引用捕获外部的变量，lambda 里修改的 `diff` 和 `bad` 就是外面那两个，不是副本。

如果写成 `[=]`，lambda 拿到的是拷贝，里面改了外面也没变，程序就错了。

把改一格的动作包成一个函数，是因为进和出都要做同样的事，写两遍容易漏掉某一句。

## 三个方案对比

| 方案 | 每个窗口怎么得到计数 | 怎么比较 | 时间 |
| --- | --- | --- | :---: |
| 一 | 重新排序 | 字符串相等 | $O(n \cdot m \log m)$ |
| 二 | 上一窗口改两格 | 比 26 格 | $O(26n)$ |
| 三 | 上一窗口改两格 | 看 `bad` 是不是 0 | $O(n)$ |

## 这题用到的 C++ 写法

- **`array<int, 26> a{}`**：固定长度数组，能用 `==` 比较内容，`{}` 全清零；普通数组 `int[26]` 比的是地址
- **`c - 'a'`**：字母转 0～25 的下标
- **`s.substr(起点, 长度)`**：第二个参数是长度
- **lambda 的 `[&]`**：按引用捕获，能改外面的变量；`[=]` 是拷贝
- **值传递的 `string s`**：LeetCode 模板就是这么给的，函数里排序、修改都不影响外面，改模板反而可能和判题机对不上

第 3 题和第 49 题的思路在这里合到一起了。第 3 题也是滑动窗口，但那题窗口长度会变、需要收缩；这题窗口长度固定，只进不出等量。
