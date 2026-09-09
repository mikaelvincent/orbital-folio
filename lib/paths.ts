export function pathFor(path: string, site: Record<string, any>) {
  // Preserve existing links and persisted section IDs, with one public URL.
  if (!site._preview)
    path = path.replace(/^\/experience(?=$|[?#])/, '/case-studies');
  if (
    !site._preview ||
    !path.startsWith('/') ||
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('//')
  )
    return path;
  const [pathname, hash] = path.split('#');
  const parts = pathname.split('/').filter(Boolean);
  if (!parts.length) return '/admin/preview?section=home';
  return (
    '/admin/preview?section=' +
    encodeURIComponent(parts[0] === 'case-studies' ? 'experience' : parts[0]) +
    (parts[1] ? '&slug=' + encodeURIComponent(parts[1]) : '') +
    (hash ? '#' + hash : '')
  );
}
