---
title: "力扣 49. 字母异位词分组：C++ 二维 vector 与字符签名"
pubDatetime: 2026-11-04T15:22:00+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 哈希表
  - C++
description: 字母异位词分组的 C++ 深入解析：从组长招募法到排序签名与 26 位计数法，彻底理清 vector<vector<string>> 的锯齿结构与传参细节。
problems:
  - id: 49
    title: 字母异位词分组
    difficulty: 中等
    url: https://leetcode.cn/problems/group-anagrams/
---

力扣第 49 题「字母异位词分组」是一道把 C++ 容器特性考得非常透彻的经典题：给你一个字符串数组 `strs`，把所有互为字母异位词的单词分到同一个组里。

比如输入 `["eat","tea","tan","ate","nat","bat"]`，输出分组是 `[["bat"],["nat","tan"],["ate","eat","tea"]]`。

---

## 核心认知：什么是“字符身份证”？

判定“两个词是不是异位词”，等价于判定“它们的字母组成是否完全一致”。

如果能为每个单词计算一个唯一的**“身份证”（Key）**，使得所有异位词的身份证都一模一样，那分组问题就迎刃而解：
直接用哈希表以身份证为键，把原单词追加到对应数组中！

造身份证有两种方式：
1. **排序法**：对单词字符排序。`"eat"`、`"tea"`、`"ate"` 排序后全部是 `"aet"`。
2. **计数法**：统计 26 个字母各自出现的频次。

---

## 方案一：直观暴力解（组长招募法）

在刚开始做这道题时，最容易想到的直观思路是不造身份证，直接两两比较：
每当发现一个还没入组的单词，让它当“组长”；拿着一张“点名册”（`visited`），把后面所有互为异位词的候选人拉进队伍。

```cpp
class SolutionBrute {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        int n = (int)strs.size();
        vector<bool> visited(n, false); // 点名册
        vector<vector<string>> groups;  // 最终的二维大名单

        for (int i = 0; i < n; i++) {
            if (visited[i]) continue;
            visited[i] = true;
            vector<string> group{strs[i]}; // 组长先进队伍

            for (int j = i + 1; j < n; j++) {
                if (!visited[j] && isAnagram(strs[i], strs[j])) {
                    group.push_back(strs[j]);
                    visited[j] = true; // 盖章防重复收编
                }
            }
            groups.push_back(group);
        }
        return groups;
    }

private:
    static bool isAnagram(const string& a, const string& b) {
        if (a.size() != b.size()) return false;
        string sa = a, sb = b;
        sort(sa.begin(), sa.end());
        sort(sb.begin(), sb.end());
        return sa == sb;
    }
};
```

- **复杂度**：两两比对 $O(n^2)$，每次比对排序 $O(k \log k)$，总复杂度 $O(n^2 \cdot k \log k)$。
- **虽然偏慢，但它帮我们理清了三个重要 C++ 语法**：
  1. **`vector<vector<string>>`**：这是一个动态二维数组（锯齿数组）。外层存的是动态的行，每行的列数可以完全不同；里面存的全部是真实单词，行号列号只是内存访问的相对位置。
  2. **`group{strs[i]}` 列表初始化**：C++11 允许在构造数组时直接塞入初始元素，等价于先创建空数组再 `push_back(strs[i])`。
  3. **`visited` 数组防重机制**：打过勾的单词既不会再次被别人收编，也不会自己跳出来另立山头当组长。

---

## 方案二：排序字符串做 Key（面试标准解法）

把排序后的字符串直接作为哈希表的键，单词本身挂在对应值的 `vector<string>` 后面。

```cpp
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        // 哈希表：组名（排序后） -> 该组收纳的所有原词
        unordered_map<string, vector<string>> mp;

        for (string& s : strs) {
            string key = s;
            sort(key.begin(), key.end()); // "eat" -> "aet"
            mp[key].push_back(s);         // key 不存在会自动建表，然后追加到对应 vector
        }

        vector<vector<string>> groups;
        groups.reserve(mp.size()); // 预留容量，减少外层扩容拷贝

        // C++17 结构化绑定：一次性拆解键与值
        for (auto& [key, group] : mp) {
            groups.push_back(std::move(group)); // move 移动语义，零拷贝转移数组所有权
        }
        return groups;
    }
};
```

- **复杂度**：
  - 遍历 $n$ 个字符串，每个字符串长为 $k$，排序耗时 $O(k \log k)$；
  - 哈希表插入与查询均摊 $O(1)$；
  - **总时间复杂度**：$O(n \cdot k \log k)$，比暴力快成百上千倍。
- **现代 C++ 技巧**：
  - 遍历 map 时用 `for (auto& [key, group] : mp)` 结构化绑定，代码极为清晰；
  - `std::move(group)` 把哈希表内部的动态数组直接“过户”给结果 `groups`，完全省去了一整份内存的复制。

---

## 方案三：26 位计数法签名（理论最优）

题目约束指出字符串**只包含小写英文字母**。
所以字母种类最多 26 种，直接统计 26 个字符的出现频次，可以用频次拼接一个格式化字符串（例如 `#1#0#0#0#1...`）作为 Key。

这样单次哈希签名的耗时由排序的 $O(k \log k)$ 降到纯线性的 $O(k)$，整体时间复杂度降至理论极限 **$O(n \cdot k)$**。在字符串特别长（$k$ 很大）的场景下，优势非常显著。

---

## 总结

从这道题学到的不仅是哈希表的使用，更是**类型设计与容器抽象**：
哈希表不仅能映射简单类型（`int -> int`），它的 Value 完全可以是一个动态容器（`string -> vector<string>`），这种“表套数组”的复合数据结构在实际业务和面试中都极为常见。
