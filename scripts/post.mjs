#!/usr/bin/env node
/* eslint-disable no-console -- 命令行工具，输出就是它的用户界面 */
/**
 * 博客文章管理工具（增删改查），零依赖。
 *
 * 用法：npm run post -- <命令> [参数]
 *
 *   new <栏目> <slug> [标题]   新建文章（栏目：project | leetcode | thought）
 *   list [栏目]               列出文章
 *   edit <slug>               用编辑器打开，并把 modDatetime 更新为现在
 *   draft <slug>              设为草稿（网站上隐藏）
 *   publish <slug>            取消草稿（重新发布）
 *   rm <slug>                 删除：移到项目根目录 _trash/，可以找回
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const ROOT = path.resolve(import.meta.dirname, "..");
const POSTS_DIR = path.join(ROOT, "src/content/posts");
const TRASH_DIR = path.join(ROOT, "_trash");

// 栏目 -> 子目录 和 frontmatter 模板
const CATEGORIES = {
  project: {
    dir: "projects",
    label: "项目",
    extra: `techStack:
  - 技术1
  - 技术2
repo: https://github.com/yanqing7914/repo
# demo: https://example.com
featured: false`,
    body: `## 背景

要解决什么问题？

## 技术选型

为什么选这些技术？

## 遇到的问题

### 1. 问题标题

现象 → 排查 → 解决。

## 结果

最好有数据或对比。

## 收获与改进
`,
  },
  leetcode: {
    dir: "leetcode",
    label: "刷题",
    extra: `problems:
  - id: 1
    title: 两数之和
    difficulty: 简单 # 简单 | 中等 | 困难
    url: https://leetcode.cn/problems/two-sum/`,
    body: `## 核心思路

## 模板

\`\`\`python
\`\`\`

## 代表题

| 题号 | 题目 | 难度 | 要点 |
| --- | --- | --- | --- |

## 常见错误

## 总结
`,
  },
  thought: {
    dir: "thoughts",
    label: "随笔",
    extra: "",
    body: `## 小标题

正文……
`,
  },
};

// ---------- 工具函数 ----------

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** 东八区 ISO 时间，如 2026-11-03T10:00:00+08:00 */
function nowISO() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 19) + "+08:00";
}

/** 递归列出 posts 目录下所有 .md/.mdx */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.mdx?$/.test(e.name) ? [p] : [];
  });
}

/** 解析 frontmatter 里的简单标量字段（够列表展示用） */
function readMeta(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const get = key =>
    fm
      .match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "");
  return {
    file,
    slug: path.basename(file).replace(/\.mdx?$/, ""),
    title: get("title") ?? "(无标题)",
    category: get("category") ?? "thought",
    pubDatetime: get("pubDatetime") ?? "",
    draft: get("draft") === "true",
  };
}

function findPost(slug) {
  if (!slug) die("请提供 slug，可以用 `npm run post -- list` 查看");
  const matches = walk(POSTS_DIR).filter(
    f => path.basename(f).replace(/\.mdx?$/, "") === slug
  );
  if (matches.length === 0) die(`找不到文章：${slug}`);
  if (matches.length > 1) die(`slug 重复：\n  ${matches.join("\n  ")}`);
  return matches[0];
}

/** 设置或新增 frontmatter 里的一个字段 */
function setField(file, key, value) {
  let text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) die(`${file} 没有 frontmatter`);
  let fm = m[1];
  const re = new RegExp(`^${key}:.*$`, "m");
  fm = re.test(fm) ? fm.replace(re, `${key}: ${value}`) : `${fm}\n${key}: ${value}`;
  text = text.replace(m[0], `---\n${fm}\n---`);
  fs.writeFileSync(file, text);
}

const rel = f => path.relative(ROOT, f);

// ---------- 命令 ----------

