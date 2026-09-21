export function pathFor(path: string, site: Record<string, any>) {
  // Preserve existing links and persisted section IDs, with one public URL.
  if (!site._preview)
    path = path.replace(/^\/experience(?=$|[/?#])/, '/case-studies');
  if (
    !site._preview ||
    !path.startsWith('/') ||
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('//')
  )
    return path;
  const [location, hash] = path.split('#');
  const [pathname, query = ''] = location.split('?');
  const parts = pathname.split('/').filter(Boolean);
  const search = new URLSearchParams(query);
  search.set(
    'section',
    !parts.length
      ? 'home'
      : parts[0] === 'case-studies'
        ? 'experience'
        : parts[0],
  );
  if (parts[1]) search.set('slug', parts[1]);
  return '/admin/preview?' + search.toString() + (hash ? '#' + hash : '');
}
