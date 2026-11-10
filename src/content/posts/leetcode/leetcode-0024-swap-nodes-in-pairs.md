---
title: "力扣 24. 两两交换链表中的节点：哑节点与指针改序"
pubDatetime: 2026-11-10T11:04:30+08:00
category: leetcode
draft: false
tags:
  - 刷题
  - 链表
  - 递归
  - C++
description: 链表题入门：两两交换节点的三种解法，讲清 nullptr 与尾节点的区别、交换一对要改的三根指针和它们的顺序、哑节点为什么放在栈上。
problems:
  - id: 24
    title: 两两交换链表中的节点
    difficulty: 中等
    url: https://leetcode.cn/problems/swap-nodes-in-pairs/
---

力扣第 24 题「两两交换链表中的节点」：把链表里相邻的节点两两交换，返回交换后的头节点。`[1,2,3,4]` 变成 `[2,1,4,3]`，奇数个节点时最后一个不动，`[1,2,3]` 变成 `[2,1,3]`。

题目限制只能交换节点本身，不能改节点里存的 `val`。这是我第一次写链表题，和前面几道数组题最大的不同是：数据不在连续内存里，全靠指针串起来。

## 链表节点长什么样

LeetCode 已经定义好了，提交时不用写，重复定义还会报编译错误。

```cpp
struct ListNode {
    int val;           // 节点里存的数
    ListNode *next;    // 指向下一个节点的指针
};
```

把链表画出来：

```
head → [1] → [2] → [3] → [4] → nullptr
```

- **`->`** 通过指针访问成员。`p->val` 取节点的值，`p->next` 取下一个节点
- **`p = p->next`** 往后走一步
- **`nullptr`** 空指针，地址是 0，表示「这里什么都没指向」

### nullptr 不是尾节点

一开始我以为 `nullptr` 就是最后一个节点，其实不是：

```
head → [1] → [2] → [3] → nullptr
                    ↑       ↑
                 尾节点   不是节点
```

尾节点是 `[3]`，它是真实存在的节点，有 `val` 也有自己的 `next`。`nullptr` 是尾节点 `next` 里存的值，表示后面没有了。

验证一下：

```
尾节点 tail->val = 3
tail->next == nullptr ? 是
```

因为 `nullptr` 没有 `val`，也没有 `next`，所以不能对它用 `->`，`p->val` 在 `p` 是空指针时会让程序崩溃。链表代码里到处先判断再访问，就是这个原因。

`nullptr` 出现在两个地方：尾节点的 `next`，以及空链表的 `head`。示例 2 输入 `[]`，传进来的 `head` 本身就是 `nullptr`，遍历循环一次都不会执行。

## 交换一对要改三根指针

```
交换前：prev → a → b → 后面
交换后：prev → b → a → 后面
```

```cpp
prev->next = b;        // ① prev 指向 b
a->next = b->next;     // ② a 指向原来 b 后面的部分
b->next = a;           // ③ b 指向 a
```

光看代码不够，我加了打印，把 `[1,2,3,4]` 每一步的链表状态跑了出来。开头的 `0` 是哑节点，下面会讲：

```
开始:              0 → 1 → 2 → 3 → 4 → null
第1轮 a=1 b=2
  ① prev->next=b   0 → 2 → 3 → 4 → null
  ② a->next=b->next     a 现在指向 3
  ③ b->next=a      0 → 2 → 1 → 3 → 4 → null
第2轮 a=3 b=4
  ① prev->next=b   0 → 2 → 1 → 4 → null
  ② a->next=b->next     a 现在指向 null
  ③ b->next=a      0 → 2 → 1 → 4 → 3 → null
结果:              2 → 1 → 4 → 3 → null
```

第 ① 步之后，节点 `1` 暂时从链表上掉下来了。但变量 `a` 还记着它的地址，所以没丢，第 ③ 步又接了回去。

**② 必须写在 ③ 之前。** `b->next` 里存着「后面部分」的地址。如果先做 ③，`b->next` 被改成了 `a`，后面的 `3 → 4` 就再也找不到了，整段链表丢失。

## 方案一：把节点地址存进 vector

链表没法用下标访问，那就先转成数组。存的是节点的地址，不是节点的拷贝。

```cpp
class SolutionArray {
public:
    ListNode* swapPairs(ListNode* head) {
        vector<ListNode*> nodes;
        for (ListNode* p = head; p != nullptr; p = p->next)
            nodes.push_back(p);

        int n = (int)nodes.size();
        for (int i = 0; i + 1 < n; i += 2)
            swap(nodes[i], nodes[i + 1]);      // 交换的是地址

        for (int i = 0; i + 1 < n; i++)
            nodes[i]->next = nodes[i + 1];
        if (n > 0) nodes[n - 1]->next = nullptr;   // 最后一个必须断开

        return n > 0 ? nodes[0] : nullptr;
    }
};
```

### push_back

```cpp
nodes.push_back(p);
```

意思是把 `p` 加到 `nodes` 末尾，长度加 1。`push` 是放入，`back` 是尾部，注意中间是下划线。

沿着链表走一遍，每走到一个节点就把它的地址放进去：

```
链表：head → [1] → [2] → [3] → [4] → nullptr

第 1 次：nodes = [节点1的地址]
第 2 次：nodes = [节点1, 节点2]
...
走完：  nodes = [节点1, 节点2, 节点3, 节点4]
```

`nodes` 的类型是 `vector<ListNode*>`，装的是地址，节点本身还在原位。

### 最后一行：三目运算符

