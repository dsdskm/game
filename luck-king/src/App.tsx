import { useEffect, useState } from "react";
import { luckKingApi, type Bootstrap, type GameConfig, type PlayResult } from "./api";
import "./App.css";

type Screen = "home" | "games" | "play" | "result" | "ranking" | "profile";

function App() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [game, setGame] = useState<GameConfig | null>(null);
  const [choice, setChoice] = useState("");
  const [result, setResult] = useState<PlayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { setData(await luckKingApi.bootstrap()); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "서비스 정보를 불러오지 못했어요."); }
  };

  useEffect(() => { void load(); }, []);

  const selectGame = (selected: GameConfig) => {
    setGame(selected);
    setChoice("");
    setResult(null);
    setScreen("play");
  };

  const play = async () => {
    if (!game || !choice || busy) return;
    setBusy(true);
    try {
      const next = await luckKingApi.play(game.id, choice);
      setResult(next);
      setData((current) => current ? { ...current, player: next.player } : current);
      setScreen("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "게임을 진행하지 못했어요.");
    } finally { setBusy(false); }
  };

  if (!data) return <main className="phone"><div className="load-state"><strong>LuckKing</strong><p>{error || "게임 정보를 불러오는 중..."}</p>{error && <button className="primary" onClick={() => void load()}>다시 시도</button>}</div></main>;

  return <main className="phone">
    <div className="status"><b>9:41</b><span>● ◒ ▰</span></div>
    {screen === "home" && <Home data={data} onGames={() => setScreen("games")} />}
    {screen === "games" && <Games games={data.games} points={data.player.points} onSelect={selectGame} onBack={() => setScreen("home")} />}
    {screen === "play" && game && <GamePlay game={game} points={data.player.points} choice={choice} busy={busy} onChoice={setChoice} onPlay={play} onBack={() => setScreen("games")} />}
    {screen === "result" && game && result && <Result game={game} result={result} onAgain={() => selectGame(game)} onGames={() => setScreen("games")} />}
    {screen === "ranking" && <Ranking data={data} />}
    {screen === "profile" && <Profile data={data} />}
    {(["home", "games", "ranking", "profile"] as Screen[]).includes(screen) && <BottomNav active={screen} onSelect={setScreen} />}
    {error && <button className="toast" type="button" onClick={() => setError("")}>{error}</button>}
  </main>;
}

function Home({ data, onGames }: { data: Bootstrap; onGames: () => void }) {
  return <section className="screen home"><header className="top"><strong className="brand">👑 <span>LuckKing</span></strong><span className="point-pill">🪙 {data.player.points.toLocaleString()}P</span></header><div className="headline"><p>오늘,</p><h1>어떤 운을 시험할까요?</h1></div><div className="crown-stage"><i>✦</i><div className="crown">👑</div><i>✦</i><div className="podium" /></div><div className="summary"><span>🔥 <b>{data.player.streak}연승</b></span><em /><span>🎮 <b>{data.games.length}개 게임</b></span></div><button className="primary" type="button" onClick={onGames}>게임 선택하기</button><small className="hint">매일 {data.settings.dailyChargeAmount.toLocaleString()}P 자동 충전</small></section>;
}

function Games({ games, points, onSelect, onBack }: { games: GameConfig[]; points: number; onSelect: (game: GameConfig) => void; onBack: () => void }) {
  return <section className="screen list-page"><TopBar title="게임 선택" onBack={onBack} /><div className="balance-banner"><span>내 포인트</span><b>{points.toLocaleString()}P</b></div><div className="game-catalog">{games.map((game) => <button key={game.id} type="button" disabled={points < game.entryFee} onClick={() => onSelect(game)}><i>{game.icon}</i><span><b>{game.name}</b><small>{game.description}</small><em>참가비 {game.entryFee.toLocaleString()}P · 승리 {game.winReward.toLocaleString()}P</em></span><strong>{points < game.entryFee ? "포인트 부족" : "선택"}</strong></button>)}</div></section>;
}

