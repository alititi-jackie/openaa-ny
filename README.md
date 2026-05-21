# OpenAA ·纽约站 ·  美国华人生活入口平台

面向美国华人的综合生活信息入口平台，集招聘、房屋、二手市场、本地服务、新闻资讯、实用导航、DMV 中文学习、用户系统与后台运营于一体。

OpenAA 当前主站：`https://ny.openaa.com`

---

## 平台定位

OpenAA 是一个面向美国华人的移动端优先生活平台，目标是把华人日常最常用的信息入口集中到一个网站中。

平台核心方向：

- 华人招聘与求职
- 房屋租售与求租
- 二手闲置交易
- 本地生活服务
- 新闻资讯与新手指南
- 实用网站导航
- 用户自定义“我的导航”
- 纽约 DMV 中文学习平台
- DMV 模拟考试与错题练习
- 罚单查询入口
- 广告与内容运营后台

---

## 核心功能模块

### 首页

首页是 OpenAA 的综合入口，包含：

- 顶部 OpenAA Header
- 顶部快捷导航
- Banner 广告轮播
- 最新动态滚动条 ticker
- 8 宫格快捷入口
- DMV 快捷工具入口
- 最新招聘 / 房屋 / 二手 / 服务 / 新闻聚合
- 底部固定导航栏

主要路径：

| 功能 | 路径 |
|---|---|
| 首页 | `/` |
| 全站搜索 | `/search` |

---

### 招聘

招聘模块支持招聘岗位与求职信息展示，适合美国华人本地招聘场景。

功能包括：

- 招聘信息列表
- 求职信息列表
- 分类筛选
- 地区筛选
- 关键词搜索
- 发布招聘 / 求职
- 编辑与管理自己的招聘信息
- 后台统一帖子管理
- 置顶展示支持

| 功能 | 路径 |
|---|---|
| 招聘列表 | `/jobs` |
| 发布招聘 | `/jobs/publish` |
| 招聘详情 | `/jobs/[id]` |
| 编辑招聘 | `/jobs/edit/[id]` |
| 我的招聘 | `/profile/my-jobs` |

---

### 房屋

房屋模块用于发布和浏览华人房屋租售、求租相关信息。

功能包括：

- 房屋出租 / 求租
- 地区筛选
- 关键词搜索
- 图片展示
- 房屋详情页
- 发布 / 编辑 / 管理
- 后台管理与置顶支持

| 功能 | 路径 |
|---|---|
| 房屋列表 | `/housing` |
| 发布房屋 | `/housing/publish` |
| 房屋详情 | `/housing/[id]` |
| 编辑房屋 | `/housing/edit/[id]` |
| 我的房屋 | `/profile/my-housing` |

---

### 二手市场

二手模块用于发布和浏览二手闲置、求购信息。

功能包括：

- 二手出售
- 二手求购
- 分类筛选
- 地区筛选
- 图片上传
- 商品详情
- 发布 / 编辑 / 删除
- 我的二手管理
- 后台统一管理

| 功能 | 路径 |
|---|---|
| 二手列表 | `/secondhand` |
| 发布二手 | `/secondhand/publish` |
| 二手详情 | `/secondhand/[id]` |
| 编辑二手 | `/secondhand/edit/[id]` |
| 我的二手 | `/profile/my-items` |

---

### 本地服务

本地服务模块用于发布华人生活服务信息，例如搬家、装修、清洁、维修、会计、保险、汽车相关服务等。

功能包括：

- 服务分类展示
- 地区筛选
- 服务详情页
- 电话 / 微信联系方式
- 图片展示
- 发布 / 编辑 / 管理服务
- 后台服务管理
- 置顶支持

| 功能 | 路径 |
|---|---|
| 服务列表 | `/services` |
| 发布服务 | `/services/publish` |
| 服务详情 | `/services/[id]` |
| 编辑服务 | `/services/edit/[id]` |
| 我的服务 | `/profile/my-services` |

---

### 新闻资讯

新闻模块用于发布 OpenAA 平台内容、华人本地新闻、生活指南、新手指南与 DMV 教程。

新闻分类包括：

- 本地新闻
- 新手指南
- DMV 教程
- 生活指南
- 平台公告

功能包括：

- 新闻列表
- 分类筛选
- 新闻详情页
- SEO 标题与描述
- 封面图
- 上一篇 / 下一篇
- 相关阅读
- NewsArticle structured data
- 后台发布、编辑、下架、删除