```cpp
return n > 0 ? nodes[0] : nullptr;
```

`条件 ? 成立时的值 : 不成立时的值`，读作「如果 `n > 0` 取 `nodes[0]`，否则取 `nullptr`」。等价于：

```cpp
if (n > 0) return nodes[0];
else return nullptr;
```

为什么要判断？因为空链表时 `nodes` 是空的，`nodes[0]` 会访问一个不存在的元素。`vector` 的 `operator[]` 不检查越界，直接读无效内存。

实测两种情况：

```
有节点时: 1
空链表时: nullptr
```

三目和 `if` 怎么选：**要返回一个值就用三目，要执行一个动作就用 `if`**。同一段代码里另一行 `if (n > 0) nodes[n - 1]->next = nullptr;` 用的是普通 `if`，因为它做的事是把最后一个节点的 `next` 断掉。

如果不断开这个 `next`，最后一个节点可能还指着链表里某个节点，形成环，遍历时会死循环。

时间 $O(n)$，额外空间 $O(n)$。

## 方案二：哑节点 + 迭代（提交版）

第一对节点的前面没有 `prev`，是个特殊情况。造一个假节点放在最前面，第一对就和其他对一样处理了。

```cpp
class Solution {
public:
    ListNode* swapPairs(ListNode* head) {
        ListNode dummy(0, head);     // 哑节点，next 指向原来的头
        ListNode* prev = &dummy;
        while (prev->next != nullptr && prev->next->next != nullptr) {
            ListNode* a = prev->next;
            ListNode* b = a->next;
            prev->next = b;          // ①
            a->next = b->next;       // ②
            b->next = a;             // ③
            prev = a;                // a 换到后面了，它就是下一对的 prev
        }
        return dummy.next;
    }
};
```

### 循环条件

后面至少还剩两个节点，才有得交换。`&&` 是短路求值：`prev->next` 是空指针时，后半句 `prev->next->next` 根本不会执行，所以不会对空指针取 `next`。

### 栈上对象和指针的区别

```cpp
ListNode dummy(0, head);   // 对象，放在栈上
ListNode* prev = &dummy;   // 指针，指向 dummy
```

`dummy` 本身是个对象，用点号访问成员：`dummy.next`。
`prev` 是指针，用箭头访问：`prev->next`。
`&dummy` 是取 `dummy` 的地址，得到 `ListNode*` 类型，才能赋给 `prev`。

**为什么不用 `new`？**

```cpp
ListNode dummy(0, head);          // 栈上，函数结束自动销毁
ListNode* dummy = new ListNode(0, head);   // 堆上，必须手动 delete
```

`new` 出来的对象不会自动释放，忘了 `delete` 就是内存泄漏。哑节点只需要活到函数结束，放栈上正好，编译器会帮你收拾。

### 返回 dummy.next

原来的头节点换到了第二个位置，新的头是 `dummy.next`。`dummy` 本身不进入返回的链表。

时间 $O(n)$，额外空间 $O(1)$。

## 方案三：递归

递归的写法短很多，思路是：交换前两个节点，后面的一整段交给递归。

```cpp
class SolutionRecursive {
public:
    ListNode* swapPairs(ListNode* head) {
        if (head == nullptr || head->next == nullptr) return head;
        ListNode* a = head;
        ListNode* b = head->next;
        a->next = swapPairs(b->next);    // 后面交给递归
        b->next = a;
        return b;
    }
};
```

三部分：

- **终止条件**：剩 0 个或 1 个节点，没得交换，直接返回
- **本层操作**：交换 `a`、`b`
- **用下一层的结果**：`a->next` 接上递归处理完的后面那段

加打印看执行顺序：

```
进入: a=1 b=2，先处理 b 后面的部分
进入: a=3 b=4，先处理 b 后面的部分
递归到底(剩 0个)，直接返回
返回: b=4 → a=3 → ...
返回: b=2 → a=1 → ...
结果: 2 1 4 3
```

注意顺序：先一路往深处走到底，再一层层往回接。`a->next = swapPairs(b->next)` 这行必须等递归返回后才有值，所以本层的连接发生在后面。

递归的代价是调用栈：$n$ 个节点会嵌套 $n/2$ 层。时间 $O(n)$，额外空间 $O(n)$。

## 三个方案对比

| 方案 | 做法 | 时间 | 额外空间 |
| --- | --- | :---: | :---: |
| 一 | 节点地址存进 vector，重新连接 | $O(n)$ | $O(n)$ |
| 二 | 哑节点 + 迭代改指针 | $O(n)$ | $O(1)$ |
| 三 | 递归 | $O(n)$ | $O(n)$ 递归栈 |

## 链表题的 C++ 写法小结

- **`nullptr`** 是空指针，不是节点。尾节点的 `next` 是 `nullptr`，空链表的 `head` 也是 `nullptr`
- **`.` 和 `->`**：对象用 `.`，指针用 `->`。`dummy.next` 是对象取成员，`prev->next` 是指针取成员
- **`&`** 取地址：`&dummy` 把对象变成指针
- **`vector<ListNode*>`** 装的是地址，交换地址不会拷贝节点
- **指针改序**：改 `b->next` 之前，先把 `b->next` 原来的值存进 `a->next`，否则后面那段就断了
- **栈上对象 vs `new`**：只在函数内用的临时对象放栈上，自动销毁；`new` 出来的必须手动 `delete`

链表题和数组题的手感完全不同：数组靠下标，链表靠指针，每次改指针都要想清楚「改完还能不能走回去」。
