/* oxlint-disable jsx-a11y/media-has-caption -- The native player renders an authored caption track when the asset has one; silent recordings may omit it. */
import { createElement, Fragment, type ReactNode } from 'react';
import type { Token, Tokens } from 'marked';
import { decodeHTML } from 'entities';
import {
  parseProjectMarkdown,
  projectContentUrl,
} from './project-markdown-content';
import './project-markdown.css';

type Media = Record<string, any>;

export function ProjectMedia({
  item,
  media,
  caption = true,
  compact = false,
}: {
  item: Media;
  media: Media[];
  caption?: boolean;
  compact?: boolean;
}) {
  const url = projectContentUrl(item.url, 'media');
  if (!url) return null;
  const poster = media.find(
    (asset) =>
      asset.id === item.posterMediaId &&
      String(asset.mime).startsWith('image/'),
  );
  const captions = media.find(
    (asset) => asset.id === item.captionsMediaId && asset.mime === 'text/vtt',
  );
  const isVideo = String(item.mime).startsWith('video/');
  if (!isVideo && !String(item.mime).startsWith('image/')) return null;
  const posterUrl = projectContentUrl(poster?.url, 'media');
  return (
    <figure className={`project-story-media${compact ? ' is-compact' : ''}`}>
      {isVideo && !compact ? (
        <video
          controls
          preload="none"
          playsInline
          poster={posterUrl}
          aria-label={item.alt || item.title || 'Project video'}
        >
          <source src={url} type={item.mime} />
          {captions && (
            <track
              kind="captions"
              src={projectContentUrl(captions.url, 'media')}
              srcLang={captions.language || 'en'}
              label={captions.title || 'Captions'}
              default
            />
          )}
          Your browser does not support this video.{' '}
          <a href={url}>Download the video</a>.
        </video>
      ) : isVideo ? (
        posterUrl ? (
          <img
            src={posterUrl}
            alt={item.alt || item.title || ''}
            loading="lazy"
          />
        ) : (
          <span className="project-video-cover">Video walkthrough</span>
        )
      ) : (
        <img
          src={url}
          alt={item.alt || item.title || ''}
          loading="lazy"
          decoding="async"
        />
      )}
      {caption && item.title && <figcaption>{item.title}</figcaption>}
    </figure>
  );
}

/** Render a deliberately small, safe Markdown vocabulary as React elements.
 * Raw HTML stays escaped text; no authored HTML or script reaches the DOM. */
export function ProjectMarkdown({
  body,
  media = [],
}: {
  body: string;
  media?: Media[];
}) {
  const { tokens, headings } = parseProjectMarkdown(body);
  let headingIndex = 0;
  const inline = (list: Token[] = []): ReactNode =>
    list.map((token, index) => {
      const content =
        'tokens' in token && Array.isArray(token.tokens)
          ? inline(token.tokens)
          : 'text' in token
            ? token.type === 'html' || token.type === 'codespan'
              ? String(token.text)
              : decodeHTML(String(token.text))
            : token.raw;
      switch (token.type) {
        case 'strong':
          return <strong key={index}>{content}</strong>;
        case 'em':
          return <em key={index}>{content}</em>;
        case 'del':
          return <del key={index}>{content}</del>;
        case 'codespan':
          return <code key={index}>{token.text}</code>;
        case 'br':
          return <br key={index} />;
        case 'link': {
          const href = projectContentUrl(token.href);
          return href ? (
            <a
              key={index}
              href={href}
              rel={
                href.startsWith('https:') ? 'noopener noreferrer' : undefined
              }
              target={href.startsWith('https:') ? '_blank' : undefined}
            >
              {content}
            </a>
          ) : (
            <Fragment key={index}>{content}</Fragment>
          );
        }
        case 'image': {
          const href = projectContentUrl(token.href, 'media');
          const item = media.find(
            (asset) => asset.url === href || `/media/${asset.id}` === href,
          );
          if (item && String(item.mime).startsWith('video/'))
            return (
              <a key={index} href={href}>
                {token.text || item.alt || 'Watch video'}
              </a>
            );
          return href ? (
            <img
              key={index}
              src={href}
              alt={decodeHTML(token.text || item?.alt || '')}
              title={token.title || undefined}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span key={index}>{token.text}</span>
          );
        }
        default:
          return <Fragment key={index}>{content}</Fragment>;
      }
    });
  const block = (list: Token[]): ReactNode =>
    list.map((token, index) => {
      switch (token.type) {
        case 'space':
        case 'def':
          return null;
        case 'heading': {
          const heading = headings[headingIndex++];
          return createElement(
            `h${Math.max(2, Math.min(6, token.depth))}`,
            { key: index, id: heading?.id },
            inline(token.tokens),
          );
        }
        case 'paragraph': {
          const paragraphTokens = token.tokens ?? [];
          const single =
            paragraphTokens.length === 1 ? paragraphTokens[0] : undefined;
          if (single?.type === 'link' || single?.type === 'image') {
            const href = projectContentUrl(single.href, 'media');
            const item = media.find(
              (asset) => asset.url === href || `/media/${asset.id}` === href,
            );
            if (item && String(item.mime).startsWith('video/'))
              return (
                <ProjectMedia
                  key={index}
                  item={{ ...item, alt: single.text || item.alt }}
                  media={media}
                  caption={false}
                />
              );
          }
          // Block media must not be nested in a <p>; images in prose remain inline.
          const onlyMedia =
            paragraphTokens.length === 1 && paragraphTokens[0].type === 'image';
          return onlyMedia ? (
            <div className="project-markdown-media" key={index}>
              {inline(token.tokens)}
            </div>
          ) : (
            <p key={index}>{inline(token.tokens)}</p>
          );
        }
        case 'text':
          return (
            <Fragment key={index}>
              {token.tokens ? inline(token.tokens) : decodeHTML(token.text)}
            </Fragment>
          );
        case 'blockquote':
          return (
            <blockquote key={index}>{block(token.tokens ?? [])}</blockquote>
          );
        case 'list': {
          const list = token as Tokens.List;
          return createElement(
            list.ordered ? 'ol' : 'ul',
            { key: index, ...(list.ordered ? { start: list.start } : {}) },
            list.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                {item.task && (
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    disabled
                    aria-label={item.text}
                  />
                )}
                {block(item.tokens)}
              </li>
            )),
          );
        }
        case 'code':
          return (
            <pre key={index}>
              <code>{token.text}</code>
            </pre>
          );
        case 'hr':
          return <hr key={index} />;
        case 'table':
          return (
            <div key={index} className="project-markdown-table">
              <table>
                <thead>
                  <tr>
                    {token.header.map(
                      (cell: Tokens.TableCell, cellIndex: number) => (
                        <th key={cellIndex} scope="col">
                          {inline(cell.tokens)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {token.rows.map(
                    (row: Tokens.TableCell[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{inline(cell.tokens)}</td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          );
        case 'html':
          return (
            <p key={index} className="project-markdown-literal">
              {token.text}
            </p>
          );
        default:
          return (
            <Fragment key={index}>
              {'text' in token ? String(token.text) : token.raw}
            </Fragment>
          );
      }
    });
  return <div className="project-markdown">{block(tokens)}</div>;
}
