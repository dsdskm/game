CREATE TABLE IF NOT EXISTS players (
  id text PRIMARY KEY,
  nickname text NOT NULL,
  streak integer NOT NULL DEFAULT 0 CHECK (streak >= 0),
  best_streak integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  games_played integer NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  last_daily_charge_date date
);

CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  entry_fee integer NOT NULL CHECK (entry_fee >= 0),
  win_reward integer NOT NULL CHECK (win_reward >= 0),
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL,
  choices jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value text NOT NULL);

CREATE TABLE IF NOT EXISTS plays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES players(id),
  game_id text NOT NULL REFERENCES games(id),
  player_choice text NOT NULL,
  server_choice text NOT NULL,
  won boolean NOT NULL,
  draw boolean NOT NULL,
  entry_fee integer NOT NULL,
  reward integer NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plays_user_id_played_at_idx ON plays(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS plays_game_id_played_at_idx ON plays(game_id, played_at DESC);

INSERT INTO players(id, nickname) VALUES ('demo-user', '행운왕') ON CONFLICT (id) DO NOTHING;
INSERT INTO games(id, name, description, icon, entry_fee, win_reward, enabled, sort_order, choices) VALUES
  ('rock-paper-scissors', '가위바위보', '서버와 한 판 승부해요', '✊', 100, 220, true, 1, '[{"id":"rock","label":"바위","icon":"✊"},{"id":"paper","label":"보","icon":"✋"},{"id":"scissors","label":"가위","icon":"✌️"}]'),
  ('odd-even', '홀짝', '숨겨진 결과의 홀짝을 맞혀요', '🎱', 80, 170, true, 2, '[{"id":"odd","label":"홀","icon":"1"},{"id":"even","label":"짝","icon":"2"}]')
ON CONFLICT (id) DO NOTHING;
INSERT INTO settings(key, value) VALUES ('dailyChargeAmount', '1000'), ('dailyChargeHour', '0') ON CONFLICT (key) DO NOTHING;