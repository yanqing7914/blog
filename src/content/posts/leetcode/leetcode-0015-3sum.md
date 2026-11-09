---
title: "力扣 15. 三数之和：排序去重与对撞双指针的 C++ 解法"
pubDatetime: 2026-11-09T14:31:04+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 哈希表
  - 双指针
  - C++
description: 三数之和的三种 C++ 解法：三重循环讲清每一层去重的作用，哈希把问题降成两数之和，对撞双指针做到 O(n²) 时间 O(1) 空间。
problems:
  - id: 15
    title: 三数之和
    difficulty: 中等
    url: https://leetcode.cn/problems/3sum/
---

三数之和（LeetCode 15）要在数组里找出所有和为 0 的三元组，而且结果里不能有重复的三元组。

找三元组不难，难的是去重。示例 `[-1,0,1,2,-1,-4]` 里有两个 `-1`，不处理的话 `[-1,0,1]` 会出现两次。三种解法的区别，主要就在去重和第三个数怎么找。

数据规模 $n \le 3000$，$O(n^3)$ 大约 $4.5 \times 10^9$ 次运算，必超时，目标是 $O(n^2)$。

## 先排序

三种解法第一步都是排序：

```cpp
sort(nums.begin(), nums.end());
```

`[-1,0,1,2,-1,-4]` 排完是 `[-4,-1,-1,0,1,2]`。排序后相同的值挨在一起，去重只要看「我和前一个是不是一样」就行。

因为参数是 `vector<int>& nums`，这里排的是调用方传进来的原数组。题目不关心输入被改，所以没问题。

## 方案一：三重循环 $O(n^3)$

```cpp
class SolutionBrute {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = (int)nums.size();
        vector<vector<int>> res;
        for (int i = 0; i < n; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;              // 第一位去重
            for (int j = i + 1; j < n; j++) {
                if (j > i + 1 && nums[j] == nums[j - 1]) continue;      // 第二位去重
                for (int k = j + 1; k < n; k++) {
                    if (k > j + 1 && nums[k] == nums[k - 1]) continue;  // 第三位去重
                    if (nums[i] + nums[j] + nums[k] == 0)
                        res.push_back({nums[i], nums[j], nums[k]});
                }
            }
        }
        return res;
    }
};
```

这个方案过不了提交，但它把去重规则讲得最清楚，也是后面两个方案对拍用的标准答案。

### 三层去重各管一个位置

规则只有一条：**同一个位置上，相同的值只试一次。**

| 去重 | 已经固定了 | 防止什么 |
|---|---|---|
| `i > 0` | 无 | 同一个值当第一个数开两次头 |
| `j > i + 1` | 第一个数 | 同一个值当第二个数用两次 |
| `k > j + 1` | 前两个数 | 同一个值当第三个数用两次 |

拿 `[-1,0,0,1]` 试，如果去掉第二位去重，第一个数固定是 `-1` 之后，`j` 取第一个 `0` 和第二个 `0` 都能配上 `1`，`[-1,0,1]` 会出现两次。第三位同理，`[-1,0,1,1]` 去掉第三位去重，两个 `1` 都会被收一次。

### 容易写错的地方：`j > i + 1` 不能写成 `j > 0`

`i > 0`、`j > i + 1`、`k > j + 1` 说的都是「不是本层第一个元素」。每层的起点分别是 `0`、`i + 1`、`j + 1`。

如果第二层写成 `j > 0`，看合法答案 `[-1,-1,2]`：`i` 取第一个 `-1`，`j` 取第二个 `-1`。`j > 0` 成立，`nums[j] == nums[j-1]` 也成立，这个 `j` 就被跳过了。我把这个错误版本跑了一遍示例，结果只剩 `[-1,0,1]`，`[-1,-1,2]` 丢了。

`j` 前面那个 `-1` 属于第一层，不是同一层的重复。

## 方案二：固定一个数，剩下是两数之和 $O(n^2)$

三个数 `a + b + c = 0`，先固定 `a = nums[i]`，就只要在它右边找 `b + c = -a`。这就是第 1 题的两数之和，用哈希集合边走边查。

```cpp
class SolutionHash {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = (int)nums.size();
        vector<vector<int>> res;
        for (int i = 0; i < n; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;

            unordered_set<int> seen;    // 每轮 i 新开一个
            for (int j = i + 1; j < n; j++) {
                int need = -nums[i] - nums[j];
                if (seen.count(need)) {
                    res.push_back({nums[i], need, nums[j]});
                    while (j + 1 < n && nums[j + 1] == nums[j]) j++;
                }
                seen.insert(nums[j]);
            }
        }
        return res;
    }
};
```

### 逐段看

**剪枝 `nums[i] > 0` 就 `break`**：排序后 `nums[i]` 是三个数里最小的。最小的都大于 0，加起来不可能等于 0，后面的 `i` 也不用试了。`break` 是结束整个循环，`continue` 只跳过这一轮。

