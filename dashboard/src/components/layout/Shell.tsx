import { NavLink, Outlet } from 'react-router-dom';
import { Activity, ClipboardList, Crosshair, Globe2, History, LogOut, MapPin, User2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ConnectionPill } from './ConnectionPill';
import { DegradedBanner } from './DegradedBanner';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/feed', label: 'Live feed', icon: Activity },
  { to: '/agents', label: 'Agents', icon: User2 },
  { to: '/nodes', label: 'Nodes', icon: MapPin },
  { to: '/map', label: 'World map', icon: Globe2 },
  { to: '/zones', label: 'NPC zones', icon: Crosshair },
  { to: '/replay', label: 'Replay', icon: History },
  { to: '/audit', label: 'Audit', icon: ClipboardList },
];

export function Shell() {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      <header className="flex items-center justify-between gap-3 px-3 h-11 shrink-0 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="size-5 rounded bg-gradient-to-br from-accent to-accent-hover" />
          <div className="text-sm font-medium text-fg-strong">Genesara</div>
          <div className="text-xs text-fg-muted">Admin</div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionPill />
          <Button variant="ghost" size="sm" onClick={logout} title="Log out">
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </div>
      </header>

      <DegradedBanner />

      <div className="flex flex-1 min-h-0">
        <nav className="w-[200px] shrink-0 border-r border-border-subtle bg-bg-base">
          <ul className="flex flex-col p-2 gap-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 h-7 px-2 rounded text-sm text-fg-subtle hover:text-fg-default hover:bg-bg-raised',
                      'transition-colors duration-150 ease-precise',
                      isActive && 'bg-bg-raised text-fg-strong',
                    )
                  }
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
