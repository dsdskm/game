'use client';

import { useState, type FormEvent } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error(response.status === 503 ? '관리자 인증 설정이 필요합니다.' : '비밀번호를 확인해 주세요.');
      location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '로그인에 실패했습니다.');
      setBusy(false);
    }
  }

  return <main className="dashboard">
    <header className="topbar"><div className="brand">Y / N <span>Admin</span></div></header>
    <section className="login-panel"><LockKeyhole size={26} aria-hidden="true" /><p className="eyebrow">YES OR NO / ADMIN</p><h1>관리자 로그인</h1>
      <form onSubmit={submit}><label htmlFor="admin-password">비밀번호</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button className="primary" disabled={busy} type="submit"><LogIn size={18} aria-hidden="true" />로그인</button></form>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  </main>;
}