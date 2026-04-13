-- Drop existing tables if they exist
DROP TABLE IF EXISTS focus_sessions;
DROP TABLE IF EXISTS user_study_daily;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS slimes;
DROP TABLE IF EXISTS user_study_stats;
DROP TABLE IF EXISTS slime_xp_events;
DROP TABLE IF EXISTS auth_audit_logs;
DROP TABLE IF EXISTS auth_login_guards;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slimes table (one per user)
CREATE TABLE slimes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'My Slime',
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  color VARCHAR(50) DEFAULT 'green',
  evolution_stage INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User study stats (HP/streak authority)
CREATE TABLE user_study_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  day_streak INTEGER NOT NULL DEFAULT 0,
  last_studied_on_local DATE NULL,
  last_level_penalty_on_local DATE NULL,
  current_hp INTEGER NULL,
  last_hp_settled_on_local DATE NULL,
  current_goal_minutes INTEGER NOT NULL DEFAULT 180,
  study_style VARCHAR(32) NOT NULL DEFAULT 'balanced',
  preferred_session_intensity INTEGER NOT NULL DEFAULT 3,
  distraction_level VARCHAR(16) NOT NULL DEFAULT 'medium',
  timezone_iana VARCHAR(64) NOT NULL DEFAULT 'UTC',
  hp_delta_carry DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Raw focus session log
CREATE TABLE focus_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  completed_at_utc TIMESTAMP NOT NULL,
  timezone_iana VARCHAR(64) NOT NULL DEFAULT 'UTC',
  local_day_key DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Daily study aggregate
CREATE TABLE user_study_daily (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_day DATE NOT NULL,
  focused_minutes INTEGER NOT NULL DEFAULT 0,
  goal_minutes INTEGER NOT NULL DEFAULT 180,
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, local_day)
);

-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  deadline TIMESTAMP,
  completed_at TIMESTAMP,
  experience_reward INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements table
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_icon VARCHAR(255),
  experience_reward INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (many-to-many)
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

-- Auth login guard table (rate limiting + temporary lockouts)
CREATE TABLE auth_login_guards (
  email VARCHAR(255) PRIMARY KEY,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auth audit events table
CREATE TABLE auth_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  details TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_slimes_user_id ON slimes(user_id);
CREATE INDEX idx_user_study_stats_last_studied_local ON user_study_stats(last_studied_on_local);
CREATE INDEX idx_focus_sessions_user_day ON focus_sessions(user_id, local_day_key);
CREATE INDEX idx_focus_sessions_user_completed ON focus_sessions(user_id, completed_at_utc DESC);
CREATE INDEX idx_user_study_daily_user_day ON user_study_daily(user_id, local_day);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_auth_audit_logs_email_created_at ON auth_audit_logs(email, created_at DESC);
CREATE INDEX idx_auth_audit_logs_event_type_created_at ON auth_audit_logs(event_type, created_at DESC);

-- Insert sample achievements
INSERT INTO achievements (name, description, badge_icon, experience_reward) VALUES
('First Steps', 'Complete your first task', 'target', 50),
('Focus Master', 'Complete a 25-minute focus session', 'timer', 75),
('Week Warrior', 'Complete tasks for 7 days in a row', 'streak', 200),
('Slime Evolution', 'Evolve your slime to level 5', 'star', 150);

-- Success message
SELECT 'Database initialized successfully!' as message;
