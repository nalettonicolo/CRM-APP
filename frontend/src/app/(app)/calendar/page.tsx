"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { eventsApi } from "@/lib/api";

export default function CalendarPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("APPOINTMENT");
  const [startAt, setStartAt] = useState("");
  const qc = useQueryClient();

  const createMut = useMutation({
    mutationFn: () =>
      eventsApi.create({
        title,
        type,
        startAt: new Date(startAt).toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      setOpen(false);
      setTitle("");
      setStartAt("");
    },
  });

  return (
    <>
      <Header title="Calendario" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo evento
          </Button>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <MonthCalendar />
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Titolo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="APPOINTMENT">Appuntamento</option>
              <option value="INTERVENTION">Intervento</option>
              <option value="MEETING">Riunione</option>
              <option value="DEADLINE">Scadenza</option>
              <option value="REMINDER">Promemoria</option>
              <option value="OTHER">Altro</option>
            </select>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button
              disabled={!title || !startAt || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              Crea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
