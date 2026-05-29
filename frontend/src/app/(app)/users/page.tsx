"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus } from "lucide-react";
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
import { DeleteEntityButton } from "@/components/ui/delete-entity-button";
import { usersApi, type StaffUser } from "@/lib/api";
import { userRoleLabels, userStatusLabels } from "@/lib/labels";
import { SECTION_CREATE } from "@/lib/section-create";
import { PageCreateButton } from "@/components/layout/page-create-action";
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

function userDisplayName(u: StaffUser) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

export default function UsersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [editing, setEditing] = useState(false);
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
  const [editForm, setEditForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "TECHNICIAN",
    status: "ACTIVE",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard");
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (selectedUser && !editing) {
      setEditForm({
        email: selectedUser.email,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        phone: selectedUser.phone || "",
        role: selectedUser.role,
        status: selectedUser.status,
      });
    }
  }, [selectedUser, editing]);

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeDetail();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.update(selectedUser!.id, {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone || undefined,
        role: editForm.role,
        status: editForm.status,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUser(updated);
      setEditing(false);
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

  function openUser(u: StaffUser) {
    setError("");
    setEditing(false);
    setSelectedUser(u);
  }

  function closeDetail() {
    setSelectedUser(null);
    setEditing(false);
  }

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
          <PageCreateButton
            label={SECTION_CREATE.user}
            onClick={() => {
              setError("");
              setCreateOpen(true);
            }}
          />
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
                      <tr
                        key={u.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
                        onClick={() => openUser(u)}
                      >
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
                          <div className="flex items-center justify-end gap-1">
                            {u.id !== user?.id && (
                              <DeleteEntityButton
                                size="icon"
                                pending={deleteMutation.isPending}
                                confirmMessage={`Eliminare l'utente ${userDisplayName(u)}?`}
                                onConfirm={() => deleteMutation.mutate(u.id)}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setError("");
                                setResetUserId(u.id);
                              }}
                            >
                              <KeyRound className="h-4 w-4" /> Reset password
                            </Button>
                          </div>
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

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifica utente" : "Riepilogo utente"}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && !editing && (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="text-lg font-semibold">
                    {userDisplayName(selectedUser)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${selectedUser.email}`}
                      className="text-primary hover:underline"
                    >
                      {selectedUser.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefono</dt>
                  <dd>{selectedUser.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ruolo</dt>
                  <dd className="font-medium">
                    {userRoleLabels[selectedUser.role] || selectedUser.role}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stato</dt>
                  <dd>
                    {userStatusLabels[selectedUser.status] || selectedUser.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Creato</dt>
                  <dd>{formatDate(selectedUser.createdAt)}</dd>
                </div>
                {selectedUser.lastLoginAt && (
                  <div>
                    <dt className="text-muted-foreground">Ultimo accesso</dt>
                    <dd>{formatDate(selectedUser.lastLoginAt)}</dd>
                  </div>
                )}
              </dl>

              {selectedUser.role === "CLIENT" && selectedUser.client && (
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-muted-foreground">
                  Cliente collegato:{" "}
                  <Link
                    href={`/clients/${selectedUser.client.id}`}
                    className="font-medium text-primary hover:underline"
                    onClick={() => closeDetail()}
                  >
                    {selectedUser.client.companyName ||
                      selectedUser.client.contactName ||
                      "Scheda cliente"}
                  </Link>
                </p>
              )}
            </div>
          )}

          {selectedUser && editing && (
            <div className="grid gap-3">
              <Input
                placeholder="Email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Nome"
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
                <Input
                  placeholder="Cognome"
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
              <Input
                placeholder="Telefono"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                {user?.role === "SUPER_ADMIN" && (
                  <option value="SUPER_ADMIN">Admin</option>
                )}
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {userRoleLabels[r]}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                {Object.entries(userStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {selectedUser && !editing && selectedUser.id !== user?.id && (
                <DeleteEntityButton
                  pending={deleteMutation.isPending}
                  confirmMessage={`Eliminare l'utente ${userDisplayName(selectedUser)}?`}
                  onConfirm={() => deleteMutation.mutate(selectedUser.id)}
                />
              )}
              <Button variant="outline" onClick={closeDetail}>
                Chiudi
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedUser && !editing && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError("");
                      setResetUserId(selectedUser.id);
                    }}
                  >
                    <KeyRound className="h-4 w-4" /> Reset password
                  </Button>
                  <Button onClick={() => { setError(""); setEditing(true); }}>
                    <Pencil className="h-4 w-4" /> Modifica
                  </Button>
                </>
              )}
              {selectedUser && editing && (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Annulla
                  </Button>
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    {updateMutation.isPending ? "Salvataggio..." : "Salva"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <option value="SUPER_ADMIN">Admin</option>
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
