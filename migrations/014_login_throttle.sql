CREATE TABLE login_throttle (
  email TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP,
  locked_until TIMESTAMP
);
