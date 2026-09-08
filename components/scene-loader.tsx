import { Orbit, ArrowUpRight } from 'lucide-react';

export function SceneLoader({
  site,
  boot = false,
  unavailable = false,
}: {
  site: Record<string, any>;
  boot?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div
      className={`scene-loader ${boot ? 'boot-loader' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-orbit" aria-hidden="true">
        <i />
        <i />
        <Orbit size={40} />
      </div>
      <p>{unavailable ? site.sceneUnavailable : site.sceneLoading}</p>
      <div className="loader-track" aria-hidden="true">
        <span />
      </div>
      {boot && (
        <a href="#room-reader">
          {site.readLabel}
          <ArrowUpRight size={16} />
        </a>
      )}
    </div>
  );
}
