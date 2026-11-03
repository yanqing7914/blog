---
title: 从零搭建个人网站：域名、简历站与博客
pubDatetime: 2026-11-03T10:00:00+08:00
category: project
featured: true
tags:
  - Astro
  - GitHub Pages
  - 建站
description: 记录购买 gongchenhao.cn、用 developerFolio 做简历站、用 Astro 搭博客的全过程和踩过的坑。
techStack:
  - Astro
  - React
  - GitHub Actions
  - 阿里云 DNS
repo: https://github.com/yanqing7914/blog
---

> 这是一篇**示例项目复盘**，演示项目文章的结构，内容请替换成你自己的。

## 背景

想要一个能写在简历上的个人网站：一个页面展示简历，一个博客沉淀项目和刷题记录。要求是**免费托管、不用维护服务器、不用备案**。

## 技术选型

| 需求   | 方案                    | 理由                                 |
| ------ | ----------------------- | ------------------------------------ |
| 域名   | 阿里云 `.cn`            | 首年 30 元，续费 42 元，比 .com 便宜 |
| 简历站 | developerFolio（React） | 单页展示型，内容集中在一个配置文件   |
| 博客   | Astro + AstroPaper 主题 | 文章就是 Markdown，构建成纯静态页面  |
| 托管   | GitHub Pages            | 免费、海外节点无需 ICP 备案          |

## 遇到的问题

### 1. git clone 一直失败

现象：`SSL_ERROR_SYSCALL in connection to github.com:443`。

排查：对比走代理和直连两种情况下的 HTTP 状态码，发现是本地代理节点不稳定。

```bash
curl -s -o /dev/null -w "%{http_code}" https://github.com             # 走代理
curl -s -o /dev/null --noproxy '*' -w "%{http_code}" https://github.com # 直连
```

解决：哪条路通走哪条，npm 换成国内镜像 `registry.npmmirror.com`。

### 2. 动态 OG 图构建报错

现象：构建时报 `Cannot find the font path`。原因是 OG 图需要从 Google Fonts 下载字体，网络不通时拿不到；而且默认字体不含中文，中文标题会变成方框。

解决：关闭动态 OG 图，改用一张静态默认图。

## 结果

- 简历：`resume.gongchenhao.cn`
- 博客：`gongchenhao.cn`
- 成本：每年 42 元域名费，其他全免费

## 收获与改进

- 静态站点 + Git 是个人内容最省心的方案，内容永远在自己手里。
- 下一步：接入 Giscus 评论、Umami 访问统计。
