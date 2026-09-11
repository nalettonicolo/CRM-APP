import { mockUser } from "@/lib/mockData";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-surface-border bg-surface/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="badge bg-accent-green/15 text-accent-green">● Demo data</span>
        <div
          className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-surface"
          style={{ background: mockUser.avatarColor }}
          title={`${mockUser.firstName} ${mockUser.lastName}`}
        >
          {mockUser.firstName[0]}
          {mockUser.lastName[0]}
        </div>
      </div>
    </header>
  );
}
