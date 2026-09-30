'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { authResponseSchema, gameResponseSchema, type GameMode, type PublicGame, type Reply } from '@yes-or-no/shared';

const categoryLabels: Record<string, string> = { animals: '동물', food: '음식', random: '랜덤' };
const steps = ['카테고리', '문제 수', '게임 방식', '단어 선택'];

export default function Home() {
  const [step, setStep] = useState(0);
  const [categoryType, setCategoryType] = useState<'random' | 'custom'>('random');
  const [categoryName, setCategoryName] = useState('');
  const [questionType, setQuestionType] = useState<'standard' | 'custom'>('standard');
  const [questionLimit, setQuestionLimit] = useState(20);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [word, setWord] = useState('');
  const [game, setGame] = useState<PublicGame | null>(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'question' | 'guess'>('question');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (response.ok) setAuthenticated(authResponseSchema.parse(await response.json()).authenticated);
      })
      .catch(() => setError('로그인 상태를 확인할 수 없습니다.'));
  }, []);

  async function login() {
    setBusy(true);
    setError('');
    try {
      const { appLogin } = await import('@apps-in-toss/web-framework');
      const { authorizationCode, referrer } = await appLogin();
      const response = await fetch('/api/auth/toss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode, referrer }),
      });
      if (!response.ok) throw new Error('토스 로그인에 실패했습니다.');
      setAuthenticated(authResponseSchema.parse(await response.json()).authenticated);
    } catch {
      setError('토스 앱에서 로그인을 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Logout failed');
      setAuthenticated(false);
    } catch {
      setError('로그아웃에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function send(url: string, body: object) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error((data as { error?: string }).error ?? '요청에 실패했습니다.');
      setGame(gameResponseSchema.parse(data).game);
      setText('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function startGame() {
    if (!mode) return;
    void send('/api/games', {
      category: categoryType === 'random' ? 'random' : categoryName.trim(),
      maxQuestions: questionType === 'standard' ? 20 : questionLimit,
      mode,
      ...(mode !== 'attack' ? { word: word.trim() } : {}),
    });
  }

  const validStep = step === 0 ? categoryType === 'random' || !!categoryName.trim()
    : step === 1 ? questionType === 'standard' || Number.isInteger(questionLimit) && questionLimit >= 1 && questionLimit <= 50
      : step === 2 ? mode !== null
        : mode === 'attack' || !!word.trim() && Array.from(word.trim()).length <= 5;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (game && text.trim()) void send(`/api/games/${game.id}`, { kind, text });
  }

  return <main className="shell">
    <header className="masthead"><span className="mark">Y / N</span><div className="header-actions"><span>YES OR NO</span><button type="button" className="auth-button" disabled={busy} onClick={() => void (authenticated ? logout() : login())}>{authenticated ? '로그아웃' : '토스로 로그인'}</button></div></header>
    <section className="game-area">
      {!game ? <div className="setup">
        <div className="step-meta"><span>게임 준비</span><span>{step + 1} / {steps.length}</span></div>
        <div className="step-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4}><span style={{ width: `${(step + 1) * 25}%` }} /></div>
        <p className="eyebrow">STEP {String(step + 1).padStart(2, '0')} · {steps[step]}</p>
        <h1>{['어떤 주제로 할까요?', '질문은 몇 번 할까요?', '어떤 역할로 할까요?', '단어를 정해 주세요'][step]}</h1>
        {step === 0 && <div className="choices">
          <button type="button" className={`choice ${categoryType === 'random' ? 'selected' : ''}`} onClick={() => setCategoryType('random')}><strong>랜덤</strong><span>주제는 게임을 시작할 때 정해져요</span></button>
          <button type="button" className={`choice ${categoryType === 'custom' ? 'selected' : ''}`} disabled={!authenticated} onClick={() => setCategoryType('custom')}><strong>직접 입력 {!authenticated && <small>로그인 필요</small>}</strong><span>원하는 주제로 게임해요</span></button>
          {categoryType === 'custom' && <label className="field">카테고리 이름<input autoFocus maxLength={20} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="예: 동물, 음식" /></label>}
        </div>}
        {step === 1 && <div className="choices">
          <button type="button" className={`choice ${questionType === 'standard' ? 'selected' : ''}`} onClick={() => setQuestionType('standard')}><strong>20문제</strong><span>기본 질문 횟수</span></button>
          <button type="button" className={`choice ${questionType === 'custom' ? 'selected' : ''}`} disabled={!authenticated} onClick={() => setQuestionType('custom')}><strong>직접 입력 {!authenticated && <small>로그인 필요</small>}</strong><span>1~50문제 중에서 선택</span></button>
          {questionType === 'custom' && <label className="field">문제 수<input autoFocus type="number" min={1} max={50} value={questionLimit} onChange={(event) => setQuestionLimit(Number(event.target.value))} /></label>}
        </div>}
        {step === 2 && <div className="choices">
          {([['both', '공격 & 수비', 'AI의 단어를 맞힌 뒤, 내 단어를 지켜요'], ['attack', '공격', '내가 AI의 단어를 맞혀요'], ['defense', '수비', 'AI가 내 단어를 맞혀요']] as const).map(([value, label, detail]) =>
            <button type="button" key={value} className={`choice ${mode === value ? 'selected' : ''}`} onClick={() => setMode(value)}><strong>{label}</strong><span>{detail}</span></button>)}
        </div>}
        {step === 3 && <div className="choices">
          {mode === 'attack' ? <div className="choice selected static-choice"><strong>AI가 단어를 고릅니다</strong><span>시작하면 서버에서 비공개로 단어를 준비해요</span></div> : <label className="field">AI가 맞힐 단어<input autoFocus value={word} onChange={(event) => setWord(event.target.value)} maxLength={5} placeholder="5자 이하의 단어" /><span>게임 시작 시 서버에서 단어가 유효한지 확인합니다.</span></label>}
        </div>}
        <div className="wizard-actions"><button type="button" className="secondary" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>이전</button><button type="button" disabled={!validStep || busy} onClick={() => step === 3 ? startGame() : setStep(step + 1)}>{busy ? '확인 중...' : step === 3 ? '게임 시작 →' : '다음 →'}</button></div>
      </div> : <div className="play-screen">
        <div className="heading"><p className="eyebrow">{game.phase === 'attack' ? '공격 라운드' : '수비 라운드'}</p><h1>{game.phase === 'attack' ? '무엇일까요?' : '단어를 지켜 주세요'}</h1></div>
        <div className="play"><div className="score"><strong>{categoryLabels[game.category] ?? game.category}</strong><span>질문 {game.questionCount} / {game.maxQuestions}</span></div>
          <div className="history" aria-live="polite">{game.history.length === 0 ? <p className="empty">첫 질문을 입력해 주세요.</p> : game.history.map((item, index) => <p key={index} className={item.role === 'assistant' ? 'reply' : 'question'}><span>{item.role === 'assistant' ? 'AI' : '나'} · {item.kind === 'question' ? '질문' : item.kind === 'guess' ? '추측' : '답변'}</span>{item.text}</p>)}</div>
          {game.status === 'playing' ? game.phase === 'attack' ? <form onSubmit={submit} className="composer"><div className="modes"><label><input type="radio" name="kind" checked={kind === 'question'} onChange={() => setKind('question')} /> 질문</label><label><input type="radio" name="kind" checked={kind === 'guess'} onChange={() => setKind('guess')} /> 정답 맞히기</label></div><div className="input-row"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={kind === 'guess' ? 100 : 300} placeholder={kind === 'guess' ? '정답을 입력하세요' : '예 / 아니요로 답할 수 있는 질문'} aria-label={kind === 'guess' ? '정답' : '질문'} disabled={busy} required /><button disabled={busy || !text.trim()} type="submit">보내기 →</button></div></form>
            : <div className="composer"><div className="reply-actions">{([['yes', '예'], ['no', '아니요'], ['unknown', '모르겠어요']] as [Reply, string][]).map(([value, label]) => <button type="button" key={value} disabled={busy} onClick={() => void send(`/api/games/${game.id}`, { kind: 'answer', reply: value })}>{label}</button>)}</div></div>
            : <div className="game-end"><p className="result">{game.phase === 'attack' ? game.status === 'won' ? '정답입니다!' : '기회를 모두 사용했습니다.' : game.status === 'won' ? '단어를 지켜냈습니다!' : 'AI가 단어를 맞혔습니다.'}</p>{game.mode === 'both' && game.phase === 'attack' ? <button type="button" disabled={busy} onClick={() => void send(`/api/games/${game.id}`, { kind: 'next' })}>수비 라운드 시작 →</button> : <button type="button" onClick={() => { setGame(null); setStep(0); }}>새 게임 준비 →</button>}</div>}
        </div>
      </div>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    <footer>YES OR NO / {new Date().getFullYear()}</footer>
  </main>;
}