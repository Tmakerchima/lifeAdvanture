"use client";

import { FormEvent, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import type {
  DailyRecommendation,
  LifeDashboardData,
  LifeEntry,
  LifeEntryKind,
} from "../../lib/life-types";

const entryLabels: Record<LifeEntryKind, string> = {
  thought: "想法",
  dilemma: "困境",
  goal: "目标",
  reflection: "复盘",
};

type Notice = { kind: "good" | "bad"; text: string } | null;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(body.detail || body.error || "请求失败，请稍后再试");
  }
  return body as T;
}

function splitList(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PersonalHub() {
  const supabase = getBrowserSupabaseClient();
  const [sessionState, setSessionState] = useState<
    "loading" | "guest" | "member"
  >(supabase ? "loading" : "guest");
  const [data, setData] = useState<LifeDashboardData | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState("");
  const [profile, setProfile] = useState({
    display_name: "",
    city: "",
    life_stage: "",
    about_me: "",
    interests: "",
    core_values: "",
    preferred_pace: "balanced",
    energy_budget: 3,
  });
  const [entry, setEntry] = useState({
    kind: "thought" as LifeEntryKind,
    title: "",
    content: "",
    priority: 3,
  });
  const [log, setLog] = useState({
    activity: "",
    energy: 3,
    engagement: 3,
    note: "",
  });

  async function loadDashboard() {
    try {
      const dashboard = await api<LifeDashboardData>("/api/me");
      setData(dashboard);
      setSessionState("member");
      setProfile({
        display_name:
          dashboard.profile?.display_name || dashboard.user.name || "",
        city: dashboard.profile?.city || "",
        life_stage: dashboard.profile?.life_stage || "",
        about_me: dashboard.profile?.about_me || "",
        interests: dashboard.profile?.interests?.join("、") || "",
        core_values: dashboard.profile?.core_values?.join("、") || "",
        preferred_pace: dashboard.profile?.preferred_pace || "balanced",
        energy_budget: dashboard.profile?.energy_budget || 3,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        setSessionState("guest");
      } else {
        setSessionState("member");
        setNotice({
          kind: "bad",
          text:
            error instanceof Error
              ? error.message
              : "个性化数据暂时无法读取",
        });
      }
    }
  }

  useEffect(() => {
    if (!supabase) return;
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setData(null);
        setSessionState("guest");
      }
    });
    return () => {
      window.clearTimeout(initialLoad);
      subscription.unsubscribe();
    };
    // Supabase is a stable singleton; this should run once in the browser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    if (!supabase) {
      setNotice({
        kind: "bad",
        text: "个性化服务尚未配置完成，请稍后回来。",
      });
      return;
    }
    setBusy("login");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/#personal`,
      },
    });
    if (error) {
      setBusy("");
      setNotice({ kind: "bad", text: error.message });
    }
  }

  async function signOut() {
    setBusy("logout");
    await supabase?.auth.signOut();
    setBusy("");
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy("profile");
    setNotice(null);
    try {
      await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...profile,
          interests: splitList(profile.interests),
          core_values: splitList(profile.core_values),
        }),
      });
      await loadDashboard();
      setNotice({ kind: "good", text: "你的个人地图已更新。" });
    } catch (error) {
      setNotice({
        kind: "bad",
        text: error instanceof Error ? error.message : "保存失败",
      });
    } finally {
      setBusy("");
    }
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    setBusy("entry");
    setNotice(null);
    try {
      const saved = await api<LifeEntry>("/api/entries", {
        method: "POST",
        body: JSON.stringify(entry),
      });
      setData((current) =>
        current ? { ...current, entries: [saved, ...current.entries] } : current,
      );
      setEntry({ ...entry, title: "", content: "" });
      setNotice({
        kind: "good",
        text: "已记住。下一次 AI 推荐会把它纳入判断。",
      });
    } catch (error) {
      setNotice({
        kind: "bad",
        text: error instanceof Error ? error.message : "记录失败",
      });
    } finally {
      setBusy("");
    }
  }

  async function completeEntry(id: string) {
    const updated = await api<LifeEntry>("/api/entries", {
      method: "PATCH",
      body: JSON.stringify({ id, status: "completed" }),
    });
    setData((current) =>
      current
        ? {
            ...current,
            entries: current.entries.map((item) =>
              item.id === id ? updated : item,
            ),
          }
        : current,
    );
  }

  async function saveLog(event: FormEvent) {
    event.preventDefault();
    setBusy("log");
    try {
      const saved = await api<LifeDashboardData["energyLogs"][number]>(
        "/api/journal",
        { method: "POST", body: JSON.stringify(log) },
      );
      setData((current) =>
        current
          ? { ...current, energyLogs: [saved, ...current.energyLogs] }
          : current,
      );
      setLog({ ...log, activity: "", note: "" });
      setNotice({ kind: "good", text: "能量线索已保存。" });
    } catch (error) {
      setNotice({
        kind: "bad",
        text: error instanceof Error ? error.message : "记录失败",
      });
    } finally {
      setBusy("");
    }
  }

  async function generateRecommendation(force = false) {
    setBusy("recommendation");
    setNotice(null);
    try {
      const recommendation = await api<DailyRecommendation>(
        "/api/recommendation",
        { method: "POST", body: JSON.stringify({ force }) },
      );
      setData((current) =>
        current ? { ...current, recommendation } : current,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "生成失败";
      setNotice({
        kind: "bad",
        text: message.includes("QWEN_NOT_CONFIGURED")
          ? "AI 引擎尚未配置。你的记录已经安全保存，配置完成后即可生成。"
          : message,
      });
    } finally {
      setBusy("");
    }
  }

  if (sessionState === "loading") {
    return (
      <section className="personal-section" id="personal">
        <p className="personal-loading">正在读取你的冒险档案…</p>
      </section>
    );
  }

  if (sessionState === "guest") {
    return (
      <section className="personal-section" id="personal">
        <div className="personal-pitch">
          <p className="kicker">YOUR LIFE OS · PRIVATE BY DEFAULT</p>
          <h2>不是别人的人生模板，是你的个人操作系统。</h2>
          <p>
            登录后记录你的想法、困境、目标和真实能量。AI
            会基于这些长期线索，每天给你一个足够小、又有一点冒险的下一步。
          </p>
          <div className="privacy-points">
            <span>独立账号与私有数据</span>
            <span>推荐随你变化</span>
            <span>你决定什么值得追求</span>
          </div>
        </div>
        <div className="login-card">
          <span className="login-mark">↗</span>
          <p>建立你的冒险者档案</p>
          <h3>先让系统认识真实的你</h3>
          <button onClick={signIn} disabled={busy === "login"}>
            <b>G</b>
            {busy === "login" ? "正在前往 Google…" : "使用 Google 登录"}
          </button>
          <small>登录即代表你愿意让 Life Adventure 保存你的个人记录。</small>
          {notice && <p className={`notice ${notice.kind}`}>{notice.text}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="personal-dashboard" id="personal">
      <div className="dashboard-head">
        <div>
          <p className="kicker">PERSONAL COMMAND CENTER</p>
          <h2>{data?.user.name || "冒险者"}，今天想把人生推向哪里？</h2>
        </div>
        <div className="member-chip">
          {data?.user.avatar && (
            // Google supplies this URL as part of the authenticated profile.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.user.avatar} alt="" />
          )}
          <span>{data?.user.email}</span>
          <button onClick={signOut} disabled={busy === "logout"}>
            退出
          </button>
        </div>
      </div>

      {notice && <p className={`notice wide ${notice.kind}`}>{notice.text}</p>}

      <div className="dashboard-grid">
        <article className="ai-quest-panel">
          <p className="panel-label">AI · TODAY&apos;S NEXT MOVE</p>
          {data?.recommendation ? (
            <>
              <div className="quest-tags">
                <span>{data.recommendation.quest_type}</span>
                <span>{data.recommendation.minutes} 分钟</span>
                <span>+{data.recommendation.xp} XP</span>
              </div>
              <h3>{data.recommendation.quest_title}</h3>
              <p>{data.recommendation.quest_description}</p>
              <div className="ai-rationale">
                <b>为什么是这个</b>
                <span>{data.recommendation.rationale}</span>
              </div>
              <blockquote>{data.recommendation.coaching_note}</blockquote>
              <p className="reflection-question">
                完成后问自己：{data.recommendation.reflection_question}
              </p>
              <button
                className="text-button"
                onClick={() => generateRecommendation(true)}
                disabled={busy === "recommendation"}
              >
                {busy === "recommendation" ? "AI 正在重新思考…" : "换一个方向"}
              </button>
            </>
          ) : (
            <div className="empty-ai">
              <span>你的记录 → Qwen → 一个可行动的下一步</span>
              <h3>准备好今天的个性化任务了吗？</h3>
              <p>档案越真实，建议越不像套话。可以先补充下方的个人地图。</p>
              <button
                onClick={() => generateRecommendation()}
                disabled={busy === "recommendation"}
              >
                {busy === "recommendation" ? "AI 正在设计…" : "生成今日任务"}
              </button>
            </div>
          )}
        </article>

        <form className="profile-panel" onSubmit={saveProfile}>
          <p className="panel-label">01 · 我的地图</p>
          <label>
            你希望怎么称呼？
            <input
              value={profile.display_name}
              onChange={(event) =>
                setProfile({ ...profile, display_name: event.target.value })
              }
              placeholder="例如：小林"
            />
          </label>
          <div className="two-inputs">
            <label>
              所在城市
              <input
                value={profile.city}
                onChange={(event) =>
                  setProfile({ ...profile, city: event.target.value })
                }
                placeholder="上海 / 远程 / 在路上"
              />
            </label>
            <label>
              当前阶段
              <input
                value={profile.life_stage}
                onChange={(event) =>
                  setProfile({ ...profile, life_stage: event.target.value })
                }
                placeholder="gap / 上班 / 恋爱中…"
              />
            </label>
          </div>
          <label>
            最近的我
            <textarea
              value={profile.about_me}
              onChange={(event) =>
                setProfile({ ...profile, about_me: event.target.value })
              }
              placeholder="生活现状、期待、限制，想到什么就写什么"
            />
          </label>
          <label>
            兴趣（用顿号分隔）
            <input
              value={profile.interests}
              onChange={(event) =>
                setProfile({ ...profile, interests: event.target.value })
              }
              placeholder="跑步、做饭、研究产品、谈恋爱"
            />
          </label>
          <label>
            重要的价值
            <input
              value={profile.core_values}
              onChange={(event) =>
                setProfile({ ...profile, core_values: event.target.value })
              }
              placeholder="自由、稳定、亲密、创造"
            />
          </label>
          <div className="two-inputs">
            <label>
              喜欢的节奏
              <select
                value={profile.preferred_pace}
                onChange={(event) =>
                  setProfile({ ...profile, preferred_pace: event.target.value })
                }
              >
                <option value="gentle">温和慢慢来</option>
                <option value="balanced">行动与留白平衡</option>
                <option value="bold">大胆一点</option>
              </select>
            </label>
            <label>
              今日精力 {profile.energy_budget}/5
              <input
                type="range"
                min="1"
                max="5"
                value={profile.energy_budget}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    energy_budget: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <button disabled={busy === "profile"}>
            {busy === "profile" ? "保存中…" : "保存个人地图"}
          </button>
        </form>

        <form className="entry-panel" onSubmit={saveEntry}>
          <p className="panel-label">02 · 思考收件箱</p>
          <div className="kind-tabs" role="group" aria-label="记录类型">
            {(Object.keys(entryLabels) as LifeEntryKind[]).map((kind) => (
              <button
                type="button"
                className={entry.kind === kind ? "active" : ""}
                key={kind}
                onClick={() => setEntry({ ...entry, kind })}
              >
                {entryLabels[kind]}
              </button>
            ))}
          </div>
          <input
            value={entry.title}
            onChange={(event) =>
              setEntry({ ...entry, title: event.target.value })
            }
            placeholder="给这件事起个名字"
            aria-label="记录标题"
            required
          />
          <textarea
            value={entry.content}
            onChange={(event) =>
              setEntry({ ...entry, content: event.target.value })
            }
            placeholder="例如：我想回去上班，但怕失去现在的自由；我希望认真经营一段关系……"
            aria-label="记录内容"
            required
          />
          <button disabled={busy === "entry"}>
            {busy === "entry" ? "保存中…" : `记下这个${entryLabels[entry.kind]}`}
          </button>
          <div className="entry-list">
            {data?.entries.slice(0, 6).map((item) => (
              <div className={item.status === "completed" ? "complete" : ""} key={item.id}>
                <span>{entryLabels[item.kind]}</span>
                <strong>{item.title}</strong>
                <p>{item.content}</p>
                {item.status === "active" && (
                  <button type="button" onClick={() => completeEntry(item.id)}>
                    标记已完成
                  </button>
                )}
              </div>
            ))}
          </div>
        </form>

        <form className="energy-panel" onSubmit={saveLog}>
          <p className="panel-label">03 · 能量雷达</p>
          <h3>什么让你更有生命力？</h3>
          <input
            value={log.activity}
            onChange={(event) =>
              setLog({ ...log, activity: event.target.value })
            }
            placeholder="刚刚做了什么？"
            aria-label="活动"
            required
          />
          <label>
            结束后的能量 <b>{log.energy}/5</b>
            <input
              type="range"
              min="1"
              max="5"
              value={log.energy}
              onChange={(event) =>
                setLog({ ...log, energy: Number(event.target.value) })
              }
            />
          </label>
          <label>
            过程中的投入 <b>{log.engagement}/5</b>
            <input
              type="range"
              min="1"
              max="5"
              value={log.engagement}
              onChange={(event) =>
                setLog({ ...log, engagement: Number(event.target.value) })
              }
            />
          </label>
          <textarea
            value={log.note}
            onChange={(event) => setLog({ ...log, note: event.target.value })}
            placeholder="是什么让我喜欢或不喜欢？（可选）"
          />
          <button disabled={busy === "log"}>
            {busy === "log" ? "保存中…" : "保存能量线索"}
          </button>
          {data?.energyLogs[0] && (
            <div className="last-energy">
              最近：{data.energyLogs[0].activity} · 能量{" "}
              {data.energyLogs[0].energy}/5
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
