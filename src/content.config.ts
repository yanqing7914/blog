import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      // 栏目：project=项目 / leetcode=刷题 / thought=随笔
      category: z.enum(["project", "leetcode", "thought"]).default("thought"),
      // 项目栏目专用（可选）
      techStack: z.array(z.string()).optional(),
      repo: z.url().optional(),
      demo: z.url().optional(),
      // 刷题栏目专用（可选）：本文涉及的题目
      problems: z
        .array(
          z.object({
            id: z.number(),
            title: z.string(),
            difficulty: z.enum(["简单", "中等", "困难"]),
            url: z.url().optional(),
          })
        )
        .optional(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      // An empty value means "not set", so the site timezone applies.
      timezone: z
        .string()
        .optional()
        .transform(tz => tz || undefined),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
