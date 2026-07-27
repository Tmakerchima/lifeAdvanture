"use client";

import { useEffect, useMemo, useState } from "react";
import daily from "../data/daily.json";
import PersonalHub from "./components/personal-hub";

type Quest = {
  title: string;
  description: string;
  xp: number;
  minutes: number;
  type: string;
};

type CompassKey = "health" | "work" | "play" | "love";

const compassLabels: Record<CompassKey, string> = {
  health: "健康",
  work: "事业",
  play: "玩乐",
  love: "关系",
};

const initialCompass: Record<CompassKey, number> = {
  health: 3,
  work: 2,
  play: 3,
  love: 3,
};

const odysseys = [
  {
    code: "A",
    title: "探索型创造者",
    line: "把 gap 变成作品季：做产品、写作、认识有趣的人。",
    prototype: "用 7 天做一个能被 3 个陌生人使用的小产品。",
  },
  {
    code: "B",
    title: "城市冒险家",
    line: "把上海当作开放世界：街区、社群、手艺与短途远方。",
    prototype: "参加一次从未接触过的线下活动，并邀请一人喝咖啡。",
  },
  {
    code: "C",
    title: "自由迁徙者",
    line: "如果履历与面子都不重要，测试一种更自由的工作和生活。",
    prototype: "在上海之外住 7 天，同时完成一个可远程交付的项目。",
  },
];

