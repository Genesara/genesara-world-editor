import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ClipboardList, Crosshair, Globe2, History, LogOut, MapPin, User2 } from 'lucide-react';
import { useAuth } from '@/admin/lib/auth/AuthContext';
import { ConnectionPill } from './ConnectionPill';
import { DegradedBanner } from './DegradedBanner';
import { Button } from '@/admin/components/ui/Button';
import { cn } from '@/admin/lib/cn';

const NAV = [
  { to: '/admin/feed', label: 'Live feed', icon: Activity },
  { to: '/admin/agents', label: 'Agents', icon: User2 },
  { to: '/admin/nodes', label: 'Nodes', icon: MapPin },
  { to: '/admin/map', label: 'World map', icon: Globe2 },
  { to: '/admin/zones', label: 'NPC zones', icon: Crosshair },
  { to: '/admin/replay', label: 'Replay', icon: History },
  { to: '/admin/audit', label: 'Audit', icon: ClipboardList },
];

export function AdminShell() {
  const { logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-bg-base">
      <header className="flex items-center justify-between gap-3 px-3 h-11 shrink-0 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav('/worlds')} title="Back to editor">
            <ArrowLeft className="size-3.5" />
            Editor
          </Button>
          <div className="w-px h-4 bg-border-default mx-1" />
          <div className="size-5 rounded bg-gradient-to-br from-accent to-accent-hover" />
          <div className="text-sm font-medium text-fg-strong">Genesara</div>
          <div className="text-xs text-fg-muted">Operations</div>
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