| 功能 | 路径 |
|---|---|
| 新闻列表 | `/news` |
| 新闻详情 | `/news/[slug]` |
| 新闻后台 | `/admin/news` |

---

### 公共导航

公共导航是 OpenAA 的实用网站入口，集中展示美国华人常用网站。

功能包括：

- 分类导航
- 常用网站链接
- 后台可管理分类
- 后台可管理链接
- 支持当前窗口或新窗口打开

| 功能 | 路径 |
|---|---|
| 公共导航 | `/navigation` |
| 导航后台 | `/admin/navigation` |

---

### 我的导航

“我的导航”是用户自定义的网址收藏功能，适合把 OpenAA 当成个人常用入口页。

功能包括：

- 登录后添加个人网址
- 编辑网址
- 删除网址
- 上移 / 下移排序
- 设置首页导航默认打开方式
- 用户私有数据隔离

| 功能 | 路径 |
|---|---|
| 我的导航 | `/navigation/my` |

---

## DMV 中文学习平台

DMV 是 OpenAA 当前重点模块之一，定位为纽约华人 DMV 中文学习平台。

该模块面向准备考纽约 Learner Permit / 驾照笔试的华人用户，提供中文题库、练习、模拟考试、错题练习与罚单查询入口。

### DMV 功能列表

| 功能 | 路径 | 说明 |
|---|---|---|
| DMV 首页 | `/dmv` | DMV 学习平台入口，聚合教程与练习入口 |
| 练习入口 | `/dmv/ny/practice` | DMV 练习系统总入口 |
| 题库浏览 | `/dmv/ny/questions` | 浏览完整 NY DMV 中文题库 |
| 随机 / 顺序练习 | `/dmv/ny/quiz` | 支持随机练习和顺序练习 |
| 模拟考试 | `/dmv/ny/mock-test` | 模拟 DMV 笔试流程 |
| 错题练习 | `/dmv/ny/wrong-questions` | 根据本机错题记录复习 |
| 标志专项 | `/dmv/ny/sign-test` | 交通标志专项练习 |
| 罚单查询 | `/dmv/tickets` | NYC / NYS 罚单查询入口导航 |

### DMV 题库

DMV 题库文件：

```txt
/data/openaa-ny-dmv-questions-v1.json
```

当前题库能力：

- 150 道 NY DMV 中文练习题
- 题目分类整理
- 选择题选项
- 正确答案
- 中文解释
- 交通标志图片支持
- 本地 JSON 驱动，不依赖数据库

### 模拟考试

模拟考试功能包括：

- 20 题考试模式
- 交通标志题与普通题混合
- 计时功能
- 提交后显示成绩
- 错题自动记录到本机 localStorage
- 完成后可分享成绩

### 错题本

错题练习使用浏览器 localStorage 保存错题记录。

当前特点：

- 不强制登录
- 未登录也能完整使用
- 错题保存在当前设备
- 换设备或清除浏览器数据后，本地错题会丢失

未来可扩展为登录后云端同步错题与学习进度。

### DMV 罚单查询

罚单查询页面提供官方查询入口导航，方便用户进入纽约相关官方网站查询：

- NYC Finance / CityPay
- NY DMV Traffic Violations Bureau
- 红灯 / 摄像头 / 停车罚单相关入口

OpenAA 不保存用户罚单数据，只提供官方入口与中文说明。

---

## 用户系统

OpenAA 使用 Supabase Auth 实现用户系统。

功能包括：

- 邮箱注册
- 邮箱登录
- Google OAuth 登录
- 找回密码
- 重置密码
- 登录后修改密码
- 用户资料编辑
- 我的发布内容管理
- 用户账号状态管理

用户中心路径：

| 功能 | 路径 |
|---|---|
| 登录 | `/auth/login` |
| 注册 | `/auth/signup` |
| 忘记密码 | `/auth/forgot-password` |
| 重置密码 | `/auth/reset-password` |
| 我的页面 | `/profile` |
| 编辑资料 | `/profile/edit` |
| 修改密码 | `/profile/change-password` |

---

## 反馈与举报

反馈模块用于收集用户反馈、页面问题、信息举报和广告合作需求。

功能包括：

