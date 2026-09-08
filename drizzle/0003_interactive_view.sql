-- Rename only the previous untouched default. Owners' custom labels and drafts remain intact.
UPDATE content SET
  draft = CASE WHEN json_extract(draft, '$.sceneLabel') = 'Ship view'
    THEN json_set(draft, '$.sceneLabel', 'Interactive view') ELSE draft END,
  published = CASE WHEN published IS NOT NULL AND json_extract(published, '$.sceneLabel') = 'Ship view'
    THEN json_set(published, '$.sceneLabel', 'Interactive view') ELSE published END,
  revision = revision + 1
WHERE kind = 'site' AND (
  json_extract(draft, '$.sceneLabel') = 'Ship view' OR
  json_extract(published, '$.sceneLabel') = 'Ship view'
);
