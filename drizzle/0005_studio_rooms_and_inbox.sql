-- Split legacy links used in About into their own records. Transform each
-- snapshot independently: a private draft must never become published here.
INSERT INTO content (id, kind, draft, published, revision, updated_at)
SELECT 'about-' || lower(hex(randomblob(16))), 'link',
  json_set(draft, '$.room', 'about', '$.screen', 'list', '$.legacyLinkId', id),
  CASE WHEN published IS NULL THEN NULL ELSE
    json_set(published, '$.room', 'about', '$.screen', 'list', '$.legacyLinkId', id) END,
  1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM content WHERE kind = 'link' AND json_extract(draft, '$.room') IS NULL
  AND (json_extract(draft, '$.aboutSlot') IN ('left','center','right')
    OR json_extract(published, '$.aboutSlot') IN ('left','center','right'));

UPDATE content SET
  draft = json_set(draft, '$.room', 'contact', '$.aboutSlot', 'off'),
  published = CASE WHEN published IS NULL THEN NULL ELSE
    json_set(published, '$.room', 'contact', '$.aboutSlot', 'off') END,
  revision = revision + 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE kind = 'link' AND json_extract(draft, '$.room') IS NULL;

ALTER TABLE inquiries ADD COLUMN read_at TEXT;
ALTER TABLE inquiries ADD COLUMN replied_at TEXT;
ALTER TABLE inquiries ADD COLUMN archived_at TEXT;
CREATE INDEX idx_inquiries_received ON inquiries (created_at, id);