- 不强制登录提交
- 已登录用户自动关联 user_id
- 支持反馈类型选择
- 支持相关链接
- 支持联系方式
- 支持每日提交限制
- 后台查看与处理

| 功能 | 路径 |
|---|---|
| 提交反馈 | `/feedback` |
| 反馈后台 | `/admin/feedback` |

---

## 广告系统

OpenAA 支持动态广告系统，广告由后台统一管理。

广告能力：

- 多广告位
- 图片广告
- 内部广告详情页
- 外部链接广告
- 当前窗口 / 新窗口打开
- 启用 / 停用
- 日期范围控制
- 后台上传图片

支持广告位：

- `home`
- `jobs`
- `housing`
- `secondhand`
- `services`
- `news`
- `navigation`
- `dmv`

| 功能 | 路径 |
|---|---|
| 广告后台 | `/admin/ads` |
| 广告详情 | `/ads/[slug]` |

---

## 后台管理系统

OpenAA 后台使用 `ADMIN_TOKEN` 进行管理访问控制。

后台入口：

```txt
/admin
```

后台模块：

| 功能 | 路径 | 说明 |
|---|---|---|
| 总后台 | `/admin` | 后台入口与模块总览 |
| 广告管理 | `/admin/ads` | 管理各页面广告 |
| 新闻管理 | `/admin/news` | 发布、编辑、下架新闻 |
| 反馈管理 | `/admin/feedback` | 处理反馈与举报 |
| 帖子管理 | `/admin/posts` | 统一管理招聘、房屋、二手 |
| 用户管理 | `/admin/users` | 管理用户状态、备注、禁用原因 |
| 首页板块配置 | `/admin/home-sections` | 控制首页模块显示、排序、数量 |
| 顶部快捷导航 | `/admin/top-links` | 管理顶部“纽约”快捷入口 |
| 导航管理 | `/admin/navigation` | 管理公共导航分类与链接 |
| 服务管理 | `/admin/services` | 管理本地服务信息 |
| 站点设置 | `/admin/settings` | 管理每日发布限制等配置 |
| 图片清理工具 | `/admin/image-cleanup` | 扫描并清理未使用图片 |

---

## SEO 与可发现性

OpenAA 已包含基础 SEO 能力。

当前 SEO 能力：

- `app/sitemap.ts` 自动生成 sitemap.xml
- `app/robots.ts` 自动生成 robots.txt
- 前台页面 metadata
- canonical URL
- NewsArticle structured data
- WebSite / WebPage structured data
- FAQ schema
- Breadcrumb schema
- DMV 页面 SEO metadata
- 后台、API、个人中心等页面禁止收录

SEO 相关重点：

- 主站域名由 `NEXT_PUBLIC_SITE_URL` 控制
- 后台路径 `/admin` 不应进入 sitemap
- API 路径不应进入 sitemap
- 发布页、个人中心、登录注册页不作为 SEO 主页面
- DMV、新闻、导航、服务详情页是重要 SEO 入口

---

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Next.js 15 App Router |
| 语言 | TypeScript |
| UI | React |
| 样式 | Tailwind CSS |
| 后端 | Supabase |
| 数据库 | Supabase PostgreSQL |
| 认证 | Supabase Auth |
| 存储 | Supabase Storage |
| 部署 | Vercel |
| 图标 | lucide-react |
| 轮播 | Swiper |

---

## Supabase 能力

OpenAA 使用 Supabase 提供：

- Auth 用户认证
- PostgreSQL 数据库
- Row Level Security
- Storage 图片存储
- Service Role 后台管理能力

主要 Storage buckets：

| Bucket | 用途 |
|---|---|
| `post-images` | 招聘、房屋、二手、本地服务等帖子图片 |
| `ads` | 广告图片 |
| `news-covers` | 新闻封面图 |

---

## 环境变量

本地开发和生产环境需要配置 `.env.local` 或 Vercel Environment Variables。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_TOKEN=
NEXT_PUBLIC_SITE_URL=https://ny.openaa.com
```

可选：

```bash
NEXT_PUBLIC_APP_URL=https://ny.openaa.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

说明：

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端后台 API 使用，不能暴露到前端 |
| `ADMIN_TOKEN` | 后台管理访问 token |
| `NEXT_PUBLIC_SITE_URL` | 站点正式域名，用于 sitemap、canonical、SEO |
| `NEXT_PUBLIC_APP_URL` | 可选，兼容部分跳转或 OAuth 场景 |

