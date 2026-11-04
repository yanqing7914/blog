---
title: "力扣 283. 移动零：快慢双指针与 C++ 原地引用传参"
pubDatetime: 2026-11-04T15:24:00+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 双指针
  - C++
description: 移动零的三种解法与原地操作精髓：辅助数组、覆盖补零到快慢指针交换，并剖析 C++ 引用传参 vector<int>& 的核心本质。
problems:
  - id: 283
    title: 移动零
    difficulty: 简单
    url: https://leetcode.cn/problems/move-zeroes/
---

力扣第 283 题「移动零」是一道经典的数组原地操作入门题：
给定一个数组 `nums`，把所有的 `0` 移动到数组末尾，同时必须**保持非零元素的相对顺序**。

**硬性约束**：
1. 必须在原数组上操作，不能拷贝额外的数组（原地操作，空间 $O(1)$）；
2. 尽量减少完成的操作次数。

---

## 方案一：辅助数组（直觉解，但违反“原地”约束）

最容易想到的直观写法：开辟一个临时的 `vector<int> tmp`，把所有非零数推进去，再填回原数组：

```cpp
class SolutionExtra {
public:
    void moveZeroes(vector<int>& nums) {
        vector<int> tmp;
        for (int x : nums) {
            if (x != 0) tmp.push_back(x);
        }
        // 填回非零数
        for (size_t i = 0; i < tmp.size(); i++) {
            nums[i] = tmp[i];
        }
        // 后面补零
        for (size_t i = tmp.size(); i < nums.size(); i++) {
            nums[i] = 0;
        }
    }
};
```

- **问题**：虽然能通过力扣的最终内容检查，但额外空间是 $O(n)$，完全违反了题目要求的“原地”修改，在面试中是不合格的。

---

## 方案二：原地覆盖 + 补零（两遍扫描）

其实根本不需要临时数组 `tmp`，因为 `nums` 自己的开头就是最好的容器！
我们维护一个“写指针” `k`（记录下一个非零元素该放哪），再用读指针扫一遍：

```cpp
class SolutionTwoPass {
public:
    void moveZeroes(vector<int>& nums) {
        int k = 0;
        // 第一遍：把所有非零元素紧凑地移到数组最前面
        for (int i = 0; i < (int)nums.size(); i++) {
            if (nums[i] != 0) {
                nums[k++] = nums[i];
            }
        }
        // 第二遍：k 之后的所有位置全部补 0
        for (int i = k; i < (int)nums.size(); i++) {
            nums[i] = 0;
        }
    }
};
```

### 为什么原地覆盖是绝对安全的？
关键在于**数学不变量**：因为每遇到一个 0，写指针 `k` 就会落后于读指针 `i`，因此永远有 $k \le i$。
写指针 `k` 覆盖的位置，都是读指针早就看过的历史旧数据，**绝对不会冲掉任何还未处理的信息**。
这种读写双指针模式是解决 LC 26（删除有序数组中的重复项）、LC 27（移除元素）的标准范式。

---

## 方案三：快慢指针交换（单遍扫描，操作最少）

方案二要跑两次扫描，且即使数组原本全是非零（如 `[1, 2, 3]`），也必须对每个元素做一次无意义的自赋值写入。

如果改用**交换（`std::swap`）**：
把慢指针 `slow` 视为“非零元素存放边界”，快指针 `fast` 向前探路：
- 只要 `fast` 扫到非零数，就把它和 `slow` 位置交换；
- 非零数被换到前面，原本位置上的 `0` 自然被推到了后面；
- `slow` 往前推进一格。

```cpp
#include <vector>
#include <utility> // std::swap
using namespace std;

class Solution {
public:
    void moveZeroes(vector<int>& nums) {
        int slow = 0;
        for (int fast = 0; fast < (int)nums.size(); fast++) {
            if (nums[fast] != 0) {
                // 只有 slow 和 fast 不重合时才交换，避免自身与自身交换的冗余开销
                if (slow != fast) {
                    swap(nums[slow], nums[fast]);
                }
                slow++;
            }
        }
    }
};
```

- **复杂度**：时间 $O(n)$（仅需一次遍历），空间 $O(1)$。
- **操作次数最少**：如果数组全是正数，一次赋值操作都不会发生；只有在遇到 0 之后，才会产生必要的交换。

---

## 本题掌握的 C++ 关键语法

1. **`void` 与引用 `vector<int>&`**：
   与前面几题不同，本题没有返回值（`void`），要求直接改动入参。
   参数里的 `&`（引用）就是允许在函数内直接修改调用方原数组的唯一通道；如果写成 `vector<int> nums`（值传递），改动的全都是函数栈帧内的副本，外面丝毫未动。
2. **`std::swap` 的便利性**：
   在 C++ 里直接调用 `swap(a, b)` 即可完成两个变量值的交换，省去了手动引入临时中间变量的繁琐三行代码。
