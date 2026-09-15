'use client';
import { useEffect } from 'react';
import type { Content, Kind } from '@/lib/content/types';

export function useStudioModelTools({
  records,
  act,
  setKind,
  setSelected,
}: {
  records: Content[];
  act: (payload: any) => Promise<any>;
  setKind: (kind: Kind) => void;
  setSelected: (id: string) => void;
}) {
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: any) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: 'read_portfolio_content',
      title: 'Read portfolio content',
      description:
        'Read the owner’s editable content records, including drafts and published snapshots. Available only in the authenticated content studio.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({ records }),
    });
    register({
      name: 'save_portfolio_draft',
      title: 'Save a portfolio draft',
      description:
        'Save changes to an existing content record as a private draft and show it in the editor. Does not publish. Use the record ID from read_portfolio_content.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, changes: { type: 'object' } },
        required: ['id', 'changes'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: any) => {
        if (
          !input ||
          typeof input.id !== 'string' ||
          !input.changes ||
          Array.isArray(input.changes) ||
          typeof input.changes !== 'object'
        )
          throw new Error('Provide a record ID and changes object.');
        const r = records.find((r) => r.id === input.id);
        if (!r) throw new Error('Record not found.');
        setKind(r.kind);
        setSelected(r.id);
        const result = await act({
          action: 'save',
          id: r.id,
          kind: r.kind,
          data: { ...r.draft, ...input.changes },
          revision: r.revision,
        });
        if (!result)
          throw new Error('Draft validation or authorization failed.');
        return { id: r.id, status: 'draft_saved' };
      },
    });
    return () => lifecycle.abort();
  }, [records, act, setKind, setSelected]);
}
