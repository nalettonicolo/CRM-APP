// Dati demo usati come fallback quando l'API backend non è raggiungibile,
// così le schermate sono visivamente complete anche prima di collegare il
// database (vedi lib/api.ts). Rispecchiano lo shape restituito dalle API reali.

import type { BoardColumn } from "@/components/KanbanBoard";

export const mockUser = {
  id: "u1",
  firstName: "Nicolò",
  lastName: "Admin",
  email: "admin@nicoloservice.it",
  avatarColor: "#7C5CFC",
};

export const mockTeam = [
  { membershipId: "m1", userId: "u1", firstName: "Nicolò", lastName: "Admin", avatarColor: "#7C5CFC", role: { id: "r1", name: "Owner" } },
  { membershipId: "m2", userId: "u2", firstName: "Marco", lastName: "Tecnico", avatarColor: "#22C55E", role: { id: "r2", name: "Membro" } },
  { membershipId: "m3", userId: "u3", firstName: "Giulia", lastName: "Amministrazione", avatarColor: "#F5A524", role: { id: "r2", name: "Membro" } },
];

export const mockKpis = {
  activeProjects: 4,
  openTasks: 18,
  overdueTasks: 3,
  hoursLast30Days: 132.5,
  taskByStatus: [
    { status: "TODO", count: 7 },
    { status: "IN_PROGRESS", count: 6 },
    { status: "IN_REVIEW", count: 2 },
    { status: "DONE", count: 14 },
    { status: "BLOCKED", count: 1 },
  ],
  taskByPriority: [
    { priority: "LOW", count: 5 },
    { priority: "MEDIUM", count: 11 },
    { priority: "HIGH", count: 7 },
    { priority: "URGENT", count: 3 },
  ],
};

export const mockTimeByUser = [
  { name: "Nicolò Admin", hours: 52.5 },
  { name: "Marco Tecnico", hours: 61 },
  { name: "Giulia Amministrazione", hours: 19 },
];

export const mockProjects = [
  { id: "p1", name: "Impianti Q4 2026", description: "Commesse impiantistica elettrica in corso nel trimestre", color: "#7C5CFC", _count: { tasks: 12 } },
  { id: "p2", name: "Antifurti Ajax — rollout clienti", description: "Installazioni e configurazioni sistemi antifurto", color: "#3ED9D9", _count: { tasks: 8 } },
  { id: "p3", name: "Rinnovo sito e area clienti", description: "Refactor area cliente self-service", color: "#F5A524", _count: { tasks: 5 } },
];

export const mockBoard: { id: string; name: string; description: string; columns: BoardColumn[] } = {
  id: "p1",
  name: "Impianti Q4 2026",
  description: "Commesse impiantistica elettrica in corso nel trimestre",
  columns: [
    {
      id: "c1",
      name: "Da fare",
      order: 0,
      isDoneColumn: false,
      tasks: [
        { id: "t1", title: "Sopralluogo cliente Rossi Srl", priority: "HIGH", status: "TODO", assignee: mockTeam[1], checklistItems: [], subtasks: [] },
        { id: "t2", title: "Preventivo impianto antifurto Ajax", priority: "MEDIUM", status: "TODO", assignee: null, checklistItems: [], subtasks: [] },
        { id: "t3", title: "Ordine materiali quadro elettrico", priority: "LOW", status: "TODO", assignee: mockTeam[2], checklistItems: [], subtasks: [] },
      ],
    },
    {
      id: "c2",
      name: "In corso",
      order: 1,
      isDoneColumn: false,
      tasks: [
        { id: "t4", title: "Installazione quadro elettrico — Via Roma 12", priority: "URGENT", status: "IN_PROGRESS", assignee: mockTeam[1], checklistItems: [{ id: "ck1", label: "Materiali consegnati", done: true }, { id: "ck2", label: "Collaudo", done: false }], subtasks: [] },
        { id: "t5", title: "Configurazione centralina Ajax Hub 2", priority: "MEDIUM", status: "IN_PROGRESS", assignee: mockTeam[2], checklistItems: [], subtasks: [] },
      ],
    },
    {
      id: "c3",
      name: "Revisione",
      order: 2,
      isDoneColumn: false,
      tasks: [
        { id: "t6", title: "Verifica documentazione DICO impianto", priority: "HIGH", status: "IN_REVIEW", assignee: mockTeam[0], checklistItems: [], subtasks: [] },
      ],
    },
    {
      id: "c4",
      name: "Fatto",
      order: 3,
      isDoneColumn: true,
      tasks: [
        { id: "t7", title: "Fatturazione commessa Bianchi", priority: "MEDIUM", status: "DONE", assignee: mockTeam[0], checklistItems: [], subtasks: [] },
        { id: "t8", title: "Sopralluogo magazzino centrale", priority: "LOW", status: "DONE", assignee: mockTeam[1], checklistItems: [], subtasks: [] },
      ],
    },
  ],
};

