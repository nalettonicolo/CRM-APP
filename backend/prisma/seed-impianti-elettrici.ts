import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * Seed demo Impianti Elettrici (clienti, documenti, scadenze, fornitori).
 * Idempotente: riusa ID fissi prefissati `ie-demo-`.
 *
 * DATABASE_URL = IE DB
 * DATABASE_URL_CRM = CRM DB (per copiare l'admin)
 */
const ie = new PrismaClient();
const crmUrl = process.env.DATABASE_URL_CRM?.trim();
const crm = crmUrl
  ? new PrismaClient({ datasources: { db: { url: crmUrl } } })
  : null;

function daysFromNow(n: number) {
  const x = new Date();
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x;
}

/** Blocco giornata lavorativa 08:00–18:00 sul calendario condiviso. */
function workBlock(dayOffset: number) {
  const startAt = daysFromNow(dayOffset);
  startAt.setHours(8, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setHours(18, 0, 0, 0);
  return { startAt, endAt };
}

function deadlineBlock(dayOffset: number) {
  const startAt = daysFromNow(dayOffset);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setHours(10, 0, 0, 0);
  return { startAt, endAt };
}

async function ensureAdmin() {
  if (crm) {
    const admin = await crm.user.findFirst({
      where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (admin) {
      await ie.user.upsert({
        where: { id: admin.id },
        create: {
          id: admin.id,
          email: admin.email,
          passwordHash: admin.passwordHash,
          firstName: admin.firstName,
          lastName: admin.lastName,
          phone: admin.phone,
          role: admin.role,
          status: admin.status,
        },
        update: {
          email: admin.email,
          passwordHash: admin.passwordHash,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          status: admin.status,
        },
      });
      return admin.id;
    }
  }

  const existing = await ie.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });
  if (existing) return existing.id;

  const created = await ie.user.create({
    data: {
      id: "ie-demo-admin",
      email: "admin@ie.local",
      passwordHash: "$2b$12$placeholderhashnotusablelogin",
      firstName: "Admin",
      lastName: "IE",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  return created.id;
}

async function main() {
  console.log("🌱 Seed demo Impianti Elettrici...");

  const adminId = await ensureAdmin();
  console.log(`  ✓ Admin actor: ${adminId}`);

  let warehouse = await ie.warehouse.findFirst({ where: { isDefault: true } });
  if (!warehouse) {
    warehouse = await ie.warehouse.create({
      data: { name: "Magazzino Impianti Elettrici", isDefault: true },
    });
  }

  await ie.setting.upsert({
    where: { key: "app_name" },
    create: { key: "app_name", value: { name: "Impianti Elettrici" } },
    update: { value: { name: "Impianti Elettrici" } },
  });

  // ── Clienti ──────────────────────────────────────────────────────────────
  const clients = [
    {
      id: "ie-demo-client-1",
      companyName: "Condominio Via Roma 12",
      contactName: "Amministratore Rossi",
      email: "amministratore@condominioroma.it",
      phone: "02 1234567",
      address: "Via Roma 12",
      city: "Milano",
      province: "MI",
      postalCode: "20121",
      vatNumber: "IT12345678901",
      status: "ACTIVE" as const,
      notes: "Impianto citofonico + quadro elettrico scale",
    },
    {
      id: "ie-demo-client-2",
      companyName: "Edilcasa Srl",
      contactName: "Marco Bianchi",
      email: "tecnico@edilcasa.it",
      phone: "339 1122334",
      address: "Via dell'Industria 8",
      city: "Monza",
      province: "MB",
      postalCode: "20900",
      vatNumber: "IT09876543210",
      status: "ACTIVE" as const,
      notes: "Cantiere residenziale — impianti civili",
    },
    {
      id: "ie-demo-client-3",
      companyName: null,
      firstName: "Giulia",
      lastName: "Verdi",
      contactName: "Giulia Verdi",
      email: "giulia.verdi@email.it",
      phone: "347 9988776",
      address: "Via Garibaldi 45",
      city: "Sesto San Giovanni",
      province: "MI",
      postalCode: "20099",
      fiscalCode: "VRDGLI85A41F205X",
      status: "ACTIVE" as const,
      notes: "Privato — rifacimento impianto appartamento",
    },
    {
      id: "ie-demo-client-4",
      companyName: "Officine Meccaniche Nord Spa",
      contactName: "Ufficio Tecnico",
      email: "acquisti@omnord.it",
      phone: "039 445566",
      address: "Strada Provinciale 2",
      city: "Desio",
      province: "MB",
      postalCode: "20832",
      vatNumber: "IT11223344556",
      pec: "omnord@pec.it",
      sdiCode: "M5UXCR1",
      status: "ACTIVE" as const,
      notes: "Capannone — linee trifase e illuminazione LED",
    },
    {
      id: "ie-demo-client-miatto",
      companyName: "Miatto Fabio",
      contactName: "Miatto Fabio",
      firstName: "Fabio",
      lastName: "Miatto",
      status: "ACTIVE" as const,
      notes: "Cliente reale — preventivo antifurto Ajax",
    },
  ];

  for (const c of clients) {
    await ie.client.upsert({
      where: { id: c.id },
      create: c,
      update: {
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone,
        notes: c.notes,
        status: c.status,
      },
    });
  }
  console.log(`  ✓ ${clients.length} clienti`);

  // ── Fornitori + listini ──────────────────────────────────────────────────
  const suppliers = [
    {
      id: "ie-demo-supplier-1",
      name: "ElettroGross Italia",
      email: "ordini@elettrogross.it",
      phone: "02 9876543",
      address: "Via Magazzini 1, Milano",
      notes: "Grossista materiale elettrico — sconto listino 28%",
    },
    {
      id: "ie-demo-supplier-2",
      name: "Cavi & Quadri Snc",
      email: "info@caviequadri.it",
      phone: "039 221100",
      address: "Via Artigiani 22, Monza",
      notes: "Quadri e canaline su misura",
    },
  ];
  for (const s of suppliers) {
    await ie.supplier.upsert({
      where: { id: s.id },
      create: s,
      update: { name: s.name, email: s.email, notes: s.notes },
    });
  }

  await ie.supplierCatalog.deleteMany({
    where: { id: { in: ["ie-demo-catalog-1", "ie-demo-catalog-2"] } },
  });
  await ie.supplierCatalog.create({
    data: {
      id: "ie-demo-catalog-1",
      supplierId: "ie-demo-supplier-1",
      supplierName: "ElettroGross Italia",
      title: "Listino civile 2026",
      kind: "PRICE_LIST",
      defaultDiscountPercent: 28,
      isActive: true,
      items: {
        create: [
          {
            sku: "INT-BTICINO-503",
            name: "Interruttore Bticino Living Light",
            unit: "pz",
            listPrice: 12.5,
            discountPercent: 28,
          },
          {
            sku: "CAV-FG16-3G25",
            name: "Cavo FG16OR16 3G2.5",
            unit: "m",
            listPrice: 1.85,
            discountPercent: 30,
          },
          {
            sku: "INT-DIFF-25A",
            name: "Differenziale 25A 30mA",
            unit: "pz",
            listPrice: 48.0,
            discountPercent: 25,
          },
        ],
      },
    },
  });
  await ie.supplierCatalog.create({
    data: {
      id: "ie-demo-catalog-2",
      supplierId: "ie-demo-supplier-2",
      supplierName: "Cavi & Quadri Snc",
      title: "Listino quadri e canaline",
      kind: "PRICE_LIST",
      defaultDiscountPercent: 15,
      isActive: true,
      items: {
        create: [
          {
            sku: "QDR-24M",
            name: "Quadro 24 moduli IP40",
            unit: "pz",
            listPrice: 95,
            discountPercent: 15,
          },
          {
            sku: "CAN-40X40",
            name: "Canalina 40x40 PVC",
            unit: "m",
            listPrice: 3.2,
            discountPercent: 12,
          },
        ],
      },
    },
  });
  console.log("  ✓ Fornitori e listini");

  // ── Preventivi + scadenze rate ───────────────────────────────────────────
  const quoteIds = ["ie-demo-quote-1", "ie-demo-quote-2", "ie-demo-quote-3"];
  await ie.quotePaymentTerm.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await ie.quoteItem.deleteMany({ where: { quoteId: { in: quoteIds } } });
  await ie.clientPayment.deleteMany({
    where: { id: { startsWith: "ie-demo-pay-" } },
  });
  await ie.invoicePreview.deleteMany({
    where: { id: { startsWith: "ie-demo-inv-" } },
  });
  await ie.jobDailyReport.deleteMany({
    where: { id: { startsWith: "ie-demo-rg-" } },
  });
  await ie.jobOrder.deleteMany({ where: { id: { startsWith: "ie-demo-com-" } } });
  await ie.transportDocumentLine.deleteMany({
    where: { documentId: { startsWith: "ie-demo-ddt-" } },
  });
  await ie.transportDocument.deleteMany({
    where: { id: { startsWith: "ie-demo-ddt-" } },
  });
  await ie.quote.deleteMany({ where: { id: { in: quoteIds } } });
  await ie.supplierBill.deleteMany({
    where: { id: { startsWith: "ie-demo-rf-" } },
  });
  await ie.clientExpense.deleteMany({
    where: { id: { startsWith: "ie-demo-sp-" } },
  });

  await ie.quote.create({
    data: {
      id: "ie-demo-quote-1",
      number: "PRV-2026-101",
      clientId: "ie-demo-client-1",
      createdById: adminId,
      title: "Rifacimento quadro e linee scale",
      status: "ACCEPTED",
      paymentStatus: "PARTIAL",
      subtotal: 2800,
      vatAmount: 616,
      total: 3416,
      depositAmount: 1000,
      balanceDue: 2416,
      paymentTiming: "DAYS_30",
      acceptedAt: daysFromNow(-40),
      eventLocation: "Via Roma 12, Milano",
      items: {
        create: [
          {
            type: "service",
            description: "Manodopera impianto scale (3 gg)",
            quantity: 3,
            unitPrice: 450,
            vatRate: 22,
            total: 1350,
            sortOrder: 0,
          },
          {
            type: "product",
            description: "Materiale elettrico (quadro, cavi, punti luce)",
            quantity: 1,
            unitPrice: 1450,
            vatRate: 22,
            total: 1450,
            sortOrder: 1,
          },
        ],
      },
      paymentTerms: {
        create: [
          {
            label: "Acconto all'ordine",
            amount: 1000,
            percent: 30,
            dueDate: daysFromNow(-35),
            sortOrder: 0,
          },
          {
            label: "Saldo a fine lavori",
            amount: 2416,
            percent: 70,
            isBalance: true,
            dueDate: daysFromNow(-5),
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await ie.quote.create({
    data: {
      id: "ie-demo-quote-2",
      number: "PRV-2026-102",
      clientId: "ie-demo-client-2",
      createdById: adminId,
      title: "Impianto civile cantiere Edilcasa — blocco A",
      status: "SENT",
      paymentStatus: "UNPAID",
      subtotal: 12500,
      vatAmount: 2750,
      total: 15250,
      balanceDue: 15250,
      paymentTiming: "DAYS_60",
      sentAt: daysFromNow(-10),
      validUntil: daysFromNow(20),
      eventLocation: "Cantiere Via Industria 8, Monza",
      items: {
        create: [
          {
            type: "service",
            description: "Progettazione e direzione lavori impianto",
            quantity: 1,
            unitPrice: 2500,
            vatRate: 22,
            total: 2500,
          },
          {
            type: "service",
            description: "Posa impianti civili (stimata)",
            quantity: 1,
            unitPrice: 10000,
            vatRate: 22,
            total: 10000,
          },
        ],
      },
      paymentTerms: {
        create: [
          {
            label: "30% all'accettazione",
            amount: 4575,
            percent: 30,
            dueDate: daysFromNow(15),
            sortOrder: 0,
          },
          {
            label: "Saldo a collaudo",
            amount: 10675,
            percent: 70,
            isBalance: true,
            dueDate: daysFromNow(60),
            sortOrder: 1,
          },
        ],
      },
    },
  });

  await ie.quote.create({
    data: {
      id: "ie-demo-quote-3",
      number: "PRV-2026-103",
      clientId: "ie-demo-client-3",
      createdById: adminId,
      title: "Impianto appartamento Verdi",
      status: "ACCEPTED",
      paymentStatus: "PAID",
      subtotal: 3200,
      vatAmount: 704,
      total: 3904,
      depositAmount: 3904,
      balanceDue: 0,
      paymentTiming: "AT_SIGNATURE",
      acceptedAt: daysFromNow(-60),
      items: {
        create: [
          {
            type: "service",
            description: "Rifacimento impianto 3 vani",
            quantity: 1,
            unitPrice: 3200,
            vatRate: 22,
            total: 3200,
          },
        ],
      },
      paymentTerms: {
        create: [
          {
            label: "Pagamento unico",
            amount: 3904,
            percent: 100,
            isBalance: true,
            dueDate: daysFromNow(-50),
            sortOrder: 0,
          },
        ],
      },
    },
  });
  console.log("  ✓ Preventivi e rate");

  // ── Documenti cortesia (fatture in uscita + scadenze) ─────────────────────
  await ie.invoicePreview.create({
    data: {
      id: "ie-demo-inv-1",
      number: "2026-201",
      clientId: "ie-demo-client-1",
      quoteId: "ie-demo-quote-1",
      subtotal: 2800,
      vatAmount: 616,
      total: 3416,
      depositAmount: 1000,
      balanceDue: 2416,
      paymentStatus: "PARTIAL",
      paymentTiming: "DAYS_30",
      status: "CONFIRMED",
      dueDate: daysFromNow(-5),
      eventLocation: "Via Roma 12, Milano",
      items: [
        { description: "Lavori quadro e scale", quantity: 1, unitPrice: 2800, total: 2800 },
      ],
      confirmedAt: daysFromNow(-20),
    },
  });
  await ie.invoicePreview.create({
    data: {
      id: "ie-demo-inv-2",
      number: "2026-202",
      clientId: "ie-demo-client-4",
      subtotal: 8900,
      vatAmount: 1958,
      total: 10858,
      balanceDue: 10858,
      paymentStatus: "OVERDUE",
      paymentTiming: "DAYS_30",
      status: "CONFIRMED",
      dueDate: daysFromNow(-12),
      eventLocation: "Capannone Desio",
      items: [
        {
          description: "Illuminazione LED industriale + linee trifase",
          quantity: 1,
          unitPrice: 8900,
          total: 8900,
        },
      ],
      confirmedAt: daysFromNow(-45),
      notes: "Scadenza superata — sollecito inviato",
    },
  });
  await ie.invoicePreview.create({
    data: {
      id: "ie-demo-inv-3",
      number: "2026-203",
      clientId: "ie-demo-client-2",
      quoteId: "ie-demo-quote-2",
      subtotal: 4500,
      vatAmount: 990,
      total: 5490,
      balanceDue: 5490,
      paymentStatus: "UNPAID",
      paymentTiming: "DAYS_60",
      status: "CONFIRMED",
      dueDate: daysFromNow(25),
      items: [
        {
          description: "Stato avanzamento lavori blocco A",
          quantity: 1,
          unitPrice: 4500,
          total: 4500,
        },
      ],
      confirmedAt: daysFromNow(-2),
    },
  });
  await ie.invoicePreview.create({
    data: {
      id: "ie-demo-inv-4",
      number: "2026-204",
      clientId: "ie-demo-client-3",
      quoteId: "ie-demo-quote-3",
      subtotal: 3200,
      vatAmount: 704,
      total: 3904,
      depositAmount: 3904,
      balanceDue: 0,
      paymentStatus: "PAID",
      paymentTiming: "AT_SIGNATURE",
      status: "CONFIRMED",
      dueDate: daysFromNow(-50),
      items: [
        { description: "Impianto appartamento", quantity: 1, unitPrice: 3200, total: 3200 },
      ],
      confirmedAt: daysFromNow(-55),
    },
  });
  console.log("  ✓ Documenti cortesia (scadenze in uscita)");

  await ie.clientPayment.create({
    data: {
      id: "ie-demo-pay-1",
      clientId: "ie-demo-client-1",
      quoteId: "ie-demo-quote-1",
      label: "Acconto Condominio Via Roma",
      amount: 1000,
      paidAt: daysFromNow(-30),
      method: "BANK_TRANSFER",
      reference: "BON-8821",
      createdById: adminId,
    },
  });
  await ie.clientPayment.create({
    data: {
      id: "ie-demo-pay-2",
      clientId: "ie-demo-client-3",
      quoteId: "ie-demo-quote-3",
      label: "Saldo impianto Verdi",
      amount: 3904,
      paidAt: daysFromNow(-48),
      method: "BANK_TRANSFER",
      reference: "BON-9102",
      createdById: adminId,
    },
  });

  // ── Commesse + report ────────────────────────────────────────────────────
  await ie.jobOrder.create({
    data: {
      id: "ie-demo-com-1",
      number: "COM-2026-011",
      clientId: "ie-demo-client-1",
      createdById: adminId,
      quoteId: "ie-demo-quote-1",
      title: "Quadro e scale Condominio Via Roma",
      workType: "impianto civile",
      status: "IN_PROGRESS",
      plannedStart: daysFromNow(-8),
      plannedEnd: daysFromNow(2),
      estimatedDays: 5,
      location: "Via Roma 12, Milano",
      dailyReports: {
        create: [
          {
            id: "ie-demo-rg-1",
            number: "RG-2026-031",
            authorId: adminId,
            workDate: daysFromNow(-7),
            status: "SUBMITTED",
            description: "Smontaggio vecchio quadro e predisposizione canaline",
            workHours: 8,
            submittedAt: daysFromNow(-7),
          },
          {
            id: "ie-demo-rg-2",
            number: "RG-2026-032",
            authorId: adminId,
            workDate: daysFromNow(-6),
            status: "SUBMITTED",
            description: "Posa cavi e montaggio nuovo quadro",
            workHours: 8,
            submittedAt: daysFromNow(-6),
          },
          {
            id: "ie-demo-rg-3",
            number: "RG-2026-033",
            authorId: adminId,
            workDate: daysFromNow(-3),
            status: "DRAFT",
            description: "",
            workHours: 0,
          },
        ],
      },
    },
  });
  await ie.jobOrder.create({
    data: {
      id: "ie-demo-com-2",
      number: "COM-2026-012",
      clientId: "ie-demo-client-4",
      createdById: adminId,
      title: "LED e trifase Officine Nord",
      workType: "impianto industriale",
      status: "COMPLETED",
      plannedStart: daysFromNow(-40),
      plannedEnd: daysFromNow(-35),
      estimatedDays: 4,
      location: "Desio (MB)",
      dailyReports: {
        create: [
          {
            id: "ie-demo-rg-4",
            number: "RG-2026-040",
            authorId: adminId,
            workDate: daysFromNow(-39),
            status: "APPROVED",
            description: "Cablaggio linee e plafoniere LED",
            workHours: 9,
            submittedAt: daysFromNow(-39),
          },
        ],
      },
    },
  });
  // collega invoice 1 e 2 alle commesse
  await ie.invoicePreview.update({
    where: { id: "ie-demo-inv-1" },
    data: { jobOrderId: "ie-demo-com-1" },
  });
  await ie.invoicePreview.update({
    where: { id: "ie-demo-inv-2" },
    data: { jobOrderId: "ie-demo-com-2" },
  });
  console.log("  ✓ Commesse e report giornalieri");

  // ── DDT ──────────────────────────────────────────────────────────────────
  await ie.transportDocument.create({
    data: {
      id: "ie-demo-ddt-1",
      number: "DDT-2026-0007",
      status: "ISSUED",
      clientId: "ie-demo-client-1",
      quoteId: "ie-demo-quote-1",
      createdById: adminId,
      issueDate: daysFromNow(-7),
      recipientName: "Condominio Via Roma 12",
      recipientAddress: "Via Roma 12",
      recipientCity: "Milano",
      recipientProvince: "MI",
      destinationAddress: "Via Roma 12",
      destinationCity: "Milano",
      reason: "OTHER",
      carrier: "SENDER",
      notes: "Materiale per intervento quadro",
      lines: {
        create: [
          {
            description: "Quadro 24 moduli + interruttori",
            quantity: 1,
            unit: "kit",
          },
          {
            description: "Cavo FG16 3G2.5",
            quantity: 80,
            unit: "m",
          },
        ],
      },
    },
  });
  console.log("  ✓ DDT");

  // ── Ricevute fornitori (scadenze in entrata) ──────────────────────────────
  await ie.supplierBill.createMany({
    data: [
      {
        id: "ie-demo-rf-1",
        number: "RF-2026-001",
        supplierId: "ie-demo-supplier-1",
        supplierName: "ElettroGross Italia",
        description: "Ordine materiale civile — bolla 45821",
        invoiceDate: daysFromNow(-40),
        dueDate: daysFromNow(-10),
        amount: 1850,
        vatAmount: 407,
        total: 2257,
        paidAmount: 0,
        status: "OVERDUE",
        reference: "FT-EG-45821",
        notes: "Sollecito ricevuto il " + daysFromNow(-2).toLocaleDateString("it-IT"),
      },
      {
        id: "ie-demo-rf-2",
        number: "RF-2026-002",
        supplierId: "ie-demo-supplier-2",
        supplierName: "Cavi & Quadri Snc",
        description: "Quadri e canaline cantiere Edilcasa",
        invoiceDate: daysFromNow(-5),
        dueDate: daysFromNow(20),
        amount: 620,
        vatAmount: 136.4,
        total: 756.4,
        paidAmount: 0,
        status: "UNPAID",
        reference: "FT-CQ-1203",
      },
      {
        id: "ie-demo-rf-3",
        number: "RF-2026-003",
        supplierId: "ie-demo-supplier-1",
        supplierName: "ElettroGross Italia",
        description: "Materiale LED industriale",
        invoiceDate: daysFromNow(-50),
        dueDate: daysFromNow(-25),
        amount: 3200,
        vatAmount: 704,
        total: 3904,
        paidAmount: 3904,
        status: "PAID",
        paidAt: daysFromNow(-20),
        reference: "FT-EG-44110",
      },
      {
        id: "ie-demo-rf-4",
        number: "RF-2026-004",
        supplierId: "ie-demo-supplier-2",
        supplierName: "Cavi & Quadri Snc",
        description: "Anticipo lavorazione quadro custom",
        invoiceDate: daysFromNow(-3),
        dueDate: daysFromNow(12),
        amount: 400,
        vatAmount: 88,
        total: 488,
        paidAmount: 200,
        status: "PARTIAL",
        reference: "FT-CQ-1210",
      },
    ],
  });
  console.log("  ✓ Ricevute fornitori (scadenze in entrata)");

  // ── Documenti PDF demo (minimi) su ricevute + spese clienti ───────────────
  const uploadRoot = path.join(process.cwd(), "uploads");
  const billsDir = path.join(uploadRoot, "supplier-bills");
  const expensesDir = path.join(uploadRoot, "client-expenses");
  fs.mkdirSync(billsDir, { recursive: true });
  fs.mkdirSync(expensesDir, { recursive: true });

  function writeDemoPdf(dir: string, filename: string, title: string) {
    const abs = path.join(dir, filename);
    // PDF minimo valido
    const content = `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 18 Tf 50 700 Td (${title.replace(/[()\\]/g, "")}) Tj ET
endstream endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000384 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
461
%%EOF
`;
    fs.writeFileSync(abs, content);
    return abs;
  }

  const rf1Pdf = "ie-demo-rf-001.pdf";
  writeDemoPdf(billsDir, rf1Pdf, "Fattura ElettroGross RF-2026-001");
  await ie.supplierBill.update({
    where: { id: "ie-demo-rf-1" },
    data: {
      filePath: `/uploads/supplier-bills/${rf1Pdf}`,
      fileName: "FT-EG-45821.pdf",
      mimeType: "application/pdf",
      fileSize: fs.statSync(path.join(billsDir, rf1Pdf)).size,
    },
  });

  const rf2Pdf = "ie-demo-rf-002.pdf";
  writeDemoPdf(billsDir, rf2Pdf, "Fattura Cavi e Quadri RF-2026-002");
  await ie.supplierBill.update({
    where: { id: "ie-demo-rf-2" },
    data: {
      filePath: `/uploads/supplier-bills/${rf2Pdf}`,
      fileName: "FT-CQ-1203.pdf",
      mimeType: "application/pdf",
      fileSize: fs.statSync(path.join(billsDir, rf2Pdf)).size,
    },
  });

  // Nuova ricevuta fornitore con documento
  await ie.supplierBill.create({
    data: {
      id: "ie-demo-rf-5",
      number: "RF-2026-005",
      supplierId: "ie-demo-supplier-1",
      supplierName: "ElettroGross Italia",
      description: "Consumabili cantiere + nastro isolante",
      invoiceDate: daysFromNow(-1),
      dueDate: daysFromNow(14),
      amount: 180,
      vatAmount: 39.6,
      total: 219.6,
      paidAmount: 0,
      status: "UNPAID",
      reference: "FT-EG-46002",
      filePath: `/uploads/supplier-bills/${rf1Pdf}`,
      fileName: "FT-EG-46002.pdf",
      mimeType: "application/pdf",
      fileSize: fs.statSync(path.join(billsDir, rf1Pdf)).size,
    },
  });

  // Spese clienti con documenti
  await ie.clientExpense.deleteMany({
    where: { id: { startsWith: "ie-demo-sp-" } },
  });
  const sp1 = "ie-demo-sp-001.pdf";
  writeDemoPdf(expensesDir, sp1, "Spesa trasporto Condominio Via Roma");
  const sp2 = "ie-demo-sp-002.pdf";
  writeDemoPdf(expensesDir, sp2, "Spesa permesso Occupazione suolo Edilcasa");

  await ie.clientExpense.createMany({
    data: [
      {
        id: "ie-demo-sp-1",
        number: "SP-2026-001",
        clientId: "ie-demo-client-1",
        clientName: "Condominio Via Roma 12",
        category: "Trasporto",
        description: "Noleggio furgone materiale quadro",
        expenseDate: daysFromNow(-6),
        dueDate: daysFromNow(7),
        amount: 120,
        vatAmount: 26.4,
        total: 146.4,
        paidAmount: 0,
        status: "UNPAID",
        reference: "NC-TR-77",
        filePath: `/uploads/client-expenses/${sp1}`,
        fileName: "noleggio-furgone.pdf",
        mimeType: "application/pdf",
        fileSize: fs.statSync(path.join(expensesDir, sp1)).size,
      },
      {
        id: "ie-demo-sp-2",
        number: "SP-2026-002",
        clientId: "ie-demo-client-2",
        clientName: "Edilcasa Srl",
        category: "Permessi",
        description: "Diritti di istruttoria cantiere",
        expenseDate: daysFromNow(-12),
        dueDate: daysFromNow(-2),
        amount: 250,
        vatAmount: 0,
        total: 250,
        paidAmount: 0,
        status: "OVERDUE",
        reference: "COMUNE-8891",
        filePath: `/uploads/client-expenses/${sp2}`,
        fileName: "permesso-suolo.pdf",
        mimeType: "application/pdf",
        fileSize: fs.statSync(path.join(expensesDir, sp2)).size,
      },
      {
        id: "ie-demo-sp-3",
        number: "SP-2026-003",
        clientId: "ie-demo-client-4",
        clientName: "Officine Meccaniche Nord Spa",
        category: "Materiale",
        description: "Materiale di consumo addebitabile",
        expenseDate: daysFromNow(-35),
        dueDate: daysFromNow(-20),
        amount: 90,
        vatAmount: 19.8,
        total: 109.8,
        paidAmount: 109.8,
        status: "PAID",
        paidAt: daysFromNow(-18),
        reference: "RIC-INT-12",
      },
    ],
  });
  console.log("  ✓ Documenti allegati + spese clienti");

  // ── Calendario condiviso (CRM) ────────────────────────────────────────────
  if (!crm) {
    console.log(
      "  ⚠ Calendario saltato: imposta DATABASE_URL_CRM (o DATABASE_URL CRM in .env) per i blocchi giorni"
    );
  } else {
    await crm.event.deleteMany({
      where: {
        OR: [
          { id: { startsWith: "ie-demo-evt-" } },
          { description: { startsWith: "Demo IE ·" } },
        ],
      },
    });

    const calendarRows: {
      id: string;
      title: string;
      description: string;
      type: "INTERVENTION" | "DEADLINE";
      location?: string;
      color: string;
      dayOffset: number;
      kind: "work" | "deadline";
    }[] = [
      // Commessa COM-2026-011 — 5 giornate
      ...[-8, -7, -6, -5, -4].map((dayOffset, i) => ({
        id: `ie-demo-evt-com1-${i + 1}`,
        title: "Commessa COM-2026-011: Quadro e scale Condominio Via Roma",
        description: "Demo IE · blocco giornata commessa",
        type: "INTERVENTION" as const,
        location: "Via Roma 12, Milano",
        color: "#0284c7",
        dayOffset,
        kind: "work" as const,
      })),
      // Commessa COM-2026-012 — 4 giornate
      ...[-40, -39, -38, -37].map((dayOffset, i) => ({
        id: `ie-demo-evt-com2-${i + 1}`,
        title: "Commessa COM-2026-012: LED e trifase Officine Nord",
        description: "Demo IE · blocco giornata commessa",
        type: "INTERVENTION" as const,
        location: "Desio (MB)",
        color: "#0284c7",
        dayOffset,
        kind: "work" as const,
      })),
      // Scadenze documenti in uscita
      {
        id: "ie-demo-evt-due-out-1",
        title: "Scadenza doc. 2026-201 — Condominio Via Roma",
        description: "Demo IE · scadenza fattura/documento in uscita",
        type: "DEADLINE",
        color: "#f59e0b",
        dayOffset: -5,
        kind: "deadline",
      },
      {
        id: "ie-demo-evt-due-out-2",
        title: "Scadenza doc. 2026-202 — Officine Nord (scaduta)",
        description: "Demo IE · scadenza fattura/documento in uscita",
        type: "DEADLINE",
        color: "#ef4444",
        dayOffset: -12,
        kind: "deadline",
      },
      {
        id: "ie-demo-evt-due-out-3",
        title: "Scadenza doc. 2026-203 — Edilcasa",
        description: "Demo IE · scadenza fattura/documento in uscita",
        type: "DEADLINE",
        color: "#f59e0b",
        dayOffset: 25,
        kind: "deadline",
      },
      // Scadenze ricevute fornitori
      {
        id: "ie-demo-evt-due-in-1",
        title: "Pagare RF-2026-001 — ElettroGross (scaduta)",
        description: "Demo IE · scadenza ricevuta fornitore",
        type: "DEADLINE",
        color: "#ef4444",
        dayOffset: -10,
        kind: "deadline",
      },
      {
        id: "ie-demo-evt-due-in-2",
        title: "Pagare RF-2026-002 — Cavi & Quadri",
        description: "Demo IE · scadenza ricevuta fornitore",
        type: "DEADLINE",
        color: "#f97316",
        dayOffset: 20,
        kind: "deadline",
      },
      {
        id: "ie-demo-evt-due-in-3",
        title: "Pagare RF-2026-004 — Cavi & Quadri (parziale)",
        description: "Demo IE · scadenza ricevuta fornitore",
        type: "DEADLINE",
        color: "#f97316",
        dayOffset: 12,
        kind: "deadline",
      },
    ];

    for (const row of calendarRows) {
      const range =
        row.kind === "work"
          ? workBlock(row.dayOffset)
          : deadlineBlock(row.dayOffset);
      await crm.event.create({
        data: {
          id: row.id,
          title: row.title,
          description: row.description,
          type: row.type,
          startAt: range.startAt,
          endAt: range.endAt,
          location: row.location || null,
          color: row.color,
          assigneeId: adminId,
        },
      });
    }
    console.log(
      `  ✓ Calendario condiviso: ${calendarRows.length} eventi (commesse + scadenze)`
    );
  }

  console.log("✅ Seed demo IE completato.");
  console.log(
    "   Apri /impianti-elettrici → Calendario, Clienti, Commesse, Documenti, Scadenze, Fornitori"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await ie.$disconnect();
    if (crm) await crm.$disconnect();
  });
