# Life Adventure

> Make life better and more meaningful.

[打开线上版本](https://life-advanture.vercel.app) ·
[查看每日公共任务](https://github.com/Tmakerchima/lifeAdvanture/actions/workflows/daily-adventure.yml)

Life Adventure 是一个会逐渐认识你的 Life OS。它借用 Stanford
《Designing Your Life》的设计思维，把人生方向变成可逆的小实验，而不是一场
寻找唯一正确答案的考试。

## 产品闭环

- Google 登录，用户之间的数据完全隔离。
- 个人地图记录城市、人生阶段、兴趣、价值观、节奏和当日精力。
- 思考收件箱长期记录想法、困境、目标与复盘。
- 能量雷达记录一件事带来的能量和投入感。
- Qwen 读取当前用户的真实上下文，每天生成一个具体、低风险、可完成的行动。
- 未登录用户仍可使用公共任务、人生罗盘、三条 Odyssey 路线和浏览器本地日志。

用户数据存储在 Supabase Postgres 中。所有个人表都启用了 Row Level Security；
浏览器只能访问当前登录用户自己的记录。Qwen 和 Service Role 密钥只在服务端读取。

## 技术结构

- Next.js 16 / React 19
- Supabase Auth、Postgres 与 RLS
- Google OAuth（通过 Supabase）
- Qwen OpenAI-compatible Chat Completions API
- Vercel Functions 与 Vercel Cron
- GitHub Actions 维护未登录用户的公共任务

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
QWEN_API_KEY=
QWEN_BASE_URL=
QWEN_MODEL=qwen-plus
CRON_SECRET=
APP_URL=http://localhost:3000
```

不要把真实密钥写进 `.env.example`、源码、Git 历史或聊天记录。Qwen 的
workspace key 必须使用创建密钥时显示的对应 API host；不同地域或 workspace
的 base URL 可能不同。

## Supabase 初始化

1. 新建 Supabase project。
2. 在 SQL Editor 执行
   [`supabase/migrations/202607270001_life_os.sql`](supabase/migrations/202607270001_life_os.sql)。
3. 在 Authentication → Providers 启用 Google，并填入 Google OAuth Client ID
   与 Client Secret。
4. Google OAuth 的 Authorized redirect URI 填：
   `https://<project-ref>.supabase.co/auth/v1/callback`。
5. Supabase Authentication → URL Configuration：
   - Site URL：生产站点 URL
   - Redirect URLs：`http://localhost:3000/auth/callback` 与
     `https://life-advanture.vercel.app/auth/callback`

## 每日推荐

`vercel.json` 在每天 `00:00 UTC`（上海时间 08:00）调用
`/api/cron/daily`。端点通过 `CRON_SECRET` 验证 Vercel 请求，为最近活跃用户生成
当天推荐；同一用户同一天使用数据库唯一约束保持幂等。用户也可以在页面中即时生成
或刷新任务。

Vercel Hobby 的 cron 可能在计划小时内的任意时间运行，不保证整点触发。

## 验证

```bash
npm run vercel-build
npm test
npm run lint
```

## 方法来源

产品采用 Stanford Life Design Lab 的方法：人生罗盘、能量/投入日志、问题重构、
三份 Odyssey Plans、人生设计访谈、体验原型与失败复盘。它是对方法的个人化实践，
不是原书内容的替代品。
