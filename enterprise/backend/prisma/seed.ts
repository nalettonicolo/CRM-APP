import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MODULES = [
  "projects",
  "tasks",
  "time_entries",
  "chat",
  "docs",
  "whiteboards",
  "automations",
  "reports",
  "roles",
  "audit_logs",
];

async function main() {
  console.log("Seed gestionale enterprise…");

  const org = await prisma.organization.upsert({
    where: { slug: "nicolo-service" },
    update: {},
    create: { name: "Nicolò Service", slug: "nicolo-service" },
  });

  const ownerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Owner" } },
    update: {},
    create: { organizationId: org.id, name: "Owner", isSystem: true },
  });
  const memberRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Membro" } },
    update: {},
    create: { organizationId: org.id, name: "Membro", isSystem: true },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: memberRole.id } });
  await prisma.rolePermission.createMany({
    data: MODULES.filter((m) => m !== "roles" && m !== "audit_logs").flatMap((module) => [
      { roleId: memberRole.id, module, action: "READ" },
      { roleId: memberRole.id, module, action: "WRITE" },
    ]),
  });

  const passwordHash = await bcrypt.hash("password123", 12);
  const owner = await prisma.user.upsert({
    where: { email: "admin@nicoloservice.it" },
    update: {},
    create: {
      email: "admin@nicoloservice.it",
      passwordHash,
      firstName: "Nicolò",
      lastName: "Admin",
      avatarColor: "#7C5CFC",
    },
  });
  const tecnico = await prisma.user.upsert({
    where: { email: "tecnico@nicoloservice.it" },
    update: {},
    create: {
      email: "tecnico@nicoloservice.it",
      passwordHash,
      firstName: "Marco",
      lastName: "Tecnico",
      avatarColor: "#22C55E",
    },
  });

  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: owner.id } },
    update: {},
    create: { organizationId: org.id, userId: owner.id, roleId: ownerRole.id },
  });
  await prisma.membership.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: tecnico.id } },
    update: {},
    create: { organizationId: org.id, userId: tecnico.id, roleId: memberRole.id },
  });

  const existingProject = await prisma.project.findFirst({ where: { organizationId: org.id } });
  if (!existingProject) {
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: "Impianti Q4 2026",
        description: "Commesse impiantistica elettrica in corso nel trimestre",
        columns: {
          create: [
            { name: "Da fare", order: 0 },
            { name: "In corso", order: 1 },
            { name: "Revisione", order: 2 },
            { name: "Fatto", order: 3, isDoneColumn: true },
          ],
        },
      },
      include: { columns: true },
    });

    const todo = project.columns.find((c) => c.order === 0)!;
    const inProgress = project.columns.find((c) => c.order === 1)!;

    await prisma.task.createMany({
      data: [
        {
          projectId: project.id,
          columnId: todo.id,
          title: "Sopralluogo cliente Rossi Srl",
          priority: "HIGH",
          creatorId: owner.id,
          assigneeId: tecnico.id,
          order: 0,
        },
        {
          projectId: project.id,
          columnId: todo.id,
          title: "Preventivo impianto antifurto Ajax",
          priority: "MEDIUM",
          creatorId: owner.id,
          order: 1,
        },
        {
          projectId: project.id,
          columnId: inProgress.id,
          title: "Installazione quadro elettrico — Via Roma 12",
          priority: "URGENT",
          creatorId: owner.id,
          assigneeId: tecnico.id,
          order: 0,
        },
      ],
    });

    await prisma.chatChannel.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "generale" } },
      update: {},
      create: {
        organizationId: org.id,
        name: "generale",
        members: { create: [{ userId: owner.id }, { userId: tecnico.id }] },
      },
    });

    await prisma.doc.create({
      data: {
        organizationId: org.id,
        title: "Procedure di sicurezza cantiere",
        contentHtml: "<h2>Procedure</h2><p>Documento di esempio per il modulo Docs/Wiki.</p>",
        authorId: owner.id,
      },
    });
  }

  console.log("Seed completato.");
  console.log("Login demo: admin@nicoloservice.it / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
