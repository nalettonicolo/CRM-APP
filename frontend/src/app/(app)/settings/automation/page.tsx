"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { automationApi, type AutomationRule } from "@/lib/api";

export default function AutomationSettingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    discountPercent: "",
    isActive: true,
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: automationApi.list,
  });

  const createMut = useMutation({
    mutationFn: () =>
      automationApi.create({
        name: form.name,
        category: form.category,
        isActive: form.isActive,
        discountPercent: form.discountPercent
          ? Number(form.discountPercent)
          : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation-rules"] });
      setOpen(false);
      setForm({ name: "", category: "", discountPercent: "", isActive: true });
    },
  });

  const toggleMut = useMutation({
    mutationFn: (rule: AutomationRule) =>
      automationApi.update(rule.id, { isActive: !rule.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => automationApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  return (
    <>
      <Header title="Regole automazione preventivi" />
      <div className="max-w-3xl space-y-6 p-6">
        <Link href="/settings" className="text-sm text-primary hover:underline">
          ← Impostazioni
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Regole per categoria</CardTitle>
            <Button size="sm" onClick={() => setOpen(true)}>
              Nuova regola
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Caricamento…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna regola configurata.</p>
            ) : (
              <ul className="space-y-3">
                {rules.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Categoria: {r.category}
                        {r.discountPercent != null &&
                          ` · Sconto ${Number(r.discountPercent)}%`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMut.mutate(r)}
                      >
                        {r.isActive ? "Disattiva" : "Attiva"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteMut.mutate(r.id)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova regola</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome regola"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Categoria preventivo"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Sconto %"
              value={form.discountPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountPercent: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!form.name || !form.category || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}