---

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量文件
cp .env.example .env.local

# 3. 编辑 .env.local
# 填入 Supabase URL、anon key、service role key、ADMIN_TOKEN 等

# 4. 启动开发服务器
npm run dev
```

打开：

```txt
http://localhost:3000
```

构建检查：

```bash
npm run build
```

---

## 部署

推荐部署到 Vercel。

部署要点：

1. 在 Vercel 绑定 GitHub 仓库
2. 配置 Supabase 环境变量
3. 配置 `ADMIN_TOKEN`
4. 配置 `NEXT_PUBLIC_SITE_URL=https://ny.openaa.com`
5. 确认 Supabase Auth Redirect URLs
6. 确认 Storage buckets 已创建
7. 部署后检查：
   - `/`
   - `/sitemap.xml`
   - `/robots.txt`
   - `/dmv`
   - `/news`
   - `/navigation`
   - `/admin`

---

## 项目目录

```txt
app/                         # Next.js App Router 页面与 API 路由
  admin/                     # 后台管理页面
  api/                       # API 路由
  auth/                      # 登录、注册、OAuth、密码重置
  dmv/                       # DMV 中文学习平台
  feedback/                  # 反馈与举报
  housing/                   # 房屋模块
  jobs/                      # 招聘模块
  navigation/                # 公共导航 / 我的导航
  news/                      # 新闻资讯
  profile/                   # 用户中心
  secondhand/                # 二手市场
  services/                  # 本地服务
  robots.ts                  # robots.txt 生成器
  sitemap.ts                 # sitemap.xml 生成器

components/                  # 可复用 React 组件
  Header.tsx                 # 全站顶部栏
  BottomNav.tsx              # 底部导航
  BannerCarousel.tsx         # 广告轮播
  GridMenu.tsx               # 首页 8 宫格
  LatestTickerBar.tsx        # 最新动态滚动条
  LatestPostsSection.tsx     # 首页最新发布聚合
  MyNavigationClient.tsx     # 我的导航

data/                        # 静态数据
  openaa-ny-dmv-questions-v1.json

lib/                         # 工具函数、Supabase client、SEO、账号状态、配置逻辑

docs/                        # 项目文档

supabase/                    # SQL 初始化脚本与 migrations
  migrations/                # 数据库增量迁移

types/                       # TypeScript 类型定义
```

---

## API 分类

OpenAA API 大致分为三类。

### 公开 API

无需登录，主要用于前台读取公开内容。

示例：

- `/api/ads`
- `/api/top-links`
- `/api/home-sections`
- `/api/latest-ticker`
- `/api/search`
- `/api/navigation`
- `/api/settings/daily-limit`

### 用户 API

需要用户登录或与当前用户相关。

示例：

- `/api/user/profile`
- `/api/user/navigation-links`
- `/api/user/navigation-settings`
- `/api/feedback`

### 后台 API

需要 `x-admin-token`，并使用服务端 Service Role Key。

示例：

- `/api/admin/ads`
- `/api/admin/news`
- `/api/admin/posts`
- `/api/admin/users`
- `/api/admin/feedback`
- `/api/admin/navigation`
- `/api/admin/home-sections`
- `/api/admin/image-cleanup`

---

## 当前已实现

- 首页综合入口
- 招聘模块
- 房屋模块
- 二手模块
- 本地服务模块
- 新闻模块
- 公共导航
- 我的导航
- DMV 中文学习平台
- DMV 150 题题库
- 随机 / 顺序练习
- 模拟考试
- 错题练习
- 标志专项
- 罚单查询入口
- 用户系统
- 反馈举报
- 广告系统
- 后台管理系统
- 用户管理
- 首页板块配置
- 顶部快捷导航
- 图片清理工具
- sitemap / robots / structured data

---

## 未来方向

- DMV 学习记录云同步
- 登录后多设备同步错题
- 更多州 DMV 题库
- 更多城市入口
- AI 搜索
- 华人本地服务生态
- 广告自助投放
- 更完整的 SEO 内容矩阵
- 图片 sitemap 与媒体 SEO

---

## 重要说明

OpenAA DMV 内容用于中文学习辅助，不是政府官方网站，也不替代 NY DMV 官方资料。正式考试、罚单、车辆、驾照等事务请以纽约 DMV、NYC Finance 等官方机构信息为准。

