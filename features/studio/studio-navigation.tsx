'use client';
import { useState } from 'react';
import {
  Settings2,
  FolderOpen,
  Archive,
  BookOpen,
  MessageSquare,
  Inbox,
  Shield,
  SlidersHorizontal,
} from 'lucide-react';
import { siteSections, type StudioArea } from './studio-site-schema';
import type { Kind } from '@/lib/content/types';
export const areaKinds: Partial<Record<StudioArea, Kind>> = {
  projects: 'project',
  experience: 'experience',
  about: 'journal',
};
export function StudioNavigation({
  site,
  area,
  kind,
  siteGroup,
  inboxCount,
  onSelect,
}: {
  site: Record<string, any>;
  area: StudioArea;
  kind: Kind;
  siteGroup: string;
  inboxCount: number;
  onSelect: (area: StudioArea, kind?: Kind, group?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const select: typeof onSelect = (...args) => {
    onSelect(...args);
    setOpen(false);
  };
  const groups = [
    {
      label: 'Site',
      items: [{ id: 'general', label: 'General', Icon: Settings2 }],
    },
    {
      label: 'Rooms',
      items: [
        { id: 'projects', label: site.projectsLabel, Icon: FolderOpen },
        { id: 'experience', label: site.experienceLabel, Icon: Archive },
        { id: 'about', label: site.aboutLabel, Icon: BookOpen },
        { id: 'contact', label: site.contactLabel, Icon: MessageSquare },
      ],
    },
    {
      label: 'Management',
      items: [
        { id: 'inbox', label: 'Inbox', Icon: Inbox },
        { id: 'settings', label: 'Access & backups', Icon: Shield },
      ],
    },
  ];
  return (
    <aside className="studio-navigation" data-expanded={open}>
      <button
        type="button"
        className="studio-nav-toggle"
        aria-expanded={open}
        aria-controls="studio-sections"
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={18} />
        Browse sections<span>{open ? '−' : '+'}</span>
      </button>
      <div className="studio-navigation-heading">
        <SlidersHorizontal size={18} />
        <span>Content studio</span>
      </div>
      <nav id="studio-sections" aria-label="Studio sections">
        {groups.map((group) => (
          <div className="studio-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
              const id = item.id as StudioArea;
              const Icon = item.Icon;
              const selected = area === id;
              const sections = siteSections.filter(
                (section) => section.area === id,
              );
              return (
                <div key={id}>
                  <button
                    className={`studio-area-link ${selected ? 'active' : ''}`}
                    onClick={() => select(id, areaKinds[id], sections[0]?.id)}
                    aria-current={selected ? 'page' : undefined}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {id === 'inbox' && <small>{inboxCount}</small>}
                  </button>
                  {selected && sections.length > 0 && (
                    <div className="studio-section-links">
                      {areaKinds[id] && (
                        <button
                          className={kind === areaKinds[id] ? 'active' : ''}
                          aria-current={
                            kind === areaKinds[id] ? 'page' : undefined
                          }
                          onClick={() => select(id, areaKinds[id])}
                        >
                          {id === 'about' ? 'Notebook sections' : 'Entries'}
                        </button>
                      )}
                      {(id === 'about' || id === 'contact') && (
                        <button
                          className={kind === 'link' ? 'active' : ''}
                          aria-current={kind === 'link' ? 'page' : undefined}
                          onClick={() => select(id, 'link')}
                        >
                          Social links
                        </button>
                      )}
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          className={
                            kind === 'site' && siteGroup === section.id
                              ? 'active'
                              : ''
                          }
                          aria-current={
                            kind === 'site' && siteGroup === section.id
                              ? 'page'
                              : undefined
                          }
                          onClick={() => select(id, 'site', section.id)}
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
      <p className="studio-navigation-note">
        Save privately.
        <br />
        Publish when ready.
      </p>
    </aside>
  );
}
