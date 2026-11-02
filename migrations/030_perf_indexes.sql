-- NFR-01 / NFR-04: indexes for the hot read paths (dashboard, project task lists, membership checks).
CREATE INDEX idx_tasks_project_id ON tasks (project_id);
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX idx_project_members_user ON project_members (user_id);
CREATE INDEX idx_task_assignees_user ON task_assignees (user_id);
CREATE INDEX idx_comments_task ON comments (task_id);
