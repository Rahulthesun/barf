import {
  SiN8n, SiGitea, SiNextcloud, SiGitlab, SiWordpress, SiGhost,
  SiBitwarden, SiVaultwarden, SiJellyfin, SiPlex, SiPortainer,
  SiGrafana, SiPrometheus, SiMattermost, SiDrone, SiMatrix,
  SiDocker, SiRedis, SiMongodb, SiNginx, SiImmich, SiFreshrss,
  SiWallabag, SiPaperlessngx, SiNtfy, SiVikunja, SiOutline,
  SiBookstack, SiCalibreweb, SiNetdata, SiUptimekuma,
  SiPlane, SiTwenty, SiListmonk, SiFormbricks, SiKeycloak, SiUmami,
} from "@icons-pack/react-simple-icons";
import type { ComponentType } from "react";

type SiProps = { size?: number; color?: string; className?: string };

// Maps `si_slug` (DB column) → icon component.
// The DB slug is the simple-icons slug (lowercase, no hyphens).
// Fallback: if si_slug is null, we try app_slug with hyphens stripped.
const ICON_MAP: Record<string, ComponentType<SiProps>> = {
  n8n:          SiN8n,
  gitea:        SiGitea,
  nextcloud:    SiNextcloud,
  gitlab:       SiGitlab,
  wordpress:    SiWordpress,
  ghost:        SiGhost,
  bitwarden:    SiBitwarden,
  vaultwarden:  SiVaultwarden,
  jellyfin:     SiJellyfin,
  plex:         SiPlex,
  portainer:    SiPortainer,
  grafana:      SiGrafana,
  prometheus:   SiPrometheus,
  mattermost:   SiMattermost,
  drone:        SiDrone,
  matrix:       SiMatrix,
  docker:       SiDocker,
  redis:        SiRedis,
  mongodb:      SiMongodb,
  nginx:        SiNginx,
  immich:       SiImmich,
  freshrss:     SiFreshrss,
  wallabag:     SiWallabag,
  paperlessngx: SiPaperlessngx,
  ntfy:         SiNtfy,
  vikunja:      SiVikunja,
  outline:      SiOutline,
  bookstack:    SiBookstack,
  calibreweb:   SiCalibreweb,
  netdata:      SiNetdata,
  uptimekuma:   SiUptimekuma,
  // apps visible in browse
  plane:        SiPlane,
  twenty:       SiTwenty,
  listmonk:     SiListmonk,
  formbricks:   SiFormbricks,
  keycloak:     SiKeycloak,
  umami:        SiUmami,
};

function slugToKey(slug: string): string {
  return slug.toLowerCase().replace(/[-_.\s]/g, "");
}

interface AppIconProps {
  /** Value of oss_apps.si_slug from the DB (preferred) */
  siSlug?: string | null;
  /** Fallback: the app slug (e.g. "uptime-kuma") */
  appSlug?: string;
  /** Letter shown when no icon matches */
  fallbackLetter?: string;
  size?: number;
  className?: string;
}

export function AppIcon({ siSlug, appSlug, fallbackLetter, size = 22, className = "" }: AppIconProps) {
  const key = siSlug ? slugToKey(siSlug) : appSlug ? slugToKey(appSlug) : "";
  const Icon = ICON_MAP[key];

  if (Icon) {
    return <Icon size={size} className={className} />;
  }

  // Letter avatar fallback
  const letter = fallbackLetter ?? (appSlug ?? siSlug ?? "?").charAt(0).toUpperCase();
  return (
    <span className={`flex items-center justify-center font-bold font-mono text-zinc-500 ${className}`}>
      {letter}
    </span>
  );
}
