"use client";

import { useEffect, useState } from "react";
import { Bot, LogOut, Save, Shield, Shuffle, WandSparkles, X } from "lucide-react";

type Tab = "ai" | "accounts";
type Account = { userKey: string; sessions: number };
const categoryLabels: Record<string, string> = { animals: "동물", food: "음식" };

async function api<T>(url: string, method = "GET", body?: object): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error((result as { error?: string }).error ?? "요청에 실패했습니다.");
  return result as T;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("ai");
  const [category, setCategory] = useState("");
  const [prompt, setPrompt] = useState("");
  const [savedPrompt, setSavedPrompt] = useState("");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [savedTopicPrompt, setSavedTopicPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [resultCategory, setResultCategory] = useState("");
  const [testFailed, setTestFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ prompt: string; topicPrompt: string }>("/api/ai")
      .then(({ prompt: value, topicPrompt: topicValue }) => {
        if (active) {
          setPrompt(value);
          setSavedPrompt(value);
          setTopicPrompt(topicValue);
          setSavedTopicPrompt(topicValue);
        }
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      })
      .finally(() => {
        if (active) setPromptLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "accounts") return;
    let active = true;
    setLoading(true);
    setError("");
    api<{ accounts: Account[] }>("/api/accounts")
      .then((data) => {
        if (active) setAccounts(data.accounts);
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab]);

  async function selectRandomTopic() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ category: string }>("/api/ai", "POST", { topic: { kind: "random" } });
      setCategory(categoryLabels[result.category] ?? result.category);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function generateWord() {
    setBusy(true);
    setError("");
    setTestFailed(false);
    setTestResult("생성 중...");
    setResultCategory(category.trim());
    try {
      const result = await api<{ word: string; category: string }>("/api/ai", "POST", {
        topic: { kind: "custom", category: category.trim() },
      });
      setResultCategory(categoryLabels[result.category] ?? result.category);
      setTestResult(result.word);
    } catch (cause) {
      setTestFailed(true);
      setTestResult(cause instanceof Error ? cause.message : "테스트에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function savePrompt() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ prompt: string }>("/api/ai", "PUT", { prompt });
      setPrompt(result.prompt);
      setSavedPrompt(result.prompt);
      setNotice("단어 생성 프롬프트가 저장됐습니다. 다음 단어부터 적용됩니다.");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveTopicPrompt() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ prompt: string }>("/api/ai", "PUT", { kind: "topic", prompt: topicPrompt });
      setTopicPrompt(result.prompt);
      setSavedTopicPrompt(result.prompt);
      setNotice("랜덤 주제 프롬프트가 저장됐습니다. 다음 랜덤 주제부터 적용됩니다.");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth", "DELETE");
      location.reload();
    } catch (cause) {
      setError(String(cause));
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "ai", label: "AI", icon: Bot },
    { id: "accounts", label: "계정 관리", icon: Shield },
  ];

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          Y / N <span>Admin</span>
        </div>
        <button
          type="button"
          className="icon-command"
          title="로그아웃"
          aria-label="로그아웃"
          onClick={() => void logout()}
        >
          <LogOut size={19} />
        </button>
      </header>
      <nav className="tabbar" aria-label="관리자 메뉴">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "tab active" : "tab"}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              setError("");
            }}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
      <div className="admin-content">
        {tab === "ai" && (
          <section>
            <p className="eyebrow">AI</p>
            <h1>AI 설정</h1>
            <div className="prompt-editor">
              <label className="field-label" htmlFor="topic-prompt">
                주제 생성 프롬프트
              </label>
              <textarea
                id="topic-prompt"
                value={topicPrompt}
                onChange={(event) => setTopicPrompt(event.target.value)}
                maxLength={4000}
                rows={6}
                disabled={promptLoading || busy}
              />
              <div className="prompt-actions">
                <span>{promptLoading ? "불러오는 중..." : `${topicPrompt.length} / 4000`}</span>
                <button
                  type="button"
                  className="primary"
                  disabled={promptLoading || busy || topicPrompt === savedTopicPrompt || !topicPrompt.trim()}
                  onClick={() => void saveTopicPrompt()}
                >
                  <Save size={18} />
                  저장
                </button>
              </div>
              <button type="button" className="secondary generation-button" disabled={busy} onClick={() => void selectRandomTopic()}>
                <Shuffle size={18} />
                랜덤 주제 만들기
              </button>
            </div>
            <div className="prompt-editor">
              <label className="field-label" htmlFor="word-prompt">
                단어 생성 프롬프트
              </label>
              <textarea
                id="word-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={4000}
                rows={7}
                disabled={promptLoading || busy}
              />
              <div className="prompt-actions">
                <span>{promptLoading ? "불러오는 중..." : `${prompt.length} / 4000`}</span>
                <button
                  type="button"
                  className="primary"
                  disabled={
                    promptLoading ||
                    busy ||
                    prompt === savedPrompt ||
                    !prompt.trim() ||
                    !prompt.includes("{{category}}")
                  }
                  onClick={() => void savePrompt()}
                >
                  <Save size={18} />
                  저장
                </button>
              </div>
              <div className="topic-entry">
                <label htmlFor="word-category">주제 직접 입력</label>
                <div className="topic-action">
                  <input
                    id="word-category"
                    value={category}
                    maxLength={40}
                    onChange={(event) => setCategory(event.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy || !category.trim()}
                    onClick={() => void generateWord()}
                  >
                    <WandSparkles size={18} />
                    입력한 주제로 만들기
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {tab === "accounts" && (
          <section>
            <p className="eyebrow">ACCOUNTS / SESSIONS</p>
            <h1>계정 관리</h1>
            {!loading &&
              (accounts.length ? (
                <div className="account-list">
                  {accounts.map((account) => (
                    <div key={account.userKey} className="account-row">
                      <strong>사용자 {account.userKey}</strong>
                      <span>활성 세션 {account.sessions}개</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">활성 로그인 계정이 없습니다.</p>
              ))}
          </section>
        )}
        {loading && (
          <p role="status" className="supporting">
            불러오는 중...
          </p>
        )}
        {notice && (
          <p role="status" className="success">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <footer>YES OR NO / ADMIN</footer>
      {testResult !== null && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setTestResult(null);
          }}
        >
          <div className="result-dialog" role="dialog" aria-modal="true" aria-label="단어 생성 결과">
            <div className="dialog-heading">
              <span>단어 생성 결과</span>
              <button
                type="button"
                className="icon-command"
                aria-label="닫기"
                title="닫기"
                disabled={busy}
                onClick={() => setTestResult(null)}
              >
                <X size={19} />
              </button>
            </div>
            <p className={testFailed ? "dialog-word error" : "dialog-word"} role="status">
              {testResult}
            </p>
            <p className="supporting">주제: {resultCategory}</p>
            <button type="button" className="secondary" disabled={busy} onClick={() => setTestResult(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