const questTypeNames: Record<string, string> = {
  explore: "探索",
  create: "创造",
  connect: "连接",
  reflect: "复盘",
  move: "行动",
};

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);
  const [compass, setCompass] = useState(initialCompass);
  const [energy, setEnergy] = useState(3);
  const [engagement, setEngagement] = useState(3);
  const [activity, setActivity] = useState("");
  const [note, setNote] = useState("");
  const [logs, setLogs] = useState<
    Array<{ activity: string; energy: number; engagement: number; note: string }>
  >([]);

  useEffect(() => {
    const hydrateLocalProgress = window.setTimeout(() => {
      setXp(readStored("la-xp", 0));
      setDone(readStored(`la-done-${daily.date}`, false));
      setCompass(readStored("la-compass", initialCompass));
      setLogs(readStored("la-good-time", []));
    }, 0);
    return () => window.clearTimeout(hydrateLocalProgress);
  }, []);

  const level = Math.floor(xp / 100) + 1;
  const levelProgress = xp % 100;
  const quest = daily.quest as Quest;
  const dateLabel = useMemo(() => {
    const value = new Date(`${daily.date}T12:00:00+08:00`);
    return new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(value);
  }, []);

  function completeQuest() {
    if (done) return;
    const nextXp = xp + quest.xp;
    setXp(nextXp);
    setDone(true);
    localStorage.setItem("la-xp", JSON.stringify(nextXp));
    localStorage.setItem(`la-done-${daily.date}`, JSON.stringify(true));
  }

  function updateCompass(key: CompassKey, value: number) {
    const next = { ...compass, [key]: value };
    setCompass(next);
    localStorage.setItem("la-compass", JSON.stringify(next));
  }

  function saveLog() {
    if (!activity.trim()) return;
    const next = [
      { activity: activity.trim(), energy, engagement, note: note.trim() },
      ...logs,
    ].slice(0, 7);
    setLogs(next);
    setActivity("");
    setNote("");
    localStorage.setItem("la-good-time", JSON.stringify(next));
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Life Adventure 首页">
          LIFE<span> / </span>ADVENTURE
        </a>
        <nav aria-label="页面导航">
          <a href="#personal">我的 Life OS</a>
          <a href="#quest">今日任务</a>
          <a href="#compass">人生罗盘</a>
          <a href="#odyssey">三条路线</a>
          <a href="#journal">能量日志</a>
        </nav>
        <div className="level-pill">
          <span>LV.{level}</span>
          <div className="level-track" aria-label={`等级进度 ${levelProgress}%`}>
            <i style={{ width: `${levelProgress}%` }} />
          </div>
          <strong>{xp} XP</strong>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">
          <span className="pulse" />
          LIFE DESIGN · PERSONAL EXPERIMENTS
        </div>
        <h1>
          人生不是答案，
          <br />
          是一场<span>可玩的实验。</span>
        </h1>
        <p className="hero-copy">
          不急着选出唯一正确的路。每天完成一个小任务，收集真实的能量信号，
          再用原型一步步走向更好的生活。
        </p>
        <div className="player-class">
          <span>你的职业</span>
          <b>由你定义，不由模板决定</b>
          <p>上班、恋爱、创业、旅行或休息 · 系统会从你的真实生活开始学习</p>
        </div>
        <div className="hero-actions">
          <a className="button primary" href="#personal">
            建立我的 Life OS <span>→</span>
          </a>
          <a className="button ghost" href="#odyssey">
            查看我的三种人生
          </a>
        </div>
        <div className="hero-meta">
          <span>01</span>
          <p>不是找到热爱<br />而是通过行动培养热爱</p>
          <span>02</span>
          <p>不是做终身决定<br />而是做可逆的小实验</p>
          <span>03</span>
          <p>不是优化每一分钟<br />而是留出意外的空间</p>
        </div>
      </section>

      <PersonalHub />

      <section className="quest-section" id="quest">
        <div className="section-heading">
          <div>
            <p className="kicker">PUBLIC DAILY QUEST</p>
            <h2>还没登录？先试试公共任务</h2>
          </div>
          <p className="date">{dateLabel}</p>
        </div>
        <article className={`quest-card ${done ? "done" : ""}`}>
          <div className="quest-index">Q{String(daily.dayOfYear).padStart(3, "0")}</div>
          <div className="quest-content">
            <div className="quest-tags">
              <span>{questTypeNames[quest.type] ?? quest.type}</span>
              <span>{quest.minutes} 分钟</span>
              <span>+{quest.xp} XP</span>
            </div>
            <h3>{quest.title}</h3>
            <p>{quest.description}</p>
            <div className="why">
              <b>为什么做这个？</b>
              <span>{daily.why}</span>
            </div>
          </div>
          <button onClick={completeQuest} disabled={done}>
            <span>{done ? "✓" : ""}</span>
            {done ? "任务完成" : "完成任务"}
          </button>
        </article>
        <p className="microcopy">
          “设计师不会只是思考如何前进，他们会动手创造前进的路。”
          <span>— Designing Your Life</span>
        </p>
      </section>

      <section className="compass-section" id="compass">
        <div className="section-heading light">
          <div>
            <p className="kicker">LIFE COMPASS</p>
            <h2>先看见现在，不急着修好一切</h2>
          </div>
          <p>1 = 快见底了 · 5 = 很有生命力</p>
        </div>
        <div className="compass-grid">
          {(Object.keys(compassLabels) as CompassKey[]).map((key, index) => (
            <article key={key}>
              <span className="compass-number">0{index + 1}</span>
              <h3>{compassLabels[key]}</h3>
              <div className="dots" role="group" aria-label={`${compassLabels[key]}评分`}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={value <= compass[key] ? "active" : ""}
                    onClick={() => updateCompass(key, value)}
                    aria-label={`${value} 分`}
                  />
                ))}
              </div>
              <p>{compass[key]}/5</p>
            </article>
          ))}
        </div>
        <p className="compass-note">
          最低分不是失败，它只是下一轮设计最值得关注的入口。
        </p>
      </section>

      <section className="odyssey-section" id="odyssey">
        <div className="section-heading">
          <div>
            <p className="kicker">THREE ODYSSEYS</p>
            <h2>你不只拥有一种未来</h2>
          </div>
          <p className="section-copy">
            不用三选一。先从每条路各偷一个小实验，用现实反馈替代脑内争论。
          </p>
        </div>
        <div className="odyssey-grid">
          {odysseys.map((item) => (
            <article key={item.code}>
              <div className="odyssey-code">{item.code}</div>
              <p className="route">ROUTE {item.code}</p>
              <h3>{item.title}</h3>
              <p>{item.line}</p>
              <div className="prototype">
                <span>本月原型</span>
                {item.prototype}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="journal-section" id="journal">
        <div className="journal-intro">
          <p className="kicker">GOOD TIME JOURNAL</p>
          <h2>记录什么让你活过来</h2>
          <p>
            “喜欢什么”很难凭空想清楚。连续两周记录活动后的投入感与能量，
            你会看到自己的隐藏线索。
          </p>
          <div className="legend">
            <span><i className="energy-dot" />能量：结束后更有劲吗？</span>
            <span><i className="engage-dot" />投入：过程中忘记时间吗？</span>
          </div>
        </div>
        <div className="journal-card">
          <label>
            刚刚做了什么？
            <input
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              placeholder="例如：和产品设计师喝咖啡"
            />
          </label>
          <div className="rating-row">
            <label>
              能量 <b>{energy}/5</b>
              <input
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(event) => setEnergy(Number(event.target.value))}
              />
            </label>
            <label>
              投入 <b>{engagement}/5</b>
              <input
                type="range"
                min="1"
                max="5"
                value={engagement}
                onChange={(event) => setEngagement(Number(event.target.value))}
              />
            </label>
          </div>
          <label>
            一句话线索（可选）
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="是什么让我喜欢 / 不喜欢？"
            />
          </label>
          <button onClick={saveLog}>保存这条线索</button>
          {logs.length > 0 && (
            <div className="recent-log">
              <span>最近线索</span>
              <strong>{logs[0].activity}</strong>
              <p>能量 {logs[0].energy} · 投入 {logs[0].engagement}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rules">
        <p className="kicker">FIELD RULES</p>
        <h2>冒险者守则</h2>
        <div>
          <p><b>01</b>好奇心优先于确定性</p>
          <p><b>02</b>用原型代替豪赌</p>
          <p><b>03</b>把失败记为情报</p>
          <p><b>04</b>每周留一个空白格</p>
          <p><b>05</b>别人的热爱只是线索，不是你的标准答案</p>
          <p><b>06</b>好的系统会认识你，也允许你随时改变</p>
        </div>
      </section>

      <footer>
        <a className="brand" href="#top">LIFE<span> / </span>ADVENTURE</a>
        <p>MAKE LIFE BETTER AND MORE MEANINGFUL.</p>
        <p>每天一点行动，一点意外，一点更像自己。</p>
      </footer>
    </main>
  );
}
