"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { mockChannels, mockMessages } from "@/lib/mockData";

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(mockChannels[0].id);
  const channel = mockChannels.find((c) => c.id === activeChannel)!;

  return (
    <>
      <Topbar title="Chat di team" subtitle="Canali interni pubblici e privati" />
      <main className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-surface-border p-3">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-white/40">Canali</p>
          {mockChannels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChannel(c.id)}
              className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm ${
                c.id === activeChannel ? "bg-brand-500/15 text-brand-300" : "text-white/65 hover:bg-white/5"
              }`}
            >
              <span># {c.name}</span>
              {c.isPrivate && <span className="text-[10px] text-white/30">🔒</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {mockMessages.map((m) => (
              <div key={m.id} className="flex items-start gap-3">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-surface"
                  style={{ background: m.author.avatarColor }}
                >
                  {m.author.firstName[0]}
                  {m.author.lastName[0]}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">
                      {m.author.firstName} {m.author.lastName}
                    </span>
                  </p>
                  <p className="text-sm text-white/75">{m.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-surface-border p-3">
            <input
              placeholder={`Scrivi in #${channel.name}…`}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </main>
    </>
  );
}
