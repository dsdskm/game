import { useState } from "react";
import { Activity, Coins, Gamepad2, LayoutDashboard, LogOut, RefreshCw, Save, Settings, Users } from "lucide-react";
import "./App.css";

type View = "dashboard" | "games" | "players" | "plays";
interface Dashboard { users: number; totalPlays: number; todayPlays: number; pointsInCirculation: number }
interface SettingsData { dailyChargeAmount: number; dailyChargeHour: number }
interface Game { id: string; name: string; description: string; icon: string; entryFee: number; winReward: number; enabled: boolean }
interface Player { id: string; nickname: string; streak: number; bestStreak: number; points: number; gamesPlayed: number }
interface Play { id: number; nickname: string; gameId: string; playerChoice: string; serverChoice: string; won: boolean; draw: boolean; entryFee: number; reward: number; playedAt: string }

async function request<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", "x-admin-key": key, ...init?.headers } });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : "요청을 처리하지 못했습니다.";
    throw new Error(message);
  }
  return body as T;
}

function App() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [message, setMessage] = useState("");

  const load = async (key = adminKey) => {
    try {
      const [summary, gameData, playerData, playData] = await Promise.all([
        request<{ dashboard: Dashboard; settings: SettingsData }>("/api/admin/dashboard", key),
        request<{ games: Game[] }>("/api/admin/games", key),
        request<{ players: Player[] }>("/api/admin/players", key),
        request<{ plays: Play[] }>("/api/admin/plays", key),
      ]);
      setDashboard(summary.dashboard); setSettings(summary.settings); setGames(gameData.games); setPlayers(playerData.players); setPlays(playData.plays); setMessage("");
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다."); return false; }
  };

  const login = async () => { if (await load(keyInput)) setAdminKey(keyInput); };
  const logout = () => { setAdminKey(""); setKeyInput(""); };

  const saveSettings = async () => {
    if (!settings) return;
    try { const result = await request<{ settings: SettingsData }>("/api/admin/settings", adminKey, { method: "PATCH", body: JSON.stringify(settings) }); setSettings(result.settings); setMessage("일일 충전 설정을 저장했습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
  };

  const saveGame = async (game: Game) => {
    try { const result = await request<{ game: Game }>(`/api/admin/games/${game.id}`, adminKey, { method: "PATCH", body: JSON.stringify({ entryFee: game.entryFee, winReward: game.winReward, enabled: game.enabled }) }); setGames((items) => items.map((item) => item.id === game.id ? result.game : item)); setMessage(`${game.name} 설정을 저장했습니다.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
  };

  const adjustPoints = async (player: Player) => {
    const value = prompt(`${player.nickname} 사용자에게 조정할 포인트를 입력하세요. 차감은 음수로 입력합니다.`, "100");
    if (value === null || !Number.isInteger(Number(value))) return;
    try { const result = await request<{ player: Player }>(`/api/admin/players/${player.id}/points`, adminKey, { method: "PATCH", body: JSON.stringify({ amount: Number(value) }) }); setPlayers((items) => items.map((item) => item.id === player.id ? result.player : item)); setMessage("포인트를 조정했습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "조정하지 못했습니다."); }
  };

  if (!adminKey) return <main className="login-page"><form onSubmit={(event) => { event.preventDefault(); void login(); }}><div className="admin-mark">LK</div><h1>LuckKing Admin</h1><p>운영자 API 키로 로그인하세요.</p>{message && <div className="login-error">{message}</div>}<label>관리자 API 키<input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} autoFocus /></label><button type="submit" disabled={!keyInput}>로그인</button></form></main>;

  const nav = [
    { id: "dashboard" as const, label: "대시보드", icon: LayoutDashboard },
    { id: "games" as const, label: "게임 관리", icon: Gamepad2 },
    { id: "players" as const, label: "사용자", icon: Users },
    { id: "plays" as const, label: "플레이 기록", icon: Activity },
  ];

  return <div className="admin-shell"><aside><div className="wordmark"><span>LK</span><b>LuckKing</b><small>ADMIN</small></div><nav>{nav.map((item) => <button className={view === item.id ? "active" : ""} key={item.id} onClick={() => setView(item.id)}><item.icon size={18} />{item.label}</button>)}</nav><button className="logout" onClick={logout}><LogOut size={17} />로그아웃</button></aside><main><header><div><p>Operations</p><h1>{nav.find((item) => item.id === view)?.label}</h1></div><button className="icon-action" title="새로고침" onClick={() => void load()}><RefreshCw size={18} /></button></header>{message && <button className="notice" onClick={() => setMessage("")}>{message}</button>}
    {view === "dashboard" && dashboard && settings && <><section className="metrics"><Metric icon={<Users />} label="전체 사용자" value={dashboard.users.toLocaleString()} /><Metric icon={<Activity />} label="오늘 플레이" value={dashboard.todayPlays.toLocaleString()} /><Metric icon={<Gamepad2 />} label="누적 플레이" value={dashboard.totalPlays.toLocaleString()} /><Metric icon={<Coins />} label="유통 포인트" value={`${dashboard.pointsInCirculation.toLocaleString()}P`} /></section><section className="panel settings-panel"><div className="panel-title"><div><Settings size={20} /><span><b>일일 자동 충전</b><small>사용자 접속 시 날짜 기준으로 한 번만 충전됩니다.</small></span></div><button className="save" onClick={() => void saveSettings()}><Save size={16} />저장</button></div><div className="form-grid"><label>일일 충전 포인트<input type="number" min="0" value={settings.dailyChargeAmount} onChange={(event) => setSettings({ ...settings, dailyChargeAmount: Number(event.target.value) })} /></label><label>충전 기준 시각<select value={settings.dailyChargeHour} onChange={(event) => setSettings({ ...settings, dailyChargeHour: Number(event.target.value) })}>{Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label></div></section></>}
    {view === "games" && <section className="game-admin-grid">{games.map((game) => <article className="panel game-admin" key={game.id}><div className="game-heading"><i>{game.icon}</i><span><h2>{game.name}</h2><p>{game.description}</p></span><label className="toggle"><input type="checkbox" checked={game.enabled} onChange={(event) => setGames((items) => items.map((item) => item.id === game.id ? { ...item, enabled: event.target.checked } : item))} /><span /></label></div><div className="form-grid"><label>참가비<input type="number" min="0" value={game.entryFee} onChange={(event) => setGames((items) => items.map((item) => item.id === game.id ? { ...item, entryFee: Number(event.target.value) } : item))} /></label><label>승리 보상<input type="number" min="0" value={game.winReward} onChange={(event) => setGames((items) => items.map((item) => item.id === game.id ? { ...item, winReward: Number(event.target.value) } : item))} /></label></div><button className="save full" onClick={() => void saveGame(game)}><Save size={16} />게임 설정 저장</button></article>)}</section>}
    {view === "players" && <DataTable headers={["사용자", "포인트", "현재/최고 연승", "플레이", "관리"]}>{players.map((player) => <tr key={player.id}><td><b>{player.nickname}</b><small>{player.id}</small></td><td>{player.points.toLocaleString()}P</td><td>{player.streak} / {player.bestStreak}</td><td>{player.gamesPlayed.toLocaleString()}회</td><td><button className="table-action" onClick={() => void adjustPoints(player)}>포인트 조정</button></td></tr>)}</DataTable>}
    {view === "plays" && <DataTable headers={["일시", "사용자", "게임", "선택", "결과", "포인트"]}>{plays.map((play) => <tr key={play.id}><td>{new Date(play.playedAt).toLocaleString("ko-KR")}</td><td>{play.nickname}</td><td>{play.gameId}</td><td>{play.playerChoice} / {play.serverChoice}</td><td><span className={`result-badge ${play.draw ? "draw" : play.won ? "won" : "lost"}`}>{play.draw ? "무승부" : play.won ? "승리" : "패배"}</span></td><td>-{play.entryFee} / +{play.reward}</td></tr>)}</DataTable>}
  </main></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <article><span>{icon}</span><div><small>{label}</small><b>{value}</b></div></article>; }
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <section className="panel table-panel"><div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>; }
export default App;