const commands = {
  new(category, slug, ...titleParts) {
    const cat = CATEGORIES[category];
    if (!cat) die(`栏目必须是：${Object.keys(CATEGORIES).join(" | ")}`);
    if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      die("slug 只能用小写字母、数字和连字符，例如 two-pointers（它会出现在网址里）");
    }
    if (walk(POSTS_DIR).some(f => path.basename(f).replace(/\.mdx?$/, "") === slug)) {
      die(`slug 已存在：${slug}`);
    }

    const title = titleParts.join(" ") || "在这里写标题";
    const file = path.join(POSTS_DIR, cat.dir, `${slug}.md`);
    const content = `---
title: ${JSON.stringify(title)}
pubDatetime: ${nowISO()}
category: ${category}
draft: true # 写完改成 false，或运行 npm run post -- publish ${slug}
tags:
  - ${cat.label}
description: 一句话概括这篇文章（会显示在列表里）
${cat.extra ? cat.extra + "\n" : ""}---

${cat.body}`;

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    console.log(`✓ 已创建 ${rel(file)}（草稿状态）`);
    console.log(`  预览：npm run dev 后访问 http://localhost:4321/posts/${cat.dir}/${slug}/`);
    console.log(`  发布：npm run post -- publish ${slug}`);
  },

  list(category) {
    if (category && !CATEGORIES[category]) {
      die(`栏目必须是：${Object.keys(CATEGORIES).join(" | ")}`);
    }
    const posts = walk(POSTS_DIR)
      .map(readMeta)
      .filter(p => !category || p.category === category)
      .sort((a, b) => b.pubDatetime.localeCompare(a.pubDatetime));

    if (posts.length === 0) return console.log("（没有文章）");
    for (const p of posts) {
      const cat = (CATEGORIES[p.category]?.label ?? p.category).padEnd(3, "　");
      const status = p.draft ? "草稿" : "已发";
      console.log(`${p.pubDatetime.slice(0, 10)}  ${cat}  ${status}  ${p.slug.padEnd(28)} ${p.title}`);
    }
    console.log(`\n共 ${posts.length} 篇`);
  },

  edit(slug) {
    const file = findPost(slug);
    setField(file, "modDatetime", nowISO());
    // 有 $EDITOR 用它（支持 "code -w" 这种带参数的写法），否则用 macOS 默认程序打开。
    // 不经过 shell，文件路径作为独立参数传入，避免路径里的特殊字符被当成命令执行。
    const [cmd, ...cmdArgs] = (process.env.EDITOR ?? "").trim().split(/\s+/).filter(Boolean);
    const r = cmd
      ? spawnSync(cmd, [...cmdArgs, file], { stdio: "inherit" })
      : spawnSync("open", ["-t", file], { stdio: "inherit" });
    if (r.status !== 0) console.log(`请手动打开：${rel(file)}`);
    console.log(`✓ 已更新修改时间：${rel(file)}`);
  },

  draft(slug) {
    const file = findPost(slug);
    setField(file, "draft", "true");
    console.log(`✓ 已设为草稿（网站上隐藏）：${rel(file)}`);
  },

  publish(slug) {
    const file = findPost(slug);
    setField(file, "draft", "false");
    console.log(`✓ 已发布：${rel(file)}`);
  },

  async rm(slug) {
    const file = findPost(slug);
    const { title } = readMeta(file);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await rl.question(`确认删除《${title}》？文件会移到 _trash/ (y/N) `);
    rl.close();
    if (ans.trim().toLowerCase() !== "y") return console.log("已取消");

    fs.mkdirSync(TRASH_DIR, { recursive: true });
    const dest = path.join(TRASH_DIR, `${Date.now()}-${path.basename(file)}`);
    fs.renameSync(file, dest);
    console.log(`✓ 已移到 ${rel(dest)}，想恢复就把它移回 src/content/posts/`);
  },

  help() {
    const src = fs.readFileSync(new URL(import.meta.url), "utf8");
    console.log(src.match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, "").trim());
  },
};

const [cmd = "help", ...args] = process.argv.slice(2);
if (!commands[cmd]) {
  console.error(`未知命令：${cmd}\n`);
  commands.help();
  process.exit(1);
}
await commands[cmd](...args);
