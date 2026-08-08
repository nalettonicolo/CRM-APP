"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ClientSearchSelect } from "@/components/clients/client-search-select";
import { IeHeader } from "@/components/ie/ie-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appSelectClass } from "@/components/ui/field-label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  invoicesApi,
  supplierBillsApi,
  clientExpensesApi,
  type Invoice,
  type SupplierBill,
  type ClientExpense,
  type Client,
} from "@/lib/api";
import { publicAssetUrl } from "@/lib/branding";
import { useWorkspaceRoutes } from "@/contexts/workspace-context";
import { paymentStatusLabels } from "@/lib/labels";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const billStatusLabels: Record<string, string> = {
  UNPAID: "Da pagare",
  PARTIAL: "Parziale",
  PAID: "Pagata",
  OVERDUE: "Scaduta",
};

const statusTone: Record<string, string> = {
  UNPAID: "bg-amber-500/15 text-amber-300",
  PARTIAL: "bg-sky-500/15 text-sky-300",
  PAID: "bg-emerald-500/15 text-emerald-300",
  OVERDUE: "bg-red-500/15 text-red-300",
};

type Tab = "out" | "in" | "exp";
type Filter = "open" | "all";

type EditOutState = {
  invoice: Invoice;
  dueDate: string;
  balanceDue: string;
  paymentStatus: string;
};

type EditInState = {
  bill: SupplierBill | null;
  supplierName: string;
  description: string;
  dueDate: string;
  invoiceDate: string;
  amount: string;
  vatAmount: string;
  total: string;
  paidAmount: string;
  status: string;
  reference: string;
  notes: string;
  file: File | null;
};

type EditExpState = {
  expense: ClientExpense | null;
  clientId: string;
  clientName: string;
  category: string;
  description: string;
  expenseDate: string;
  dueDate: string;
  amount: string;
  vatAmount: string;
  total: string;
  paidAmount: string;
  status: string;
  reference: string;
  notes: string;
  file: File | null;
};

function emptyBillForm(): EditInState {
  return {
    bill: null,
    supplierName: "",
    description: "",
    dueDate: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    amount: "",
    vatAmount: "0",
    total: "",
    paidAmount: "0",
    status: "UNPAID",
    reference: "",
    notes: "",
    file: null,
  };
}

function emptyExpenseForm(): EditExpState {
  return {
    expense: null,
    clientId: "",
    clientName: "",
    category: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amount: "",
    vatAmount: "0",
    total: "",
    paidAmount: "0",
    status: "UNPAID",
    reference: "",
    notes: "",
    file: null,
  };
}

function clientName(inv: Invoice) {
  return (
    inv.client?.companyName ||
    inv.client?.contactName ||
    [inv.client?.firstName, inv.client?.lastName].filter(Boolean).join(" ") ||
    "Cliente"
  );
}

function clientLabel(client: Client) {
  return (
    client.companyName ||
    client.contactName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    client.email ||
    client.id
  );
}

