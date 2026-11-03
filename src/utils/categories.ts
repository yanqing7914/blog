import type { CollectionEntry } from "astro:content";

export type Category = CollectionEntry<"posts">["data"]["category"];

/** 栏目元信息：导航文字、页面标题和描述 */
export const CATEGORIES: Record<
  Category,
  { path: string; label: string; title: string; desc: string }
> = {
  project: {
    path: "projects",
    label: "项目",
    title: "项目",
    desc: "做过的项目与复盘：为什么做、怎么做、踩了哪些坑。",
  },
  leetcode: {
    path: "leetcode",
    label: "刷题",
    title: "力扣刷题",
    desc: "按专题整理的题解与思路总结。",
  },
  thought: {
    path: "thoughts",
    label: "随笔",
    title: "随笔",
    desc: "学习心得、技术想法和一些思考。",
  },
};

export const CATEGORY_ORDER: Category[] = ["project", "leetcode", "thought"];

export function filterByCategory(
  posts: CollectionEntry<"posts">[],
  category: Category
) {
  return posts.filter(post => post.data.category === category);
}
