-- Content-only upgrade: preserve all owner text and unpublished state.
UPDATE content SET
  draft = json_insert(draft,
    '$.previousPageLabel', 'Previous page',
    '$.nextPageLabel', 'Next page',
    '$.closeReaderLabel', 'Return to room'),
  published = CASE WHEN published IS NULL THEN NULL ELSE json_insert(published,
    '$.previousPageLabel', 'Previous page',
    '$.nextPageLabel', 'Next page',
    '$.closeReaderLabel', 'Return to room') END,
  revision = revision + 1
WHERE kind = 'site' AND (
  json_type(draft, '$.previousPageLabel') IS NULL OR
  json_type(draft, '$.nextPageLabel') IS NULL OR
  json_type(draft, '$.closeReaderLabel') IS NULL
);
