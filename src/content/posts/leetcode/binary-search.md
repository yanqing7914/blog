---
title: 二分查找专题：一套模板搞定边界问题
pubDatetime: 2026-11-02T20:00:00+08:00
category: leetcode
tags:
  - 二分查找
  - 力扣
description: 用"找第一个满足条件的位置"统一理解二分，串起 5 道代表题。
problems:
  - id: 704
    title: 二分查找
    difficulty: 简单
    url: https://leetcode.cn/problems/binary-search/
  - id: 35
    title: 搜索插入位置
    difficulty: 简单
    url: https://leetcode.cn/problems/search-insert-position/
  - id: 34
    title: 在排序数组中查找元素的第一个和最后一个位置
    difficulty: 中等
    url: https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/
  - id: 153
    title: 寻找旋转排序数组中的最小值
    difficulty: 中等
    url: https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/
  - id: 4
    title: 寻找两个正序数组的中位数
    difficulty: 困难
    url: https://leetcode.cn/problems/median-of-two-sorted-arrays/
---

> 这是一篇**示例刷题专题**，演示刷题文章的结构，内容请替换成你自己的。

## 核心思路

二分的本质不是"找某个值"，而是**在单调的判定条件上找分界点**：

```
条件:  F F F F T T T T
             ↑
        找第一个 T
```

只要能写出一个"左边全 false、右边全 true"的判定函数，就能用同一套模板。

## 模板（左闭右开）

```python
def lower_bound(nums, target):
    lo, hi = 0, len(nums)          # [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] >= target:    # 判定条件
            hi = mid
        else:
            lo = mid + 1
    return lo                      # 第一个 >= target 的位置
```

## 代表题

| 题号                                                                                        | 题目                     | 难度 | 判定条件                                   |
| ------------------------------------------------------------------------------------------- | ------------------------ | ---- | ------------------------------------------ |
| [704](https://leetcode.cn/problems/binary-search/)                                          | 二分查找                 | 简单 | `nums[mid] >= target`，再检查是否相等      |
| [35](https://leetcode.cn/problems/search-insert-position/)                                  | 搜索插入位置             | 简单 | 直接就是 `lower_bound`                     |
| [34](https://leetcode.cn/problems/find-first-and-last-position-of-element-in-sorted-array/) | 查找第一个和最后一个位置 | 中等 | `lower_bound(t)` 和 `lower_bound(t+1) - 1` |
| [153](https://leetcode.cn/problems/find-minimum-in-rotated-sorted-array/)                   | 旋转数组最小值           | 中等 | `nums[mid] <= nums[-1]`                    |
| [4](https://leetcode.cn/problems/median-of-two-sorted-arrays/)                              | 两个正序数组的中位数     | 困难 | 二分切分位置                               |

## 常见错误

1. **死循环**：`lo = mid` 搭配 `mid = (lo + hi) // 2`，区间剩两个元素时不再缩小。
2. **区间定义混用**：开头写 `hi = len(nums)`，循环里却按闭区间 `hi = mid - 1` 更新。
3. **忘记检查结果越界**：`lower_bound` 可能返回 `len(nums)`。

## 总结

先问自己"判定条件是什么、是否单调"，再套模板，边界问题基本就不会出错。
