CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  email text UNIQUE,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id),
  game_mode text NOT NULL,
  status text NOT NULL,
  rules_version text NOT NULL,
  random_seed text NOT NULL,
  current_turn integer NOT NULL,
  active_player_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS game_sessions_owner_idx ON game_sessions(owner_id);

CREATE TABLE IF NOT EXISTS game_players (
  id text PRIMARY KEY,
  game_session_id text NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id text,
  display_name text NOT NULL,
  avatar_id text NOT NULL,
  turn_order integer NOT NULL,
  current_board_position integer NOT NULL,
  is_active boolean NOT NULL,
  final_score integer
);
CREATE INDEX IF NOT EXISTS game_players_session_idx ON game_players(game_session_id);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id text PRIMARY KEY,
  game_player_id text NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  account_type text NOT NULL,
  account_name text NOT NULL,
  balance_cents integer NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  game_session_id text NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  game_player_id text NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text NOT NULL,
  turn_number integer NOT NULL,
  idempotency_key text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_idx ON transactions(game_session_id, idempotency_key);

CREATE TABLE IF NOT EXISTS assets (
  id text PRIMARY KEY,
  game_player_id text NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  name text NOT NULL,
  purchase_price_cents integer NOT NULL,
  current_value_cents integer NOT NULL,
  recurring_income_cents integer NOT NULL,
  recurring_expense_cents integer NOT NULL,
  financing_balance_cents integer NOT NULL DEFAULT 0,
  ownership_bps integer NOT NULL,
  risk_category text NOT NULL,
  acquired_at_turn integer NOT NULL,
  metadata jsonb
);

CREATE TABLE IF NOT EXISTS liabilities (
  id text PRIMARY KEY,
  game_player_id text NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  liability_type text NOT NULL,
  name text NOT NULL,
  principal_balance_cents integer NOT NULL,
  interest_rate_bps integer NOT NULL,
  monthly_payment_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_spaces (
  id text PRIMARY KEY,
  board_version text NOT NULL,
  position integer NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  visual_config jsonb NOT NULL,
  event_config jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS board_spaces_version_position_idx ON board_spaces(board_version, position);

CREATE TABLE IF NOT EXISTS event_cards (
  id text PRIMARY KEY,
  deck_version text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  effect_config jsonb NOT NULL,
  eligibility_config jsonb NOT NULL,
  educational_explanation text NOT NULL
);

CREATE TABLE IF NOT EXISTS game_events (
  id text PRIMARY KEY,
  game_session_id text NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  game_player_id text NOT NULL,
  event_card_id text,
  event_type text NOT NULL,
  turn_number integer NOT NULL,
  event_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_snapshots (
  id text PRIMARY KEY,
  game_session_id text NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  turn_number integer NOT NULL,
  state_version text NOT NULL,
  state_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_rooms (
  id text PRIMARY KEY,
  game_session_id text,
  room_code text NOT NULL UNIQUE,
  host_player_id text NOT NULL,
  visibility text NOT NULL,
  status text NOT NULL,
  max_players integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  objective_config jsonb NOT NULL,
  difficulty text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
