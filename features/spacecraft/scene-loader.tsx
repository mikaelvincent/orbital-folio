import { Orbit, ArrowUpRight } from 'lucide-react';
import { AUTOMATIC_READING_QUERY } from '../portfolio/view-policy';

export function SceneLoader({
  site,
  boot = false,
  automatic = false,
  unavailable = false,
}: {
  site: Record<string, any>;
  boot?: boolean;
  automatic?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div
      className={`scene-loader ${boot ? 'boot-loader' : ''}${automatic ? ' automatic-loader' : ''}`}
      role="status"
      aria-live="polite"
    >
      {boot && automatic && (
        <style>{`@media ${AUTOMATIC_READING_QUERY} { .boot-loader.automatic-loader { display: none; } }`}</style>
      )}
      <div className="loader-orbit" aria-hidden="true">
        <i />
        <i />
        <Orbit size={40} />
      </div>
      <p>{unavailable ? site.sceneUnavailable : site.sceneLoading}</p>
      <div className="loader-track" aria-hidden="true">
        <span />
      </div>
      <a href="#room-reader">
        {site.readLabel}
        <ArrowUpRight size={16} />
      </a>
    </div>
  );
}
