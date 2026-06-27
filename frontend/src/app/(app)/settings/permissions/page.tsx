"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { SettingsBackLink } from "@/components/settings/settings-back-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { permissionsApi, type PermissionMatrix } from "@/lib/api";
import {
  permissionActionShortLabels,
  permissionCellLabel,
  permissionRoleDescriptions,
} from "@/lib/permissions";
import { userRoleLabels } from "@/lib/labels";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const EDITABLE_ROLE_ORDER = [
  "ADMIN",
  "COMMERCIAL",
  "TECHNICIAN",
  "OPERATOR",
  "WAREHOUSE",
  "CLIENT",
] as const;

function sortEditableRoles<T extends { slug: string; editable: boolean }>(
  roles: T[]
): T[] {
  return roles
    .filter((r) => r.editable)
    .sort(
      (a, b) =>
        EDITABLE_ROLE_ORDER.indexOf(
          a.slug as (typeof EDITABLE_ROLE_ORDER)[number]
        ) -
        EDITABLE_ROLE_ORDER.indexOf(
          b.slug as (typeof EDITABLE_ROLE_ORDER)[number]
        )
    );
}

function MyPermissionsView() {
  const { myPermissions, isLoading, user } = usePermissions();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (!myPermissions) {
    return (
      <p className="text-sm text-muted-foreground">
        Impossibile caricare i permessi del tuo account.
      </p>
    );
  }

  const roleLabel =
    userRoleLabels[myPermissions.role] || myPermissions.roleName;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
        <p className="font-medium">{roleLabel}</p>
        <p className="mt-1 text-muted-foreground">
          {myPermissions.description ||
            permissionRoleDescriptions[myPermissions.role] ||
            "Riepilogo di ciò che il tuo tipo di account può fare nel CRM."}
        </p>
      </div>

      {myPermissions.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessun permesso assegnato a questo account. Contatta un
          amministratore.
        </p>
      ) : (
        myPermissions.sections.map((section) => (
          <div key={section.key} className="space-y-2">
            <h3 className="text-sm font-semibold">{section.label}</h3>
            <div className="space-y-2">
              {section.resources.map((resource) => (
                <div
                  key={resource.key}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <p className="font-medium">{resource.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {resource.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {resource.grantedActions.map((a) => (
                      <span
                        key={a.action}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <p className="text-xs text-muted-foreground">
        Account: {user?.firstName} {user?.lastName} ({user?.email}). Per
        modificare i permessi del tuo ruolo serve un amministratore.
      </p>
    </div>
  );
}

function AdminPermissionsEditor() {
  const searchParams = useSearchParams();
  const roleFromUrl = searchParams.get("role");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["permissions", "matrix"],
    queryFn: permissionsApi.getMatrix,
  });

  const [selectedRoleSlug, setSelectedRoleSlug] = useState("COMMERCIAL");
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState("");

  useEffect(() => {
    if (
      roleFromUrl &&
      EDITABLE_ROLE_ORDER.includes(
        roleFromUrl as (typeof EDITABLE_ROLE_ORDER)[number]
      )
    ) {
      setSelectedRoleSlug(roleFromUrl);
    }
  }, [roleFromUrl]);

  const permissionByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.permissions || []) {
      map.set(`${p.resource}:${p.action.toLowerCase()}`, p.id);
    }
    return map;
  }, [data?.permissions]);

  const selectedRole = data?.roles.find((r) => r.slug === selectedRoleSlug);

  useEffect(() => {
    if (!selectedRole) return;
    setDraftIds(new Set(selectedRole.permissionIds));
  }, [selectedRole?.slug, selectedRole?.permissionIds.join(",")]);

  const saveMut = useMutation({
    mutationFn: () =>
      permissionsApi.updateRole(selectedRoleSlug, [...draftIds]),
    onSuccess: (res) => {
      qc.setQueryData<PermissionMatrix>(["permissions", "matrix"], (prev) =>
        prev ? { ...prev, roles: res.roles } : prev
      );
      qc.invalidateQueries({ queryKey: ["permissions", "mine"] });
      setBanner("Permessi salvati.");
      setTimeout(() => setBanner(""), 3000);
    },
    onError: () => setBanner("Errore durante il salvataggio."),
  });

  const togglePermission = (id: string, checked: boolean) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleResource = (
    resourceKey: string,
    actions: string[],
    checked: boolean
  ) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      for (const action of actions) {
        const id = permissionByKey.get(`${resourceKey}:${action.toLowerCase()}`);
        if (!id) continue;
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleSection = (
    resources: { key: string; actions: string[] }[],
    checked: boolean
  ) => {
    setDraftIds((prev) => {
      const next = new Set(prev);
      for (const resource of resources) {
        for (const action of resource.actions) {
          const id = permissionByKey.get(
            `${resource.key}:${action.toLowerCase()}`
          );
          if (!id) continue;
          if (checked) next.add(id);
          else next.delete(id);
        }
      }
      return next;
    });
  };

  const isResourceFullySelected = (resourceKey: string, actions: string[]) =>
    actions.every((action) => {
      const id = permissionByKey.get(`${resourceKey}:${action.toLowerCase()}`);
      return id ? draftIds.has(id) : true;
    });

  const isSectionFullySelected = (
    resources: { key: string; actions: string[] }[]
  ) => resources.every((r) => isResourceFullySelected(r.key, r.actions));

  const allActionColumns = useMemo(() => {
    const actions = new Set<string>();
    for (const section of data?.sections || []) {
      for (const resource of section.resources) {
        for (const action of resource.actions) actions.add(action);
      }
    }
    return ["READ", "CREATE", "UPDATE", "DELETE", "MANAGE_USERS"].filter((a) =>
      actions.has(a)
    );
  }, [data?.sections]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Caricamento…</p>;
  }

  if (!data) return null;

  return (
    <>
      {banner && (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            banner.startsWith("Errore")
              ? "border-red-500/40 bg-red-500/10 text-red-700"
              : "border-green-500/40 bg-green-500/10 text-green-800"
          )}
        >
          {banner}
        </p>
      )}

      {data.roles.find((r) => r.slug === "SUPER_ADMIN") && (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <strong className="text-foreground">Super Admin</strong> — accesso
          completo, non modificabile. I permessi sotto riguardano gli altri
          tipi di account.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {sortEditableRoles(data.roles).map((role) => (
          <Button
            key={role.slug}
            size="sm"
            variant={selectedRoleSlug === role.slug ? "default" : "outline"}
            onClick={() => setSelectedRoleSlug(role.slug)}
          >
            {userRoleLabels[role.slug] || role.name}
          </Button>
        ))}
      </div>

      {selectedRole && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium">
            {userRoleLabels[selectedRole.slug] || selectedRole.name}
          </p>
          <p className="mt-1 text-muted-foreground">
            {selectedRole.description ||
              permissionRoleDescriptions[selectedRole.slug] ||
              "Configura i permessi per questo tipo di account."}
          </p>
        </div>
      )}

      {selectedRole?.slug === "SUPER_ADMIN" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900">
          Il Super Admin ha accesso completo. I permessi non sono modificabili.
        </p>
      ) : (
        data.sections.map((section) => (
          <div key={section.key} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{section.label}</h3>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={isSectionFullySelected(section.resources)}
                  onChange={(e) =>
                    toggleSection(section.resources, e.target.checked)
                  }
                />
                Seleziona tutta la sezione
              </label>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Risorsa</th>
                    {allActionColumns.map((action) => (
                      <th
                        key={action}
                        className="px-2 py-2 text-center font-medium"
                      >
                        {permissionActionShortLabels[action] || action}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-medium">Tutto</th>
                  </tr>
                </thead>
                <tbody>
                  {section.resources.map((resource) => (
                    <tr
                      key={resource.key}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium">{resource.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {resource.description}
                        </p>
                      </td>
                      {allActionColumns.map((action) => {
                        const applicable = resource.actions.includes(action);
                        const permId = applicable
                          ? permissionByKey.get(
                              `${resource.key}:${action.toLowerCase()}`
                            )
                          : undefined;
                        return (
                          <td
                            key={action}
                            className="px-2 py-2 text-center align-middle"
                          >
                            {applicable && permId ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border"
                                checked={draftIds.has(permId)}
                                aria-label={`${resource.label} — ${permissionCellLabel(action, resource.actionLabels)}`}
                                onChange={(e) =>
                                  togglePermission(permId, e.target.checked)
                                }
                              />
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          checked={isResourceFullySelected(
                            resource.key,
                            resource.actions
                          )}
                          aria-label={`Tutti i permessi per ${resource.label}`}
                          onChange={(e) =>
                            toggleResource(
                              resource.key,
                              resource.actions,
                              e.target.checked
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {selectedRole?.editable && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Salvataggio…" : "Salva permessi"}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setDraftIds(new Set(selectedRole.permissionIds))
            }
          >
            Annulla modifiche
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/users">Vai agli utenti</Link>
          </Button>
        </div>
      )}
    </>
  );
}

export default function PermissionsSettingsPage() {
  const router = useRouter();
  const { isAdmin, isClient } = usePermissions();

  useEffect(() => {
    if (isClient) router.replace("/portal");
  }, [isClient, router]);

  if (isClient) return null;

  return (
    <>
      <Header title={isAdmin ? "Permessi per ruolo" : "Permessi account"} />
      <div className="max-w-5xl space-y-6 p-4 sm:p-6">
        <SettingsBackLink />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {isAdmin
                ? "Configura permessi per tipo di account"
                : "Cosa può fare il tuo account"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Per ogni tipo di account (Commerciale, Tecnico, Magazziniere…) scegli cosa può visualizzare e modificare nel CRM."
                : "Elenco delle aree e delle azioni consentite al tuo tipo di account."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin ? <AdminPermissionsEditor /> : <MyPermissionsView />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
