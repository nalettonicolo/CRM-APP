"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usersApi } from "@/lib/api";
import { userRoleLabels, userStatusLabels } from "@/lib/labels";
import { useAuthStore } from "@/store/auth";
import { cn, formatDate } from "@/lib/utils";

const ROLES = [
  "ADMIN",
  "COMMERCIAL",
  "TECHNICIAN",
  "OPERATOR",
  "WAREHOUSE",
  "CLIENT",
] as const;

export default function UsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "TECHNICIAN",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard");
  }, [user, isAdmin, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateOpen(false);
      setForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "TECHNICIAN",
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      usersApi.resetPassword(resetUserId!, resetPassword),
    onSuccess: () => {
      setResetUserId(null);
      setResetPassword("");
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!isAdmin) {
    return (
      <>
        <Header title="Utenti" />
        <p className="p-6 text-muted-foreground">Accesso non autorizzato.</p>
      </>
    );
  }

  return (
    <>
      <Header title="Utenti" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-6 flex justify-end">
          <Button onClick={() => { setError(""); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Nuovo utente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Nome</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Ruolo</th>
                    <th className="px-4 py-3 text-left font-medium">Stato</th>
                    <th className="px-4 py-3 text-right font-medium">Creato</th>
                    <th className="px-4 py-3 text-right font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Caricamento...
                      </td>
                    </tr>
                  ) : (
                    data?.map((u) => (
                      <tr key={u.id} className="border-b border-border">
                        <td className="px-4 py-3 font-medium">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          {userRoleLabels[u.role] || u.role}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              u.status === "ACTIVE"
                                ? "bg-green-500/15 text-green-700"
                                : "bg-gray-500/15 text-gray-600"
                            )}
                          >
                            {userStatusLabels[u.status] || u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setError("");
                              setResetUserId(u.id);
                            }}
                          >
                            <KeyRound className="h-4 w-4" /> Reset password
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo utente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Password (min 8 caratteri)"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Nome"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                placeholder="Cognome"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <Input
              placeholder="Telefono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {user?.role === "SUPER_ADMIN" && (
                <option value="SUPER_ADMIN">Super admin</option>
              )}
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {userRoleLabels[r]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetUserId} onOpenChange={() => setResetUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reimposta password</DialogTitle>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Nuova password (min 8 caratteri)"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUserId(null)}>
              Annulla
            </Button>
            <Button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || resetPassword.length < 8}
            >
              Salva password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
