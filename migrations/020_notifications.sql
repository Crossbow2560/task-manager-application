CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'due_reminder',
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  read_at TIMESTAMP,
  UNIQUE (task_id, user_id, kind)
);
