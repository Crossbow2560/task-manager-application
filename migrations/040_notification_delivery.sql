ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMP;
UPDATE notifications SET sent_at = created_at;