**`need = -nums[i] - nums[j]`**：由 `nums[i] + need + nums[j] = 0` 移项得到，表示「和 `nums[j]` 配对还缺的那个数」。值域是 $\pm 10^5$，`int` 够用。

**`unordered_set<int> seen`**：哈希集合，只记一个数在不在，`insert` 放入、`count` 查询，平均 $O(1)$。它必须写在 `for i` 里面，每换一个 `i` 就是空的，只记这一轮 `j` 走过的数。放到外面的话，上一轮的数会混进来。

**先查再记**：`j` 每走一步，先查 `need` 在不在 `seen`，再把 `nums[j]` 放进去。顺序反过来，`nums[j]` 可能和自己配对。

**找到后跳过相同的 `nums[j]`**：`i` 和 `nums[j]` 定了，`need` 也就定了。把 `j` 推过所有相同的值，同一个三元组不会收第二次。`j + 1 < n` 写在 `&&` 前面，先防越界。

### 跑一遍示例

固定 `i=1`（值 `-1`）这一轮，目标是两数之和等于 `1`：

```
j=2 值-1 需要2
j=3 值0  需要1
j=4 值1  需要0  → 0 在 seen 里，收下 [-1,0,1]
j=5 值2  需要-1 → -1 在 seen 里，收下 [-1,-1,2]
```

`i=2` 也是 `-1`，被去重跳过；`i=4` 值是 `1`，大于 0，`break`。

`[-1,-1,2]` 里两个 `-1` 一个是 `i`，一个是 `j=2` 时放进 `seen` 的，位置不同，所以能同时出现在一个答案里。

时间 $O(n^2)$，额外空间 $O(n)$。

## 方案三：排序 + 对撞双指针（提交版）

内层不用哈希，改用第 11 题的对撞双指针。固定 `nums[i]` 后，`l` 从 `i + 1` 出发，`r` 从末尾出发：

- 和小于 0：`nums[l]` 配上最大的 `nums[r]` 都不够，淘汰 `l`，`l++`
- 和大于 0：`nums[r]` 配上最小的 `nums[l]` 都太大，淘汰 `r`，`r--`
- 和等于 0：收下，`l`、`r` 各自跳过相同值，再各走一步

```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = (int)nums.size();
        vector<vector<int>> res;

        for (int i = 0; i < n - 2; i++) {
            if (nums[i] > 0) break;
            if (i > 0 && nums[i] == nums[i - 1]) continue;

            int l = i + 1, r = n - 1;
            while (l < r) {
                int s = nums[i] + nums[l] + nums[r];
                if (s < 0) {
                    l++;
                } else if (s > 0) {
                    r--;
                } else {
                    res.push_back({nums[i], nums[l], nums[r]});
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++;
                    r--;
                }
            }
        }
        return res;
    }
};
```

示例的指针轨迹：

```
i=0 (-4): l、r 怎么夹和都小于 0，l 一路右移
i=1 (-1): l=2 r=5  -1 + -1 + 2 = 0  收下 [-1,-1,2]
          l=3 r=4  -1 +  0 + 1 = 0  收下 [-1,0,1]
i=2 (-1): 和上一个相同，跳过
i=3 (0):  l=4 r=5   0 +  1 + 2 = 3  r 左移，相遇结束
```

收下答案后的两个 `while`，作用和方案一的第二、三位去重一样。时间 $O(n^2)$，额外空间 $O(1)$（不算结果），比方案二少了一个哈希集合。

## 三个方案对比

| 方案 | 第三个数怎么找 | 时间 | 额外空间 |
| --- | --- | :---: | :---: |
| 三重循环 | 枚举 | $O(n^3)$ | $O(1)$ |
| 哈希 | 算出 `need`，查集合 | $O(n^2)$ | $O(n)$ |
| 对撞双指针 | 左右指针往中间夹 | $O(n^2)$ | $O(1)$ |

## 这题用到的 C++ 写法

- **`vector<vector<int>>`**：返回三元组的列表，每一行是一个三元组，行数等于答案个数，没有答案就是空的
- **`res.push_back({a, b, c})`**：花括号当场构造一个 `vector<int>` 作为新的一行
- **参数带 `&`，`res` 不带**：`nums` 是外面传进来的数组，带 `&` 直接用原件；`res` 是函数里新建、用来存答案的数组，自己就是存数据的地方，不能是引用。返回值也不能写成引用，因为 `res` 在函数结束时会销毁
- **`unordered_set` 和 `unordered_map`**：第 1 题要返回下标，所以用 map 记「值 → 下标」；这题只返回值，只需知道见没见过，用 set 就够

这题把第 1 题的哈希和第 11 题的对撞指针都用上了。在外面再套一层循环，就是第 18 题四数之和。
