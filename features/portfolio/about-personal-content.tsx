'use client';

import { useState } from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { imageCropStyle, resolveAboutPhotos } from '@/lib/content/about-photos';
import { resolveAboutSocials, socialIcon } from '@/lib/content/social-links';
import type { Portfolio } from '@/lib/content/types';
import './about-personal-content.css';

export function AboutPortrait({ data }: { data: Portfolio }) {
  const photo = resolveAboutPhotos(data).portrait;
  const [failedUrl, setFailedUrl] = useState('');
  if (!photo || photo.media.url === failedUrl)
    return <BookOpen size={32} aria-hidden="true" />;
  return (
    <div className="about-profile-photo">
      <img
        src={photo.media.url}
        alt={photo.media.alt || `Portrait of ${data.site.name}`}
        width="300"
        height="300"
        style={imageCropStyle(photo.readingCrop)}
        onError={() => setFailedUrl(photo.media.url)}
      />
    </div>
  );
}

export function AboutSocialLinks({ data }: { data: Portfolio }) {
  const links = Object.values(resolveAboutSocials(data.links)).filter(
    (link) => link !== null,
  );
  if (!links.length) return null;
  return (
    <nav className="about-social-links" aria-label="Social profiles">
      {links.map((link) => {
        const icon = socialIcon(link.platform);
        const email = link.url.startsWith('mailto:');
        return (
          <a
            key={link.id}
            href={link.url}
            target={email ? undefined : '_blank'}
            rel={email ? undefined : 'noopener noreferrer'}
            aria-label={
              email
                ? `Email ${link.title}`
                : `${link.title} (opens in a new tab)`
            }
          >
            <svg
              viewBox={icon.viewBox}
              aria-hidden="true"
              fill={icon.filled ? 'currentColor' : 'none'}
              stroke={icon.filled ? 'none' : 'currentColor'}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={icon.path} />
            </svg>
            <span>{link.title}</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