function toIsoDate(dateStr: string) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00.000Z`).toISOString();
}

function DocumentLink({
  filePath,
  fileName,
}: {
  filePath?: string | null;
  fileName?: string | null;
}) {
  if (filePath) {
    return (
      <p className="text-sm text-slate-400">
        Documento:{" "}
        <a
          href={publicAssetUrl(filePath)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-300 underline-offset-2 hover:underline"
        >
          {fileName || "Apri documento"}
        </a>
      </p>
    );
  }
  return <p className="text-sm text-slate-600">Nessun documento</p>;
}

export default function IeScadenzePage() {
  const routes = useWorkspaceRoutes();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("out");
  const [filter, setFilter] = useState<Filter>("open");
  const [banner, setBanner] = useState("");
  const [editOut, setEditOut] = useState<EditOutState | null>(null);
  const [editIn, setEditIn] = useState<EditInState | null>(null);
  const [editExp, setEditExp] = useState<EditExpState | null>(null);

  const { data: invoicesRes, isLoading: loadingOut } = useQuery({
    queryKey: ["invoices", "scadenze"],
    queryFn: () => invoicesApi.list(),
  });
  const invoiceList = invoicesRes?.data ?? [];

  const { data: supplierBills = [], isLoading: loadingIn } = useQuery({
    queryKey: ["supplier-bills"],
    queryFn: () => supplierBillsApi.list(),
  });

  const { data: clientExpenses = [], isLoading: loadingExp } = useQuery({
    queryKey: ["client-expenses"],
    queryFn: () => clientExpensesApi.list(),
  });

  const outgoing = useMemo(() => {
    const rows = [...invoiceList].filter((inv) => inv.dueDate);
    rows.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
    if (filter === "open") {
      return rows.filter((inv) => inv.paymentStatus !== "PAID");
    }
    return rows;
  }, [invoiceList, filter]);

  const incoming = useMemo(() => {
    const rows = [...supplierBills].sort((a, b) =>
      String(a.dueDate || "").localeCompare(String(b.dueDate || ""))
    );
    if (filter === "open") {
      return rows.filter((b) => b.status !== "PAID");
    }
    return rows;
  }, [supplierBills, filter]);

  const expenses = useMemo(() => {
    const rows = [...clientExpenses].sort((a, b) =>
      String(a.dueDate || a.expenseDate || "").localeCompare(
        String(b.dueDate || b.expenseDate || "")
      )
    );
    if (filter === "open") {
      return rows.filter((e) => e.status !== "PAID");
    }
    return rows;
  }, [clientExpenses, filter]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["supplier-bills"] });
    qc.invalidateQueries({ queryKey: ["client-expenses"] });
  };

  const saveOutMut = useMutation({
    mutationFn: () => {
      if (!editOut) throw new Error("Nessun documento");
      const balance = Number(editOut.balanceDue);
      const status =
        editOut.paymentStatus === "PAID"
          ? "PAID"
          : balance <= 0
            ? "PAID"
            : editOut.paymentStatus;
      return invoicesApi.update(editOut.invoice.id, {
        dueDate: editOut.dueDate ? toIsoDate(editOut.dueDate) : null,
        balanceDue: Math.max(0, balance || 0),
        paymentStatus: status,
        depositAmount:
          status === "PAID"
            ? Number(editOut.invoice.total) || 0
            : Number(editOut.invoice.depositAmount) || 0,
      });
    },
    onSuccess: () => {
      invalidate();
      setEditOut(null);
      setBanner("Scadenza cliente aggiornata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  const markOutPaidMut = useMutation({
    mutationFn: (inv: Invoice) =>
      invoicesApi.update(inv.id, {
        paymentStatus: "PAID",
        balanceDue: 0,
        depositAmount: Number(inv.total) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setBanner("Documento cliente segnato come pagato.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore"),
  });

  const saveInMut = useMutation({
    mutationFn: async () => {
      if (!editIn) throw new Error("Nessuna ricevuta");
      const amount = Number(editIn.amount) || 0;
      const vatAmount = Number(editIn.vatAmount) || 0;
      const total = Number(editIn.total) || amount + vatAmount;
      const paidAmount = Number(editIn.paidAmount) || 0;
      const payload = {
        supplierName: editIn.supplierName.trim(),
        description: editIn.description.trim() || undefined,
        invoiceDate: toIsoDate(editIn.invoiceDate) || undefined,
        dueDate: editIn.dueDate ? toIsoDate(editIn.dueDate) : null,
        amount,
        vatAmount,
        total,
        paidAmount,
        status: editIn.status,
        reference: editIn.reference.trim() || undefined,
        notes: editIn.notes.trim() || undefined,
      };
      const saved = editIn.bill
        ? await supplierBillsApi.update(editIn.bill.id, payload)
        : await supplierBillsApi.create(payload);
      if (editIn.file) {
        await supplierBillsApi.uploadDocument(saved.id, editIn.file);
      }
      return saved;
    },
    onSuccess: () => {
      invalidate();
      setEditIn(null);
      setBanner("Ricevuta fornitore salvata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  const markInPaidMut = useMutation({
    mutationFn: (bill: SupplierBill) =>
      supplierBillsApi.update(bill.id, {
        status: "PAID",
        paidAmount: Number(bill.total) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setBanner("Ricevuta fornitore segnata come pagata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore"),
  });

  const deleteInMut = useMutation({
    mutationFn: (id: string) => supplierBillsApi.delete(id),
    onSuccess: () => {
      invalidate();
      setBanner("Ricevuta eliminata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  const saveExpMut = useMutation({
    mutationFn: async () => {
      if (!editExp) throw new Error("Nessuna spesa");
      if (!editExp.clientName.trim()) throw new Error("Cliente obbligatorio");
      const amount = Number(editExp.amount) || 0;
      const vatAmount = Number(editExp.vatAmount) || 0;
      const total = Number(editExp.total) || amount + vatAmount;
      const paidAmount = Number(editExp.paidAmount) || 0;
      const payload = {
        clientId: editExp.clientId || null,
        clientName: editExp.clientName.trim(),
        category: editExp.category.trim() || undefined,
        description: editExp.description.trim() || undefined,
        expenseDate: toIsoDate(editExp.expenseDate) || undefined,
        dueDate: editExp.dueDate ? toIsoDate(editExp.dueDate) : null,
        amount,
        vatAmount,
        total,
        paidAmount,
        status: editExp.status,
        reference: editExp.reference.trim() || undefined,
        notes: editExp.notes.trim() || undefined,
      };
      const saved = editExp.expense
        ? await clientExpensesApi.update(editExp.expense.id, payload)
        : await clientExpensesApi.create(payload);
      if (editExp.file) {
        await clientExpensesApi.uploadDocument(saved.id, editExp.file);
      }
      return saved;
    },
    onSuccess: () => {
      invalidate();
      setEditExp(null);
      setBanner("Spesa cliente salvata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore salvataggio"),
  });

  const markExpPaidMut = useMutation({
    mutationFn: (expense: ClientExpense) =>
      clientExpensesApi.update(expense.id, {
        status: "PAID",
        paidAmount: Number(expense.total) || 0,
      }),
    onSuccess: () => {
      invalidate();
      setBanner("Spesa cliente segnata come pagata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore"),
  });

  const deleteExpMut = useMutation({
    mutationFn: (id: string) => clientExpensesApi.delete(id),
    onSuccess: () => {
      invalidate();
      setBanner("Spesa eliminata.");
    },
    onError: (e: unknown) =>
      setBanner(e instanceof Error ? e.message : "Errore eliminazione"),
  });

  function openEditOut(inv: Invoice) {
    setBanner("");
    setEditOut({
      invoice: inv,
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : "",
      balanceDue: String(Number(inv.balanceDue) || 0),
      paymentStatus: inv.paymentStatus || "UNPAID",
    });
  }

  function openEditIn(bill?: SupplierBill) {
    setBanner("");
    if (!bill) {
      setEditIn(emptyBillForm());
      return;
    }
    setEditIn({
      bill,
      supplierName: bill.supplierName,
      description: bill.description || "",
      dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : "",
      invoiceDate: bill.invoiceDate
        ? bill.invoiceDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      amount: String(Number(bill.amount) || 0),
      vatAmount: String(Number(bill.vatAmount) || 0),
      total: String(Number(bill.total) || 0),
      paidAmount: String(Number(bill.paidAmount) || 0),
      status: bill.status,
      reference: bill.reference || "",
      notes: bill.notes || "",
      file: null,
    });
  }

  function openEditExp(expense?: ClientExpense) {
    setBanner("");
    if (!expense) {
      setEditExp(emptyExpenseForm());
      return;
    }
    setEditExp({
      expense,
      clientId: expense.clientId || "",
      clientName: expense.clientName || "",
      category: expense.category || "",
      description: expense.description || "",
      expenseDate: expense.expenseDate
        ? expense.expenseDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: expense.dueDate ? expense.dueDate.slice(0, 10) : "",
      amount: String(Number(expense.amount) || 0),
      vatAmount: String(Number(expense.vatAmount) || 0),
      total: String(Number(expense.total) || 0),
      paidAmount: String(Number(expense.paidAmount) || 0),
      status: expense.status,
      reference: expense.reference || "",
      notes: expense.notes || "",
      file: null,
    });
  }

  return (
    <>
      <IeHeader title="Scadenze" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-sm text-slate-400">
            Qui gestisci le scadenze operative: documenti da incassare dai
            clienti, ricevute da pagare ai fornitori e spese clienti.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filter === "open" ? "default" : "outline"}
              onClick={() => setFilter("open")}
            >
              Solo aperte
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Tutte
            </Button>
            {tab === "in" && (
              <Button size="sm" onClick={() => openEditIn()}>
                <Plus className="h-4 w-4" /> Nuova ricevuta
              </Button>
            )}
            {tab === "exp" && (
              <Button size="sm" onClick={() => openEditExp()}>
                <Plus className="h-4 w-4" /> Nuova spesa
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === "out"
                ? "bg-amber-500/15 text-amber-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setTab("out")}
          >
            Clienti documenti in uscita · {outgoing.length}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === "in"
                ? "bg-sky-500/15 text-sky-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setTab("in")}
          >
            Fornitori ricevute · {incoming.length}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === "exp"
                ? "bg-violet-500/15 text-violet-200"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
            onClick={() => setTab("exp")}
          >
            Spese clienti · {expenses.length}
          </button>
        </div>

        {banner && (
          <p className="rounded-lg border border-sky-800/50 bg-sky-950/40 px-3 py-2 text-sm text-sky-100">
            {banner}
          </p>
        )}

        {tab === "out" && (
          <section className="space-y-3">
            {loadingOut ? (
              <p className="text-slate-400">Caricamento…</p>
            ) : outgoing.length === 0 ? (
              <p className="text-slate-500">
                Nessuna scadenza cliente
                {filter === "open" ? " aperta" : ""}.
              </p>
            ) : (
              outgoing.map((inv) => (
                <Card
                  key={inv.id}
                  className="border-slate-800 bg-slate-900/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {inv.number || "—"}
                        </span>
                        {clientName(inv)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          statusTone[inv.paymentStatus || "UNPAID"]
                        )}
                      >
                        {paymentStatusLabels[inv.paymentStatus || ""] ||
                          inv.paymentStatus}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-400">
                      Scadenza{" "}
                      <span className="text-slate-200">
                        {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                      </span>
                      {" · "}Totale {formatCurrency(Number(inv.total) || 0)}
                      {" · "}Residuo{" "}
                      {formatCurrency(Number(inv.balanceDue) || 0)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inv.paymentStatus !== "PAID" && (
                        <Button
                          size="sm"
                          disabled={markOutPaidMut.isPending}
                          onClick={() => markOutPaidMut.mutate(inv)}
                        >
                          <Check className="h-4 w-4" /> Segna pagato
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
                        onClick={() => openEditOut(inv)}
                      >
                        <Pencil className="h-4 w-4" /> Modifica
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={routes.invoice(inv.id)}>Apri documento</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}

        {tab === "in" && (
          <section className="space-y-3">
            {loadingIn ? (
              <p className="text-slate-400">Caricamento…</p>
            ) : incoming.length === 0 ? (
              <p className="text-slate-500">
                Nessuna ricevuta fornitore
                {filter === "open" ? " aperta" : ""}. Crea la prima con
                “Nuova ricevuta”.
              </p>
            ) : (
              incoming.map((bill) => (
                <Card
                  key={bill.id}
                  className="border-slate-800 bg-slate-900/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {bill.number}
                        </span>
                        {bill.supplierName}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          statusTone[bill.status]
                        )}
                      >
                        {billStatusLabels[bill.status] || bill.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-400">
                      {bill.description ? `${bill.description} · ` : ""}
                      Scadenza{" "}
                      <span className="text-slate-200">
                        {bill.dueDate ? formatDate(bill.dueDate) : "—"}
                      </span>
                      {" · "}Totale {formatCurrency(Number(bill.total) || 0)}
                      {Number(bill.paidAmount) > 0 && (
                        <>
                          {" · "}Pagato{" "}
                          {formatCurrency(Number(bill.paidAmount) || 0)}
                        </>
                      )}
                      {bill.reference ? ` · Rif. ${bill.reference}` : ""}
                    </p>
                    <DocumentLink
                      filePath={bill.filePath}
                      fileName={bill.fileName}
                    />
                    <div className="flex flex-wrap gap-2">
                      {bill.status !== "PAID" && (
                        <Button
                          size="sm"
                          disabled={markInPaidMut.isPending}
                          onClick={() => markInPaidMut.mutate(bill)}
                        >
                          <Check className="h-4 w-4" /> Segna pagata
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
                        onClick={() => openEditIn(bill)}
                      >
                        <Pencil className="h-4 w-4" /> Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-300 hover:text-red-200"
                        disabled={deleteInMut.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Eliminare la ricevuta ${bill.number}?`
                            )
                          ) {
                            deleteInMut.mutate(bill.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Elimina
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}

        {tab === "exp" && (
          <section className="space-y-3">
            {loadingExp ? (
              <p className="text-slate-400">Caricamento…</p>
            ) : expenses.length === 0 ? (
              <p className="text-slate-500">
                Nessuna spesa cliente
                {filter === "open" ? " aperta" : ""}. Crea la prima con
                “Nuova spesa”.
              </p>
            ) : (
              expenses.map((expense) => (
                <Card
                  key={expense.id}
                  className="border-slate-800 bg-slate-900/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base text-slate-100">
                      <span>
                        <span className="mr-2 font-mono text-xs text-slate-500">
                          {expense.number}
                        </span>
                        {expense.clientName}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs",
                          statusTone[expense.status]
                        )}
                      >
                        {billStatusLabels[expense.status] || expense.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-400">
                      {expense.category ? `${expense.category} · ` : ""}
                      {expense.description ? `${expense.description} · ` : ""}
                      Data{" "}
                      <span className="text-slate-200">
                        {formatDate(expense.expenseDate)}
                      </span>
                      {" · "}Scadenza{" "}
                      <span className="text-slate-200">
                        {expense.dueDate ? formatDate(expense.dueDate) : "—"}
                      </span>
                      {" · "}Totale{" "}
                      {formatCurrency(Number(expense.total) || 0)}
                      {Number(expense.paidAmount) > 0 && (
                        <>
                          {" · "}Pagato{" "}
                          {formatCurrency(Number(expense.paidAmount) || 0)}
                        </>
                      )}
                      {expense.reference ? ` · Rif. ${expense.reference}` : ""}
                    </p>
                    <DocumentLink
                      filePath={expense.filePath}
                      fileName={expense.fileName}
                    />
                    <div className="flex flex-wrap gap-2">
                      {expense.status !== "PAID" && (
                        <Button
                          size="sm"
                          disabled={markExpPaidMut.isPending}
                          onClick={() => markExpPaidMut.mutate(expense)}
                        >
                          <Check className="h-4 w-4" /> Segna pagata
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white"
                        onClick={() => openEditExp(expense)}
                      >
                        <Pencil className="h-4 w-4" /> Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-300 hover:text-red-200"
                        disabled={deleteExpMut.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Eliminare la spesa ${expense.number}?`
                            )
                          ) {
                            deleteExpMut.mutate(expense.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Elimina
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}
      </div>

      <Dialog open={!!editOut} onOpenChange={(o) => !o && setEditOut(null)}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Modifica scadenza cliente</DialogTitle>
          </DialogHeader>
          {editOut && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {editOut.invoice.number} — {clientName(editOut.invoice)}
              </p>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Data scadenza
                </label>
                <Input
                  type="date"
                  value={editOut.dueDate}
                  onChange={(e) =>
                    setEditOut({ ...editOut, dueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Residuo da incassare (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editOut.balanceDue}
                  onChange={(e) =>
                    setEditOut({ ...editOut, balanceDue: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Stato pagamento
                </label>
                <select
                  className={appSelectClass}
                  value={editOut.paymentStatus}
                  onChange={(e) =>
                    setEditOut({ ...editOut, paymentStatus: e.target.value })
                  }
                >
                  {Object.entries(paymentStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOut(null)}>
              Annulla
            </Button>
            <Button
              disabled={saveOutMut.isPending}
              onClick={() => saveOutMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editIn} onOpenChange={(o) => !o && setEditIn(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editIn?.bill
                ? "Modifica ricevuta fornitore"
                : "Nuova ricevuta fornitore"}
            </DialogTitle>
          </DialogHeader>
          {editIn && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Fornitore *
                </label>
                <Input
                  value={editIn.supplierName}
                  onChange={(e) =>
                    setEditIn({ ...editIn, supplierName: e.target.value })
                  }
                  placeholder="Ragione sociale fornitore"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Descrizione
                </label>
                <Input
                  value={editIn.description}
                  onChange={(e) =>
                    setEditIn({ ...editIn, description: e.target.value })
                  }
                  placeholder="Cosa riguarda la ricevuta"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Data documento
                </label>
                <Input
                  type="date"
                  value={editIn.invoiceDate}
                  onChange={(e) =>
                    setEditIn({ ...editIn, invoiceDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Scadenza pagamento
                </label>
                <Input
                  type="date"
                  value={editIn.dueDate}
                  onChange={(e) =>
                    setEditIn({ ...editIn, dueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Imponibile (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editIn.amount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    const vat = Number(editIn.vatAmount) || 0;
                    setEditIn({
                      ...editIn,
                      amount,
                      total: String((Number(amount) || 0) + vat),
                    });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  IVA (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editIn.vatAmount}
                  onChange={(e) => {
                    const vatAmount = e.target.value;
                    setEditIn({
                      ...editIn,
                      vatAmount,
                      total: String(
                        (Number(editIn.amount) || 0) + (Number(vatAmount) || 0)
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Totale (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editIn.total}
                  onChange={(e) =>
                    setEditIn({ ...editIn, total: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Già pagato (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editIn.paidAmount}
                  onChange={(e) =>
                    setEditIn({ ...editIn, paidAmount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Stato
                </label>
                <select
                  className={appSelectClass}
                  value={editIn.status}
                  onChange={(e) =>
                    setEditIn({ ...editIn, status: e.target.value })
                  }
                >
                  {Object.entries(billStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Riferimento fattura
                </label>
                <Input
                  value={editIn.reference}
                  onChange={(e) =>
                    setEditIn({ ...editIn, reference: e.target.value })
                  }
                  placeholder="es. FT-123"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Note
                </label>
                <Input
                  value={editIn.notes}
                  onChange={(e) =>
                    setEditIn({ ...editIn, notes: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Documento (PDF / immagine)
                </label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setEditIn({
                      ...editIn,
                      file: e.target.files?.[0] ?? null,
                    })
                  }
                />
                {editIn.bill?.filePath && !editIn.file && (
                  <p className="mt-1 text-xs text-slate-500">
                    Documento attuale: {editIn.bill.fileName || "allegato"}
                  </p>
                )}
                {editIn.file && (
                  <p className="mt-1 text-xs text-slate-400">
                    Nuovo file: {editIn.file.name}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIn(null)}>
              Annulla
            </Button>
            <Button
              disabled={saveInMut.isPending || !editIn?.supplierName.trim()}
              onClick={() => saveInMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExp} onOpenChange={(o) => !o && setEditExp(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto overflow-visible">
          <DialogHeader>
            <DialogTitle>
              {editExp?.expense ? "Modifica spesa cliente" : "Nuova spesa cliente"}
            </DialogTitle>
          </DialogHeader>
          {editExp && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Cliente *
                </label>
                <ClientSearchSelect
                  value={editExp.clientId}
                  onChange={(id, client) =>
                    setEditExp({
                      ...editExp,
                      clientId: id,
                      clientName: client
                        ? clientLabel(client)
                        : editExp.clientName,
                    })
                  }
                  placeholder="Cerca o seleziona cliente…"
                />
                <Input
                  value={editExp.clientName}
                  onChange={(e) =>
                    setEditExp({ ...editExp, clientName: e.target.value })
                  }
                  placeholder="Nome cliente (obbligatorio)"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Categoria
                </label>
                <Input
                  value={editExp.category}
                  onChange={(e) =>
                    setEditExp({ ...editExp, category: e.target.value })
                  }
                  placeholder="es. Materiale, Trasporto"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Riferimento
                </label>
                <Input
                  value={editExp.reference}
                  onChange={(e) =>
                    setEditExp({ ...editExp, reference: e.target.value })
                  }
                  placeholder="es. SP-123"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Descrizione
                </label>
                <Input
                  value={editExp.description}
                  onChange={(e) =>
                    setEditExp({ ...editExp, description: e.target.value })
                  }
                  placeholder="Di cosa si tratta"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Data spesa
                </label>
                <Input
                  type="date"
                  value={editExp.expenseDate}
                  onChange={(e) =>
                    setEditExp({ ...editExp, expenseDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Scadenza pagamento
                </label>
                <Input
                  type="date"
                  value={editExp.dueDate}
                  onChange={(e) =>
                    setEditExp({ ...editExp, dueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Imponibile (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editExp.amount}
                  onChange={(e) => {
                    const amount = e.target.value;
                    const vat = Number(editExp.vatAmount) || 0;
                    setEditExp({
                      ...editExp,
                      amount,
                      total: String((Number(amount) || 0) + vat),
                    });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  IVA (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editExp.vatAmount}
                  onChange={(e) => {
                    const vatAmount = e.target.value;
                    setEditExp({
                      ...editExp,
                      vatAmount,
                      total: String(
                        (Number(editExp.amount) || 0) +
                          (Number(vatAmount) || 0)
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Totale (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editExp.total}
                  onChange={(e) =>
                    setEditExp({ ...editExp, total: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Già pagato (€)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editExp.paidAmount}
                  onChange={(e) =>
                    setEditExp({ ...editExp, paidAmount: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Stato
                </label>
                <select
                  className={appSelectClass}
                  value={editExp.status}
                  onChange={(e) =>
                    setEditExp({ ...editExp, status: e.target.value })
                  }
                >
                  {Object.entries(billStatusLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Note
                </label>
                <Input
                  value={editExp.notes}
                  onChange={(e) =>
                    setEditExp({ ...editExp, notes: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Documento (PDF / immagine)
                </label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) =>
                    setEditExp({
                      ...editExp,
                      file: e.target.files?.[0] ?? null,
                    })
                  }
                />
                {editExp.expense?.filePath && !editExp.file && (
                  <p className="mt-1 text-xs text-slate-500">
                    Documento attuale:{" "}
                    {editExp.expense.fileName || "allegato"}
                  </p>
                )}
                {editExp.file && (
                  <p className="mt-1 text-xs text-slate-400">
                    Nuovo file: {editExp.file.name}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditExp(null)}>
              Annulla
            </Button>
            <Button
              disabled={
                saveExpMut.isPending || !editExp?.clientName.trim()
              }
              onClick={() => saveExpMut.mutate()}
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
