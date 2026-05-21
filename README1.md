# OpenAA · 纽约站 · 美国华人生活入口平台

面向美国华人的综合生活信息入口——集招聘、房屋、二手市场、本地服务、新闻资讯、实用导航与 DMV 中文学习于一体。

## 功能模块

### 内容板块
| 模块 | 路径 | 说明 |
|---|---|---|
| 首页 | `/` | 顶部快捷导航、最新动态滚动条、各板块最新内容聚合 |
| 招聘 | `/jobs` | 华人招聘信息，支持分类、搜索与发布 |
| 房屋 | `/housing` | 房屋租售信息，支持分类、搜索与发布 |
| 二手 | `/secondhand` | 二手物品交易，支持分类、搜索与发布 |
| 本地服务 | `/services` | 本地商家与生活服务信息 |
| 新闻 | `/news` | 新闻资讯，含本地新闻、新手指南、DMV 教程、生活指南、平台公告 |
| 公共导航 | `/navigation` | 精选实用网站导航，分类展示 |
| 我的导航 | `/navigation/my` | 用户自定义导航链接，需登录 |
| 反馈举报 | `/feedback` | 用户意见反馈与内容举报 |

### DMV 中文学习平台
| 模块 | 路径 | 说明 |
|---|---|---|
| DMV 首页 | `/dmv` | DMV 学习平台入口 |
| 题库浏览 | `/dmv/ny/questions` | 完整 150 题浏览 |
| 随机 / 顺序练习 | `/dmv/ny/practice` | 支持随机或顺序模式刷题 |
| 模拟考试 | `/dmv/ny/mock-test` | 模拟官方 DMV 考试流程 |
| 错题练习 | `/dmv/ny/quiz` | 针对错题专项复习 |
| 标志专项 | `/dmv/ny/sign-test` | 交通标志识别专项练习 |
| 罚单查询 | `/dmv/tickets` | NYS DMV 罚单查询入口 |

> DMV 题库来自 `data/openaa-ny-dmv-questions-v1.json`，共 150 题，为本地 JSON 数据，不依赖数据库。

### 用户系统
- Email / 密码注册登录
- Google OAuth 登录
- 用户个人资料（`/profile`）
- 发帖限额与帐号状态管理

### 广告系统
- 位置化横幅广告，支持位置：`home` / `jobs` / `housing` / `secondhand` / `services` / `news` / `navigation` / `dmv`
- 支持外部链接与站内链接广告
- 日期范围控制，管理后台增删改

### 后台管理（`/admin`）
| 功能 | 路径 |
|---|---|
| 广告管理 | `/admin/ads` |
| 新闻管理 | `/admin/news` |
| 反馈管理 | `/admin/feedback` |
| 帖子管理 | `/admin/posts` |
| 用户管理 | `/admin/users` |
| 首页板块配置 | `/admin/home-sections` |
| 顶部快捷导航 | `/admin/top-links` |
| 导航管理 | `/admin/navigation` |
| 服务管理 | `/admin/services` |
| 站点设置 | `/admin/settings` |
| 图片清理工具 | `/admin/image-cleanup` |

### SEO / 可发现性
- `app/robots.ts` — 自动生成 `robots.txt`，屏蔽 admin / api / auth / profile / publish 路径
- `app/sitemap.ts` — 自动生成 `sitemap.xml`
- JSON-LD structured data（WebSite、WebPage 等）
- canonical / site URL 由 `NEXT_PUBLIC_SITE_URL` 统一控制

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 15（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 后端 | Supabase（Auth + PostgreSQL + Storage） |
| 部署 | Vercel |

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 凭据与其他配置

# 3. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

详细安装说明见 [docs/SETUP.md](docs/SETUP.md)。

## 文档

- [环境与本地开发](docs/SETUP.md)
- [数据库结构](docs/DATABASE.md)
- [API 参考](docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)

## 项目目录

```
app/                        # Next.js App Router 页面与 API 路由
  (admin)/admin/            # 后台管理页面（需 ADMIN_TOKEN）
  api/                      # REST API 路由
  auth/                     # 登录 / 注册 / OAuth 回调
  dmv/                      # DMV 学习平台页面
  feedback/                 # 反馈举报页面
  housing/                  # 房屋板块
  jobs/                     # 招聘板块
  navigation/               # 公共导航 / 我的导航
  news/                     # 新闻资讯
  profile/                  # 用户个人资料
  secondhand/               # 二手市场
  services/                 # 本地服务
  robots.ts                 # robots.txt 生成器
  sitemap.ts                # sitemap.xml 生成器
components/                 # 可复用 React 组件
data/                       # 静态数据（DMV 题库 JSON 等）
docs/                       # 项目文档
lib/                        # 工具函数与 Supabase 客户端
supabase/                   # SQL 初始化脚本与 migrations
  migrations/               # 按时间戳顺序的增量 migration
types/                      # TypeScript 类型定义
```
