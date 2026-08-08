-- Attachments on client messages. The files table already links to requests;
-- this adds the same for messages so a single table holds every attachment
-- with a foreign-key relationship rather than blobs of JSON on the parent row.

ALTER TABLE files
  ADD COLUMN message_id INT NULL,
  ADD CONSTRAINT files_ibfk_message FOREIGN KEY (message_id)
    REFERENCES client_messages(id) ON DELETE CASCADE,
  ADD INDEX idx_files_message (message_id);
