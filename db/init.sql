-- Drop existing tables if they exist
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS slimes;
DROP TABLE IF EXISTS auth_audit_logs;
DROP TABLE IF EXISTS auth_login_guards;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
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
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_auth_audit_logs_email_created_at ON auth_audit_logs(email, created_at DESC);
CREATE INDEX idx_auth_audit_logs_event_type_created_at ON auth_audit_logs(event_type, created_at DESC);

-- Insert some sample achievements
INSERT INTO achievements (name, description, badge_icon, experience_reward) VALUES
('First Steps', 'Complete your first task', '🎯', 50),
('Focus Master', 'Complete a 25-minute focus session', '⏱️', 75),
('Week Warrior', 'Complete tasks for 7 days in a row', '🔥', 200),
('Slime Evolution', 'Evolve your slime to level 5', '⭐', 150);

-- Success message
SELECT 'Database initialized successfully! 🎉' as message;
