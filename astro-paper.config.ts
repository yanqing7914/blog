import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://gongchenhao.cn/",
    title: "龚晨昊",
    description: "项目复盘、力扣刷题总结与技术随想",
    author: "龚晨昊",
    profile: "https://resume.gongchenhao.cn",
    ogImage: "default-og.jpg",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 6,
    perIndex: 4,
  },
  features: {
    lightAndDarkMode: true,
    // 动态 OG 图默认字体不含中文，中文标题会显示成方框，先关掉，用静态默认图
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/yanqing7914" },
    { name: "mail", url: "mailto:1976455917@qq.com" },
  ],
  shareLinks: [],
});