export const mockChannels = [
  { id: "ch1", name: "generale", isPrivate: false, _count: { members: 3, messages: 24 } },
  { id: "ch2", name: "cantieri", isPrivate: false, _count: { members: 2, messages: 11 } },
  { id: "ch3", name: "amministrazione", isPrivate: true, _count: { members: 2, messages: 6 } },
];

export const mockMessages = [
  { id: "msg1", body: "Il quadro elettrico di Via Roma è pronto per il collaudo.", createdAt: new Date().toISOString(), author: { firstName: "Marco", lastName: "Tecnico", avatarColor: "#22C55E" } },
  { id: "msg2", body: "Perfetto, passo domattina alle 9.", createdAt: new Date().toISOString(), author: { firstName: "Nicolò", lastName: "Admin", avatarColor: "#7C5CFC" } },
  { id: "msg3", body: "Aggiornato il preventivo Ajax con lo sconto cliente fedeltà.", createdAt: new Date().toISOString(), author: { firstName: "Giulia", lastName: "Amministrazione", avatarColor: "#F5A524" } },
];

export const mockDocs = [
  { id: "d1", title: "Procedure di sicurezza cantiere", parentDocId: null, updatedAt: new Date().toISOString(), author: { firstName: "Nicolò", lastName: "Admin" } },
  { id: "d2", title: "Checklist collaudo impianto elettrico", parentDocId: null, updatedAt: new Date().toISOString(), author: { firstName: "Marco", lastName: "Tecnico" } },
  { id: "d3", title: "Listino fornitori Ajax", parentDocId: null, updatedAt: new Date().toISOString(), author: { firstName: "Giulia", lastName: "Amministrazione" } },
];

export const mockAutomations = [
  { id: "a1", name: "Assegna urgenti a Marco", triggerType: "task.created", actionType: "task.assign", isActive: true, _count: { runLogs: 14 } },
  { id: "a2", name: "Notifica quando task passa In Revisione", triggerType: "task.status_changed", actionType: "notification.send", isActive: true, _count: { runLogs: 8 } },
];

export const mockAuditLogs = [
  { id: "al1", action: "task.moved", entityType: "Task", createdAt: new Date().toISOString(), user: { firstName: "Marco", lastName: "Tecnico", email: "tecnico@nicoloservice.it" } },
  { id: "al2", action: "role.permissions_updated", entityType: "Role", createdAt: new Date().toISOString(), user: { firstName: "Nicolò", lastName: "Admin", email: "admin@nicoloservice.it" } },
  { id: "al3", action: "project.created", entityType: "Project", createdAt: new Date().toISOString(), user: { firstName: "Nicolò", lastName: "Admin", email: "admin@nicoloservice.it" } },
];

export const mockRoles = [
  { id: "r1", name: "Owner", isSystem: true, permissions: [], _count: { memberships: 1 } },
  { id: "r2", name: "Membro", isSystem: true, permissions: [{ module: "projects", action: "READ" }, { module: "projects", action: "WRITE" }], _count: { memberships: 2 } },
];
