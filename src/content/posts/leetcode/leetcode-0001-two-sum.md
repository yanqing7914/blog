---
title: "力扣 1. 两数之和：从暴力到单遍哈希的 C++ 演进"
pubDatetime: 2026-11-04T15:20:00+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 哈希表
  - C++
description: 两数之和的三种 C++ 解法演进：暴力 O(n^2)、两次哈希到单遍哈希，以及 unordered_map operator[] 会悄悄插入的经典大坑。
problems:
  - id: 1
    title: 两数之和
    difficulty: 简单
    url: https://leetcode.cn/problems/two-sum/
---

两数之和（LeetCode 1）是绝大多数人刷力扣的第一题。题目很短：在数组里找出两个数，使它们的和等于 `target`，返回它们的下标。

但即使是这道简单题，在 C++ 里也能踩到不少经典坑点。

## 约束里的隐藏信息

写代码之前，先算两笔账：

1. **规模账**：$2 \le n \le 10^4$。
   暴力双重循环 $O(n^2)$ 最坏大概 $5 \times 10^7$ 次计算，在 C++ 毫秒级别能跑过，但如果数据规模到了 $10^5$ 就会直接超时。
2. **值域账**：$-10^9 \le nums[i], target \le 10^9$。
   差值 `need = target - nums[i]` 最大可能是 $2 \times 10^9$，`int` 的上限是 $2.147 \times 10^9$，刚好塞得下，不需要开 `long long`；同时如此巨大的值域，直接排除了开普通数组当下标的“打表/计数桶”思路，必须用哈希表。

---

## 方案一：暴力枚举 $O(n^2)$

把直觉翻译成代码：双层循环，两两配对。

```cpp
class SolutionBrute {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();
        for (int i = 0; i < n; i++) {
            // 内层从 i + 1 开始：不和自己配对，也不重复检查之前的组合
            for (int j = i + 1; j < n; j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j}; // C++11 列表初始化，直接返回包含两个元素的 vector
                }
            }
        }
        return {};
    }
};
```

- **复杂度**：时间 $O(n^2)$，额外空间 $O(1)$。
- **C++ 细节**：`nums.size()` 返回的是无符号类型，循环变量写 `int i` 比直接跟 `size() - 1` 比较更安全，能防范空数组越界变成超大正数。

---

## 方案二：哈希表两次遍历（踩坑篇）

暴力的瓶颈在内层循环找 `target - nums[i]` 需要 $O(n)$。改用哈希表 `unordered_map<int, int>` 记录 `数值 -> 下标`，查询能降到 $O(1)$。

先看一个**典型错误写法**：
```cpp
// 错误示范：
if (seen[need]) { ... }
```

### 为什么不能用 `[]` 做查询？
C++ 的 `unordered_map` 里，`operator[]` 是带**隐式插入**行为的：当 `need` 在哈希表里不存在时，它会自动插入 `{need, 0}` 并返回默认值 0！
这会导致两个严重后果：
1. 哈希表被无辜插入脏数据，破坏了表的纯净度；
2. 如果之后碰巧有一个元素的真实下标就是 0，就会产生假匹配，引发难查的逻辑 bug。

**正确的查询方式**：
```cpp
auto it = seen.find(need);
if (it != seen.end() && it->second != i) {
    return {i, it->second};
}
```
用 `find()` 查询不会触发任何插入动作，没找到会返回 `seen.end()`。

---

## 方案三：哈希表一次遍历（面试最优解）

方案二要先建完整张表，再跑第二遍。其实只需要「边走边查」：
每遍历一个数字 `nums[i]`，先去哈希表里找互补数 `target - nums[i]`：
- 如果找到了，答案立刻揭晓，直接返回；
- 如果没找到，再把自己存进哈希表。

```cpp
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen; // 数值 -> 下标
        int n = nums.size();

        for (int i = 0; i < n; i++) {
            int need = target - nums[i];
            auto it = seen.find(need);
            if (it != seen.end()) {
                // it->first 是 key，it->second 是 value（下标）
                return {it->second, i};
            }
            // 写入场景才放心用 operator[]
            seen[nums[i]] = i;
        }
        return {};
    }
};
```

- **复杂度**：时间 $O(n)$，额外空间 $O(n)$。
- **优势**：一次扫描搞定，而且因为只去查找“前面已经看过的数”，天然杜绝了“同一个元素被自己使用两次”的问题。

---

## 本题掌握的 C++ 关键点

1. **函数签名与零拷贝**：LeetCode 参数是 `vector<int>& nums`，引用传递避免了每次调用复制上万个数字。返回值按值返回 `vector<int>` 依赖移动语义（Move Semantics），开销极小。
2. **`unordered_map` 的职责分离**：
   - **读查**：永远用 `find()` 或 `count()`；
   - **写存**：才用 `m[key] = val`。
