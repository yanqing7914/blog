---
title: "力扣 11. 盛最多水的容器：对撞双指针与短板淘汰证明"
pubDatetime: 2026-11-04T15:21:00+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 双指针
  - C++
description: 盛最多水的容器双指针解法深度推导：从数学公式证明为什么必须移动短板，以及指针跳跃消除无效计算的进阶技巧。
problems:
  - id: 11
    title: 盛最多水的容器
    difficulty: 中等
    url: https://leetcode.cn/problems/container-with-most-water/
---

力扣第 11 题「盛最多水的容器」是双指针经典题：给定一个长度为 $n$ 的数组 `height`，选出两条垂线与 x 轴围成容器，求能装的最大水容量。

题目规定不能倾斜容器，水面高度取决于两根线中较短的那根（木桶短板效应）：
$$\text{Area}(l, r) = \min(h[l], h[r]) \times (r - l)$$

数据规模 $2 \le n \le 10^5$。所以 $O(n^2)$ 的两两暴力配对约有 $5 \times 10^9$ 次运算，必超时。必须用 $O(n)$ 时间解决。

---

## 核心洞察：为什么移动短板是安全的？

很多初学者能记住“移动较矮的那一侧”，但不清楚为什么不会漏掉最优解。其实有一套严格的数学淘汰逻辑。

假设当前左右边界为 $l$ 和 $r$，且左板偏短：$h[l] \le h[r]$。

如果我们固定左板 $l$，去和任何一个内部的右板 $k$（$l < k < r$）组合，其面积必然有：
$$\text{Area}(l, k) = \min(h[l], h[k]) \times (k - l) \le h[l] \times (k - l) < h[l] \times (r - l) = \text{Area}(l, r)$$

也就是说：**只要 $l$ 是短板，$l$ 与任何内部线组合出来的容量，绝对不可能超过当前面积！**

因此，记下当前面积后，**左指针 $l$ 可以被彻底安全淘汰（`l++`）**。
直觉上的解释很简单：向内缩进时宽度必然变小，想让面积变大，唯一的希望就是让短板长高。动长板毫无意义，动短板才有翻盘的机会。

---

## 方案一：标准对撞双指针 $O(n)$

从两端开始，每轮更新最大值，淘汰短板：

```cpp
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int maxArea(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1;
        int best = 0;

        while (l < r) {
            int area = min(height[l], height[r]) * (r - l);
            best = max(best, area);

            // 哪边矮就淘汰哪边；高度相等时淘汰任意一边均可
            if (height[l] <= height[r]) {
                l++;
            } else {
                r--;
            }
        }
        return best;
    }
};
```

- **时间复杂度**：$O(n)$，左右指针相向而行，最多移动 $n-1$ 次。
- **空间复杂度**：$O(1)$，纯指针操作。

---

## 方案二：短板跳跃优化（剪掉无效轮次）

标准双指针每移一格就要算一次面积。但细想一下：
如果淘汰短板后，新遇到的板**比刚才的短板还要矮（或者一样高）**，那宽度缩水、高度没变，新面积必定比刚才更小，何必浪费时间再算一遍 `min` 和乘法？

可以直接用 `while` 循环跳过这些注定无用的矮板：

```cpp
class SolutionOptimized {
public:
    int maxArea(vector<int>& height) {
        int l = 0, r = (int)height.size() - 1;
        int best = 0;

        while (l < r) {
            int h = min(height[l], height[r]);
            best = max(best, h * (r - l));

            // 跳过所有小于等于当前短板的无效位置
            while (l < r && height[l] <= h) l++;
            while (l < r && height[r] <= h) r--;
        }
        return best;
    }
};
```

在测试用例包含平原、递增/递减台阶时，这个跳跃优化能大幅降低运算耗时，更接近极限性能。

---

## 总结

对撞双指针的核心不仅是“左右两头往中间夹”，而是背后的**排除法逻辑（剪枝）**：
优化 $O(n^2)$ 暴力的最高境界，不是把计算变快，而是**从数学上证明有一大半组合注定比现在差，根本不必计算**。
LC 167（两数之和 II）、LC 125（验证回文串）均遵循同款对撞设计。
