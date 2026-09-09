-- Rename only the original labels, preserving owner-customized text and drafts.
UPDATE content SET
  draft = json_set(draft, '$.experienceLabel', 'Case studies'),
  revision = revision + 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'site' AND json_extract(draft, '$.experienceLabel') = 'Experience';
UPDATE content SET
  published = json_set(published, '$.experienceLabel', 'Case studies'),
  revision = revision + 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'site' AND json_extract(published, '$.experienceLabel') = 'Experience';
UPDATE content SET revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), draft = json_set(draft, '$.experienceHeading', 'The case study rack')
WHERE id = 'site' AND json_extract(draft, '$.experienceHeading') = 'The mission log';
UPDATE content SET revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), published = json_set(published, '$.experienceHeading', 'The case study rack')
WHERE id = 'site' AND json_extract(published, '$.experienceHeading') = 'The mission log';
UPDATE content SET revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), draft = json_set(draft, '$.experienceRoom', 'CASE STUDIES')
WHERE id = 'site' AND json_extract(draft, '$.experienceRoom') = 'MISSION CONTROL';
UPDATE content SET revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), published = json_set(published, '$.experienceRoom', 'CASE STUDIES')
WHERE id = 'site' AND json_extract(published, '$.experienceRoom') = 'MISSION CONTROL';
