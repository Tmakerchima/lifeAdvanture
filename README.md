# Life Adventure

> Make life better and more meaningful.

[打开线上版本](https://life-advanture.vercel.app) ·
[查看每日任务](https://github.com/Tmakerchima/lifeAdvanture/actions/workflows/daily-adventure.yml)

Life Adventure 是一个伴随人生的轻量系统。它不是把生活变成效率 KPI，
而是借用《Designing Your Life》的设计思维，让你每天完成一个可逆的小实验，
记录真实反馈，并逐渐长出属于自己的方向。

## 现在可以做什么

- 每天领取一个 20–90 分钟的冒险任务，完成后获得 XP。
- 用健康、事业、玩乐、关系四个维度检查人生罗盘。
- 同时保留三条“奥德赛路线”，避免被唯一正确答案困住。
- 用 Good Time Journal 记录活动后的能量与投入感。
- 所有个人记录只保存在当前浏览器，不上传服务器。

## 给 27 岁、在上海 gap 的 14 天开局

1. 第 1 天：给健康、事业、玩乐、关系各打 1–5 分，只选最低项行动。
2. 第 2–4 天：每次活动后记录能量与投入，不评价“有没有用”。
3. 第 5 天：写三条五年人生路线：延续、替代、无视金钱与面子。
4. 第 6–7 天：去一个陌生街区，并与一个正在过你向往生活的人交流。
5. 第 8–10 天：选择一条路线，做一个 60 分钟可展示的原型。
6. 第 11–13 天：把原型交给三个人，问他们看到了什么，不问“你喜欢吗”。
7. 第 14 天：复盘能量日志，保留高能量模式，给下一轮实验排期。

判断这 14 天是否成功只有一个标准：你是否获得了原来没有的新信息。

## 每日自动更新

GitHub Actions 每天上海时间 08:05 运行
`node scripts/update-daily.mjs`，从任务池中生成当天任务并提交。
也可以在 Actions 页面手动运行 `Daily adventure`。新提交会自动触发
Vercel 生产部署，因此网页会随当天任务一起更新。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

## 部署到 Vercel

生产环境已连接 `Tmakerchima/lifeAdvanture` 的 `main` 分支：
<https://life-advanture.vercel.app>。项目包含专用的 `vercel-build`
命令和 `vercel.json`。

## 方法来源

产品采用 Stanford Life Design Lab 的方法：人生罗盘、能量/投入日志、
问题重构、三份 Odyssey Plans、人生设计访谈、体验原型与失败复盘。
它是对方法的个人化实践，不是原书内容的替代品。
