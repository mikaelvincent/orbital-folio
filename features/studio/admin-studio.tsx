'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Orbit,
  ArrowUpRight,
  Plus,
  Save,
  Eye,
  Upload,
  Download,
  LogOut,
  Trash2,
  Check,
  Shield,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { names, templates, StudioContentFields } from './studio-content-fields';
import { StudioInbox } from './studio-inbox';
import { StudioAccess } from './studio-access';
import { useStudioModelTools } from './studio-model-tools';
import { socialLinkDraft } from '@/lib/content/social-links';
import type { Content, Kind } from '@/lib/content/types';
import { ProjectEditor } from './project-editor';
import {
  projectEditorDraft,
  projectUploadError,
} from './project-editor-helpers';
export { SetupForm } from './studio-setup-form';

export function AdminStudio({
  initialRecords,
  inquiries,
  admins,
  audit,
  email,
}: {
  initialRecords: Content[];
  inquiries: any[];
  admins: any[];
  audit: any[];
  email: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [kind, setKind] = useState<Kind>('site');
  const [selected, setSelected] = useState('site');
  const [editorReset, setEditorReset] = useState(0);
  const [data, setData] = useState<Record<string, any>>(
    initialRecords.find((r) => r.id === 'site')!.draft,
  );
  const [tab, setTab] = useState('content');
  const [siteGroup, setSiteGroup] = useState('profile');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{
    action: string;
    id: string;
    revision?: number;
  } | null>(null);
  const [inbox, setInbox] = useState(inquiries);
  const [members, setMembers] = useState(admins);
  const [search, setSearch] = useState('');
  const [moreInbox, setMoreInbox] = useState(inquiries.length === 100);
  const current = records.find((r) => r.id === selected);
  const storyNoun =
    kind === 'journal'
      ? 'chapter'
      : kind === 'experience'
        ? 'case study'
        : kind === 'site'
          ? 'identity'
          : kind === 'link'
            ? 'social link'
            : 'project';
  const dirty =
    JSON.stringify(data) !== JSON.stringify(current?.draft ?? templates[kind]);
  const visible = records
    .filter((r) => r.kind === kind)
    .sort((a, b) => (a.draft.order || 0) - (b.draft.order || 0));
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const canLeave = () => {
    if (busy) return false;
    if (!dirty) return true;
    setError('Save or discard your unsaved edits before changing records.');
    return false;
  };
  const choose = (id: string) => {
    if (!canLeave()) return;
    const r = records.find((r) => r.id === id);
    if (r) {
      setKind(r.kind);
      setSelected(id);
      setData({ ...r.draft });
      setMessage('');
      setError('');
    }
  };
  const act = useCallback(
    async (payload: any) => {
      setBusy(true);
      setMessage('');
      setError('');
      try {
        const r = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const b: any = await r.json();
        if (!r.ok) throw new Error(b.error);
        setRecords(b.records);
        if (payload.action === 'save') {
          setSelected(b.id);
          setData(b.records.find((r: Content) => r.id === b.id).draft);
        }
        if (payload.action === 'delete') {
          const next = b.records.find((r: Content) => r.kind === kind);
          if (next) {
            setSelected(next.id);
            setData(next.draft);
          } else {
            setSelected('new');
            setData({ ...templates[kind] });
          }
        }
        if (payload.action === 'inquiryDelete')
          setInbox(inbox.filter((i) => i.id !== payload.id));
        if (payload.action === 'import') {
          const r = b.records.find((r: Content) => r.id === selected);
          if (r) setData(r.draft);
        }
        setMessage(
          payload.action === 'save'
            ? 'Draft saved. The published version is unchanged.'
            : payload.action === 'publish'
              ? 'Published. The public portfolio now shows this version.'
              : payload.action === 'unpublish'
                ? 'Unpublished. This record is now private.'
                : payload.action === 'import'
                  ? 'Imported as drafts. Review and publish each record when ready.'
                  : 'Changes saved.',
        );
        return b;
      } catch (e: any) {
        setError(e.message);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [inbox, kind, selected],
  );
  useStudioModelTools({ records, act, setKind, setSelected });
  const uploadProjectMedia = async (file: File, alt: string) => {
    const invalid = projectUploadError(file);
    if (invalid) {
      setError(invalid);
      return null;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.set('file', file);
      body.set('alt', alt);
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body,
      });
      const result = (await response.json()) as any;
      if (!response.ok)
        throw new Error(
          result.error ||
            `Media upload failed. Your ${storyNoun} draft is unchanged.`,
        );
      const refreshed = await fetch('/api/admin');
      const all = (await refreshed.json()) as any;
      if (!refreshed.ok)
        throw new Error(
          `Media was uploaded, but the library could not refresh. Save your ${storyNoun} and reload the studio before uploading again.`,
        );
      setRecords(all.records);
      const uploaded = all.records.find((r: Content) => r.id === result.id);
      return result.media || { ...uploaded.draft, id: result.id };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Media upload failed.');
      return null;
    } finally {
      setBusy(false);
    }
  };
  const publishProjectAssets = async (assets: Content[]) => {
    setBusy(true);
    setError('');
    setMessage('');
    let published = 0;
    try {
      for (const asset of assets) {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'publish',
            id: asset.id,
            revision: asset.revision,
          }),
        });
        const result = (await response.json()) as any;
        if (!response.ok)
          throw new Error(result.error || 'Media publication failed.');
        setRecords(result.records);
        published++;
      }
      setMessage(
        `Referenced media is public. Your ${storyNoun} draft and unsaved edits are unchanged; publish the ${storyNoun} separately when ready.`,
      );
    } catch (error) {
      setError(
        `${error instanceof Error ? error.message : 'Media publication failed.'}${published ? ` ${published} media item${published === 1 ? ' is' : 's are'} already public.` : ''} Your ${storyNoun} edits are preserved.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const importProject = async (file: File) => {
    if (!canLeave()) return;
    if (!file.size || file.size > 16 * 1024 * 1024) {
      setError('Choose a nonempty project ZIP up to 16 MiB.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/admin/projects/import', {
        method: 'POST',
        body,
      });
      const result = (await response.json()) as any;
      if (!response.ok)
        throw new Error(result.error || 'Project import failed.');
      const imported = result.records.find((r: Content) => r.id === result.id);
      setRecords(result.records);
      setKind('project');
      setSelected(result.id);
      setData(imported.draft);
      setMessage(
        'Project and media imported as private drafts. Review the story, then publish its media and project separately.',
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Project import failed.',
      );
    } finally {
      setBusy(false);
    }
  };
  const preview =
    kind === 'project'
      ? '/admin/preview?section=projects&id=' + selected
      : kind === 'experience'
        ? '/admin/preview?section=experience&id=' + selected
        : '/admin/preview?section=' +
          ({
            site: 'home',
            journal: 'about',
            link: 'contact',
            media: 'projects',
          }[kind] || 'home');
  return (
    <div className="studio">
      <header className="studio-header">
        <a className="studio-brand" href="/">
          <Orbit size={25} />
          <span>
            Orbital <strong>Studio</strong>
          </span>
        </a>
        <div>
          <span>{email}</span>
          <a href="/" target="_blank" rel="noopener">
            View portfolio
            <ArrowUpRight size={15} />
          </a>
          <a href="/signout-with-chatgpt?return_to=/admin">
            <LogOut size={15} />
            Sign out
          </a>
        </div>
      </header>
      <main id="main" className="studio-main">
        <div className="studio-title">
          <div>
            <p className="eyebrow">YOUR CONTENT, YOUR SPACECRAFT</p>
            <h1>Content studio</h1>
            <p>Edit privately. Preview the result. Publish when it’s ready.</p>
          </div>
          <a className="button" href="/api/admin/export">
            <Download size={16} />
            Export content
          </a>
        </div>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(String(v))}
          className="studio-tabs"
        >
          <TabsList className="studio-tab-list">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="inbox">Inbox · {inbox.length}</TabsTrigger>
            <TabsTrigger value="settings">Access & portability</TabsTrigger>
          </TabsList>
          <div className="studio-feedback" aria-live="polite">
            {message && (
              <p className="studio-success">
                <Check size={16} />
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
          <TabsContent value="content">
            <div className="studio-workspace">
              <aside className="studio-sidebar">
                <label className="studio-field">
                  Collection
                  <NativeSelect
                    value={kind}
                    onChange={(e) => {
                      if (!canLeave()) return;
                      const k = e.target.value as Kind;
                      setKind(k);
                      const first = records.find((r) => r.kind === k);
                      if (first) choose(first.id);
                      else {
                        setSelected('new');
                        setData({ ...templates[k] });
                      }
                      setSearch('');
                    }}
                  >
                    {Object.entries(names).map(([k, n]) => (
                      <NativeSelectOption value={k} key={k}>
                        {n}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </label>
                <div className="record-list">
                  {visible.map((r) => (
                    <button
                      key={r.id}
                      className={selected === r.id ? 'active' : ''}
                      onClick={() => choose(r.id)}
                    >
                      <span>
                        {r.kind === 'site' ? r.draft.name : r.draft.title}
                      </span>
                      <small>
                        <i className={r.published ? 'published' : ''} />
                        {r.published
                          ? JSON.stringify(r.draft) ===
                            JSON.stringify(r.published)
                            ? 'Published'
                            : 'Unpublished changes'
                          : 'Draft'}
                      </small>
                    </button>
                  ))}
                </div>
                {kind !== 'site' && (
                  <button
                    className="button add-record"
                    onClick={() => {
                      if (!canLeave()) return;
                      setSelected('new');
                      setData({ ...templates[kind], order: visible.length });
                      setMessage('');
                      setError('');
                    }}
                  >
                    <Plus size={16} />
                    Add{' '}
                    {kind === 'experience'
                      ? 'case study'
                      : names[kind].toLowerCase().replace(/s$/, '')}
                  </button>
                )}
                {kind === 'project' && (
                  <label className="studio-field project-zip-import">
                    Import project ZIP
                    <input
                      type="file"
                      accept="application/zip,.zip"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void importProject(file);
                      }}
                    />
                    <small>
                      One Markdown project with metadata and media. Up to 16 MiB
                      compressed, 24 MiB expanded, 100 files. Always imported
                      privately.
                    </small>
                  </label>
                )}
                <div className="studio-note">
                  <Shield size={17} />
                  <p>
                    Drafts are private. Saving never updates the public version.
                    A published snapshot stays live until you publish again.
                  </p>
                </div>
              </aside>
              <section className="studio-editor" aria-label="Content editor">
                <div className="editor-heading">
                  <div>
                    <p className="eyebrow">{names[kind]}</p>
                    <h2>
                      {selected === 'new'
                        ? 'New entry'
                        : kind === 'site'
                          ? 'Make it yours'
                          : current?.draft.title}
                    </h2>
                  </div>
                  <span className="editor-status">
                    {dirty
                      ? 'Unsaved changes'
                      : current?.published
                        ? 'Published snapshot available'
                        : 'Private draft'}
                  </span>
                </div>
                {kind === 'site' && (
                  <div className="editor-sections">
                    {[
                      ['profile', 'Identity & branding'],
                      ['seo', 'Domain & SEO'],
                      ['copy', 'Navigation & all visible copy'],
                    ].map(([id, text]) => (
                      <button
                        key={id}
                        className={siteGroup === id ? 'active' : ''}
                        onClick={() => setSiteGroup(id)}
                        aria-pressed={siteGroup === id}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                )}
                {kind === 'site' && (
                  <label className="studio-field field-search">
                    Find a setting
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search field names"
                    />
                  </label>
                )}
                {kind === 'media' && (
                  <form
                    className="upload-box"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError('');
                      try {
                        const r = await fetch('/api/admin/upload', {
                          method: 'POST',
                          body: new FormData(e.currentTarget),
                        });
                        const b: any = await r.json();
                        if (!r.ok) throw new Error(b.error);
                        const rr = await fetch('/api/admin');
                        const all = ((await rr.json()) as any).records;
                        setRecords(all);
                        setSelected(b.id);
                        setData(all.find((r: Content) => r.id === b.id).draft);
                        setMessage(
                          'Media uploaded as a private draft. Publish it to use it on the public site.',
                        );
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <strong>Upload media</strong>
                    <label className="studio-field">
                      PNG / JPEG / WebP / GIF · 5 MiB, MP4 / WebM · 12 MiB, VTT
                      · 256 KiB
                      <input
                        type="file"
                        name="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,text/vtt,.vtt"
                        required
                      />
                    </label>
                    <label className="studio-field">
                      Description / alternative text
                      <input name="alt" required maxLength={1000} />
                    </label>
                    <button className="button" disabled={busy}>
                      <Upload size={16} />
                      Upload to media library
                    </button>
                  </form>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act({
                      action: 'save',
                      id: selected === 'new' ? undefined : selected,
                      kind,
                      data:
                        kind === 'link'
                          ? socialLinkDraft(data)
                          : kind === 'project' ||
                              kind === 'experience' ||
                              kind === 'journal'
                            ? projectEditorDraft(data)
                            : data,
                      revision: current?.revision,
                    });
                  }}
                >
                  {kind === 'project' || kind === 'experience' ? (
                    <ProjectEditor
                      key={`${selected}:${editorReset}`}
                      kind={kind}
                      data={data}
                      records={records}
                      busy={busy}
                      onChange={setData}
                      onUpload={uploadProjectMedia}
                      onPublishAssets={publishProjectAssets}
                    />
                  ) : (
                    <StudioContentFields
                      key={`${selected}:${editorReset}`}
                      kind={kind}
                      data={data}
                      siteGroup={siteGroup}
                      search={search}
                      setData={setData}
                      records={records}
                      selected={selected}
                      busy={busy}
                      onUpload={uploadProjectMedia}
                      onPublishAssets={publishProjectAssets}
                    />
                  )}
                  <div className="editor-actions">
                    <button
                      className="button amber"
                      type="submit"
                      disabled={busy}
                    >
                      <Save size={16} />
                      Save draft
                    </button>
                    {current && (
                      <>
                        <a
                          className={`button ${dirty ? 'disabled-link' : ''}`}
                          href={preview}
                          target="_blank"
                          rel="noopener"
                          aria-disabled={dirty}
                          onClick={(e) => {
                            if (dirty) e.preventDefault();
                          }}
                        >
                          <Eye size={16} />
                          Preview saved draft
                        </a>
                        {(kind === 'site' || kind === 'link') && (
                          <a
                            className={`button ${dirty ? 'disabled-link' : ''}`}
                            href="/admin/preview?section=about"
                            target="_blank"
                            rel="noopener"
                            aria-disabled={dirty}
                            onClick={(event) => {
                              if (dirty) event.preventDefault();
                            }}
                          >
                            <Eye size={15} /> Preview About
                          </a>
                        )}
                        <button
                          className="button publish-button"
                          type="button"
                          disabled={busy || dirty}
                          onClick={() =>
                            act({
                              action: 'publish',
                              id: selected,
                              revision: current.revision,
                            })
                          }
                        >
                          Publish
                        </button>
                        {kind === 'project' && (
                          <a
                            className={`button ${dirty || busy ? 'disabled-link' : ''}`}
                            href={`/api/admin/projects/${encodeURIComponent(selected)}/export`}
                            aria-disabled={dirty || busy}
                            onClick={(e) => {
                              if (dirty || busy) e.preventDefault();
                            }}
                          >
                            <Download size={15} />
                            Export project ZIP
                          </a>
                        )}
                        {current.published && kind !== 'site' && (
                          <button
                            className="quiet-button"
                            type="button"
                            disabled={busy || dirty}
                            onClick={() =>
                              setPending({
                                action: 'unpublish',
                                id: selected,
                                revision: current.revision,
                              })
                            }
                          >
                            Unpublish
                          </button>
                        )}
                        {kind !== 'site' && (
                          <button
                            className="quiet-button delete-button"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setPending({
                                action: 'delete',
                                id: selected,
                                revision: current.revision,
                              })
                            }
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {dirty && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setEditorReset((value) => value + 1);
                        setData(
                          current
                            ? { ...current.draft }
                            : { ...templates[kind] },
                        );
                        setError('');
                      }}
                    >
                      Discard unsaved edits
                    </button>
                  )}
                  {dirty && current && (
                    <p className="editor-hint">
                      Save the draft to enable preview and publishing.
                    </p>
                  )}
                  {kind !== 'site' && (
                    <p className="editor-hint">
                      Change “Display order” to organize entries, then publish
                      the reordered record. All published entries appear
                      automatically.
                      {(kind === 'project' || kind === 'experience') &&
                        ' All includes every published entry; category assignments determine the filtered collections.'}
                    </p>
                  )}
                </form>
              </section>
            </div>
          </TabsContent>
          <TabsContent value="inbox">
            <StudioInbox
              inbox={inbox}
              setInbox={setInbox}
              moreInbox={moreInbox}
              setMoreInbox={setMoreInbox}
              onDelete={(id) => setPending({ action: 'inquiryDelete', id })}
            />
          </TabsContent>
          <TabsContent value="settings">
            <StudioAccess
              busy={busy}
              setError={setError}
              act={act}
              members={members}
              setMembers={setMembers}
              email={email}
              audit={audit}
            />
          </TabsContent>
        </Tabs>
      </main>
      <AlertDialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.action === 'unpublish'
                ? 'Unpublish this entry?'
                : 'Delete this item?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.action === 'unpublish'
                ? 'The entry will disappear from the public portfolio. Your draft will remain in the studio.'
                : 'This cannot be undone in the studio. Export content first if you need a backup.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => {
                if (pending) await act(pending);
                setPending(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