function GamePlay({ game, points, choice, busy, onChoice, onPlay, onBack }: { game: GameConfig; points: number; choice: string; busy: boolean; onChoice: (choice: string) => void; onPlay: () => void; onBack: () => void }) {
  return <section className="screen game"><TopBar title={game.name} onBack={onBack} /><div className="game-title"><small>참가비 {game.entryFee.toLocaleString()}P</small><h1>{game.description}</h1><p>보유 {points.toLocaleString()}P</p></div><div className={`game-symbol ${busy ? "rolling" : ""}`}>{game.icon}</div><div className={`choices choice-${game.choices.length}`}>{game.choices.map((item) => <button key={item.id} className={choice === item.id ? "active" : ""} type="button" onClick={() => onChoice(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</div><button className="primary" type="button" disabled={!choice || busy || points < game.entryFee} onClick={onPlay}>{busy ? "결과 확인 중..." : `${game.entryFee.toLocaleString()}P로 도전`}</button></section>;
}

function Result({ game, result, onAgain, onGames }: { game: GameConfig; result: PlayResult; onAgain: () => void; onGames: () => void }) {
  const choice = (id: string) => game.choices.find((item) => item.id === id);
  const title = result.draw ? "무승부예요" : result.won ? "승리했어요!" : "아쉽네요";
  return <section className={`screen result ${result.won ? "win" : "lose"}`}><TopBar title={game.name} onBack={onGames} close /><div className="result-main"><div className="versus"><span>{choice(result.playerChoice)?.icon}<small>나</small></span><b>VS</b><span>{choice(result.serverChoice)?.icon}<small>상대</small></span></div><h1>{title}</h1><p>{result.draw ? "참가비를 돌려받았어요" : result.won ? `보상 ${result.reward.toLocaleString()}P를 받았어요` : `참가비 ${result.entryFee.toLocaleString()}P가 차감됐어요`}</p><div className="reward">🪙 <span><small>현재 포인트</small><b>{result.player.points.toLocaleString()}P</b></span></div></div><div className="result-actions"><button className="primary" type="button" onClick={onAgain}>다시 도전</button><button className="secondary" type="button" onClick={onGames}>다른 게임 선택</button></div></section>;
}

function Ranking({ data }: { data: Bootstrap }) {
  return <section className="screen list-page"><PageTitle title="랭킹" description="서버에 기록된 연승 순위" /><div className="list ranking-list">{data.rankings.map((item) => <div className="rank-row" key={item.id}><b className={`rank n${item.rank}`}>{item.rank}</b><span className="avatar">{item.id === data.player.id ? "👑" : "🙂"}</span><span>{item.nickname}</span><strong>{item.streak}연승</strong></div>)}</div></section>;
}

function Profile({ data }: { data: Bootstrap }) {
  const player = data.player;
  return <section className="screen list-page"><PageTitle title="마이" description="서버에 저장된 나의 기록" /><div className="profile-card"><i>👑</i><span><h2>{player.nickname}</h2><p>매일 포인트로 행운을 시험해 보세요</p></span></div><div className="stats"><div><small>현재 연승</small><b>{player.streak}회</b></div><div><small>최고 연승</small><b>{player.bestStreak}회</b></div><div><small>보유 포인트</small><b>{player.points.toLocaleString()}P</b></div><div><small>플레이 횟수</small><b>{player.gamesPlayed}회</b></div></div><div className="daily-info">매일 {data.settings.dailyChargeHour}시 · {data.settings.dailyChargeAmount.toLocaleString()}P 자동 충전</div></section>;
}

function TopBar({ title, onBack, close = false }: { title: string; onBack: () => void; close?: boolean }) { return <header className="top game-top"><button className="round plain" type="button" onClick={onBack}>{close ? "" : "‹"}</button><b>{title}</b><button className="round plain" type="button" onClick={onBack}>{close ? "×" : ""}</button></header>; }
function PageTitle({ title, description }: { title: string; description: string }) { return <header className="page-title"><h1>{title}</h1><p>{description}</p></header>; }
function BottomNav({ active, onSelect }: { active: Screen; onSelect: (screen: Screen) => void }) { return <nav className="bottom-nav"><button className={active === "home" ? "active" : ""} onClick={() => onSelect("home")}><b>⌂</b><small>홈</small></button><button className={active === "games" ? "active" : ""} onClick={() => onSelect("games")}><b>🎮</b><small>게임</small></button><button className={active === "ranking" ? "active" : ""} onClick={() => onSelect("ranking")}><b>♛</b><small>랭킹</small></button><button className={active === "profile" ? "active" : ""} onClick={() => onSelect("profile")}><b>●</b><small>마이</small></button></nav>; }

export default App;