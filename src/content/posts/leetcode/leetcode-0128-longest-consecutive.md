---
title: "力扣 128. 最长连续序列：用 unordered_set 拿下 O(n)"
pubDatetime: 2026-11-04T15:23:00+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 哈希表
  - C++
description: 解析力扣 128 题最长连续序列：为什么排序被否决、如何用哈希集合去重，以及通过「只从连续段头起跑」将复杂度稳定压在 O(n) 的核心思维。
problems:
  - id: 128
    title: 最长连续序列
    difficulty: 中等
    url: https://leetcode.cn/problems/longest-consecutive-sequence/
---

力扣第 128 题「最长连续序列」是一道非常经典且带强约束的算法题：
给定一个未排序的整数数组 `nums`，找出其中数字连续的最长序列的长度（要求序列元素在数值上连续，如 `[1, 2, 3, 4]`，不要求在原数组中相邻）。

**硬性要求**：设计并实现时间复杂度为 **$O(n)$** 的算法。

---

## 方案一：排序法（最直观，但通不过面试硬性要求）

直觉上最容易想到的是先排序：
把原数组 `[100, 4, 200, 1, 3, 2]` 排序为 `[1, 2, 3, 4, 100, 200]`。排完后，连续的数字就紧挨在一起了。

只需一次线性扫描：
- 下一个数比当前数大 1：长度累加；
- 下一个数与当前数相等：跳过重复项（如 `[1, 0, 1, 2]`）；
- 断开：重新开始计数。

```cpp
class SolutionSort {
public:
    int longestConsecutive(vector<int>& nums) {
        if (nums.empty()) return 0;
        sort(nums.begin(), nums.end()); // O(n log n)

        int best = 1, cur = 1;
        for (size_t i = 1; i < nums.size(); i++) {
            if (nums[i] == nums[i - 1]) continue;
            if (nums[i] == nums[i - 1] + 1) {
                cur++;
            } else {
                cur = 1;
            }
            best = max(best, cur);
        }
        return best;
    }
};
```

排序算法的大头开销是 $O(n \log n)$，因此力扣题目直接用“请设计 $O(n)$ 复杂度”锁死了这一解法，暗示我们必须使用哈希。

---

## 方案二：朴素哈希集合（最坏仍是 $O(n^2)$）

既然不能排序，我们可以把所有数字全倒进 `unordered_set<int>`：
不仅天然完成了去重，而且能在平均 $O(1)$ 的时间内查询某个数在不在。

如果对集合里的**每一个数字 $x$**，都往后探查 `x + 1`、`x + 2` 是否存在：
```cpp
// 朴素延伸：
for (int x : num_set) {
    int length = 1;
    while (num_set.count(x + length)) {
        length++;
    }
    best = max(best, length);
}
```

这里埋伏着一个极大的隐患：
假设输入是连续递增的 `[1, 2, 3, ..., n]`：
- 从 1 开始数，探查 $n$ 次；
- 从 2 开始数，探查 $n-1$ 次；
- 总查询次数高达 $n^2 / 2$ 次！整体复杂度退化为 **$O(n^2)$**，遇到大数据必定超时。

---

## 方案三：段头剪枝，实现纯线性 $O(n)$（正解）

为什么朴素延伸会退化？
因为序列里的“段中”和“段尾”数字（如 4、5、6）也在盲目往后数，做了大量的重复探查。

**破局的核心定理（段头判断）**：
一个数字 $x$ 要成为一个连续段的真正起点，**必须满足一个铁律：`x - 1` 不在集合里！**
- 比如连续序列 `3, 4, 5`：`4 - 1 = 3` 在集合里，所以 4 绝不是起点；同理 5 也不是；只有 3（`3 - 1 = 2` 不在集合里）才是正牌段头。

加上这唯一的一行判断，整个逻辑彻底蜕变为 $O(n)$：

```cpp
#include <vector>
#include <unordered_set>
#include <algorithm>
using namespace std;

class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        // 利用迭代器区间构造，一行完成去重与哈希索引
        unordered_set<int> num_set(nums.begin(), nums.end());
        int best = 0;

        for (int x : num_set) {
            // 核心剪枝：只有当 x 是连续段的段头时，才允许往后数！
            if (!num_set.count(x - 1)) {
                int cur_num = x;
                int cur_len = 1;

                while (num_set.count(cur_num + 1)) {
                    cur_num += 1;
                    cur_len += 1;
                }

                best = max(best, cur_len);
            }
        }
        return best;
    }
};
```

### 为什么加上这行判断就是 $O(n)$？
看每个数字在最坏情况下被“摸”的次数：
1. 插入哈希集合：1 次；
2. 外层循环判断 `x - 1` 是否存在：1 次；
3. 被内层 `while` 遍历到：**至多 1 次**（因为只有它所属段的唯一段头才会扫到它，其他非段头全被 `if` 拦截了）。

所有数字被访问的总次数严格被限定在 $3n$ 以内，因此整体时间复杂度是稳固的 **$O(n)$**！

---

## 总结

1. **`unordered_set` 妙用**：利用 `unordered_set(nums.begin(), nums.end())` 可以极为简洁地一行完成去重建表。
2. **复杂度分析不要被循环层数误导**：虽然代码是 `for` 嵌套 `while`，但通过段头定理保证了内层 `while` 在整场运行中最多执行 $n$ 次，均摊下来是严格的 $O(n)$。
