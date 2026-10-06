ALTER TABLE attachments
    ADD COLUMN comment_id BIGINT;

ALTER TABLE attachments
    ADD CONSTRAINT fk_attachments_comment
    FOREIGN KEY (comment_id)
    REFERENCES comments(comment_id);

CREATE INDEX idx_attachments_comment_id ON attachments(comment_id);
