import { PrismaClient, UserRole, PermissionAction } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PERMISSIONS: { resource: string; action: PermissionAction; name: string }[] = [
  { resource: "clients", action: "CREATE", name: "Crea clienti" },
  { resource: "clients", action: "READ", name: "Leggi clienti" },
  { resource: "clients", action: "UPDATE", name: "Modifica clienti" },
  { resource: "clients", action: "DELETE", name: "Elimina clienti" },
  { resource: "quotes", action: "CREATE", name: "Crea preventivi" },
  { resource: "quotes", action: "READ", name: "Leggi preventivi" },
  { resource: "quotes", action: "UPDATE", name: "Modifica preventivi" },
  { resource: "quotes", action: "DELETE", name: "Elimina preventivi" },
  { resource: "reports", action: "CREATE", name: "Crea report" },
  { resource: "reports", action: "READ", name: "Leggi report" },
  { resource: "inventory", action: "CREATE", name: "Gestione magazzino" },
  { resource: "inventory", action: "READ", name: "Lettura magazzino" },
  { resource: "users", action: "MANAGE_USERS", name: "Gestione utenti" },
];

async function main() {
  console.log("🌱 Seeding database...");

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: p.resource, action: p.action } },
      create: p,
      update: { name: p.name },
    });
  }

  const roles: { slug: UserRole; name: string; description: string }[] = [
    { slug: "SUPER_ADMIN", name: "Super Admin", description: "Accesso completo" },
    { slug: "ADMIN", name: "Admin", description: "Amministratore" },
    { slug: "COMMERCIAL", name: "Commerciale", description: "Vendite e preventivi" },
    { slug: "TECHNICIAN", name: "Tecnico", description: "Interventi e report" },
    { slug: "OPERATOR", name: "Operatore", description: "Operazioni base" },
    { slug: "WAREHOUSE", name: "Magazziniere", description: "Gestione magazzino" },
    { slug: "CLIENT", name: "Cliente", description: "Area cliente privata" },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      create: r,
      update: { name: r.name, description: r.description },
    });
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@crm.local")
    .trim()
    .toLowerCase();
  const adminPlain = (process.env.ADMIN_PASSWORD || "Admin123!").trim();
  const adminHash = await bcrypt.hash(adminPlain, 12);

  // Aggiorna sempre hash / stato admin così ADMIN_EMAIL e ADMIN_PASSWORD nel .env
  // restano allineati dopo ogni `db:seed` (prima update: {} lasciava la vecchia password).
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      firstName: "Nicolò",
      lastName: "Service",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    update: {
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { id: "default-warehouse" },
    create: { id: "default-warehouse", name: "Magazzino Principale", isDefault: true },
    update: {},
  }).catch(async () => {
    const w = await prisma.warehouse.findFirst({ where: { isDefault: true } });
    if (w) return w;
    return prisma.warehouse.create({
      data: { name: "Magazzino Principale", isDefault: true },
    });
  });

  const siteHomeDefault = {
    badge: "Tecnico audio e luci · eventi live",
    headline: "Audio professionale e illuminazione per il tuo evento",
    subheadline:
      "Consulenza, progettazione, allestimento e operatività in sala: concerti, manifestazioni, matrimoni e spettacoli. Preventivi chiari, attrezzatura professionale e supporto in ogni fase.",
    accessIntro:
      "Descrivi data, luogo e tipo di evento: ti rispondiamo con disponibilità e un preventivo su misura. Per urgenze indica il recapito telefonico nel messaggio.",
    footerLine: "Nicolò Service — tecnico audio e luci",
    features: [
      {
        title: "Audio live",
        description:
          "Mix FOH e monitor, microfonazione, sistemi line array e gestione del suono in tempo reale per band, DJ e speech.",
      },
      {
        title: "Luci e scenografia",
        description:
          "Progetto luci, dimmer e moving head, controllo DMX, atmosphere per club, teatro e cerimonie.",
      },
      {
        title: "Organizzazione tecnica",
        description:
          "Sopralluogo, rider tecnico, montaggio e smontaggio, coordinamento con venue e produzione.",
      },
    ],
  };

  const settings = [
    {
      key: "app_name",
      value: {
        name: "Nicolò Service",
        tagline: "Tecnico professionista audio · luci · eventi",
      },
    },
    { key: "logo", value: { url: "" } },
    { key: "favicon", value: { url: "" } },
    {
      key: "colors",
      value: { primary: "#6366f1", accent: "#8b5cf6", sidebar: "#0f0f12" },
    },
    {
      key: "company",
      value: {
        name: "Nicolò Service",
        vat: "",
        address: "",
        email: "",
        phone: "",
        website: "",
      },
    },
    { key: "footer", value: { text: "© Nicolò Service — audio e luci per eventi" } },
    { key: "site_home", value: siteHomeDefault },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  await prisma.paymentTermTemplate.upsert({
    where: { id: "tpl-pagamento-standard" },
    create: {
      id: "tpl-pagamento-standard",
      name: "Standard (accettazione + evento + saldo)",
      isDefault: true,
      items: {
        create: [
          {
            label: "Acconto all'accettazione",
            note: "Alla conferma del preventivo",
            percent: 30,
            sortOrder: 0,
          },
          {
            label: "Acconto prima dell'evento",
            note: "Entro 7 giorni dalla data evento",
            percent: 40,
            sortOrder: 1,
          },
          {
            label: "Saldo a fine lavori",
            note: "A conclusione del servizio",
            isBalance: true,
            sortOrder: 2,
          },
        ],
      },
    },
    update: { isDefault: true },
  });

  const seedDemo = process.env.SEED_DEMO_DATA === "true";
  if (!seedDemo) {
    console.log("✅ Seed completato (solo configurazione base).");
    console.log("   Per clienti, servizi e prodotti di esempio: SEED_DEMO_DATA=true");
    console.log("");
    console.log(`  Admin: ${adminEmail} / (password = ADMIN_PASSWORD nel .env)`);
    return;
  }

  console.log("📦 Caricamento dati demo (SEED_DEMO_DATA=true)...");

  const client = await prisma.client.upsert({
    where: { id: "demo-client-1" },
    create: {
      id: "demo-client-1",
      companyName: "Acme Corporation S.r.l.",
      contactName: "Mario Rossi",
      email: "mario.rossi@acme.it",
      phone: "+39 02 1234567",
      address: "Via Roma 15",
      city: "Milano",
      province: "MI",
      postalCode: "20100",
      vatNumber: "IT12345678901",
      status: "ACTIVE",
      tags: ["premium", "manutenzione"],
    },
    update: {},
  });

  const clientUserHash = await bcrypt.hash("Cliente123!", 12);
  await prisma.user.upsert({
    where: { email: "cliente@demo.it" },
    create: {
      email: "cliente@demo.it",
      passwordHash: clientUserHash,
      firstName: "Mario",
      lastName: "Rossi",
      role: "CLIENT",
      clientId: client.id,
      status: "ACTIVE",
    },
    update: {},
  });

  const services = [
    { name: "Servizio tecnico", category: "Manodopera", price: 45, unit: "ora", duration: 60, vatExempt: false },
    { name: "Tecnico audio FOH", category: "Audio", price: 60, unit: "ora", duration: 60, vatExempt: false },
    { name: "Operatore luci", category: "Luci", price: 55, unit: "ora", duration: 60, vatExempt: false },
    { name: "Service audio evento", category: "Audio", price: 650, unit: "evento", duration: 480, vatExempt: false },
    { name: "Messa in luce e operatore luci", category: "Luci", price: 520, unit: "evento", duration: 420, vatExempt: false },
    { name: "Montaggio e smontaggio impianto", category: "Servizi", price: 350, unit: "forfait", duration: 240, vatExempt: false },
    { name: "Noleggio impianto audio base", category: "Noleggio", price: 280, unit: "gg", duration: 240, vatExempt: false },
    { name: "Rimborso chilometrico", category: "Trasferte", price: 0.5, unit: "km", duration: null, vatExempt: false },
    { name: "Trasferta / vitto", category: "Trasferte", price: 80, unit: "pz", duration: null, vatExempt: false },
    { name: "Pernottamento", category: "Trasferte", price: 90, unit: "notte", duration: null, vatExempt: false },
    { name: "Materiali vari", category: "Varie", price: 0, unit: "pz", duration: null, vatExempt: true },
    { name: "Diritti SIAE / pass-through", category: "Varie", price: 0, unit: "forfait", duration: null, vatExempt: true },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { id: `svc-${s.name.replace(/\s/g, "-").toLowerCase()}` },
      create: {
        id: `svc-${s.name.replace(/\s/g, "-").toLowerCase()}`,
        name: s.name,
        category: s.category,
        unit: s.unit,
        price: s.price,
        vatExempt: s.vatExempt,
        vatRate: s.vatExempt ? 0 : 22,
        duration: s.duration ?? undefined,
        isActive: true,
      },
      update: {
        price: s.price,
        category: s.category,
        unit: s.unit,
        vatExempt: s.vatExempt,
        vatRate: s.vatExempt ? 0 : 22,
        duration: s.duration ?? undefined,
      },
    }).catch(() =>
      prisma.service.create({
        data: {
          name: s.name,
          category: s.category,
          unit: s.unit,
          price: s.price,
          vatExempt: s.vatExempt,
          vatRate: s.vatExempt ? 0 : 22,
          duration: s.duration ?? undefined,
          isActive: true,
        },
      })
    );
  }

  const products = [
    { name: "Mixer digitale 16 canali", sku: "AUD-MIX-16", category: "Audio", price: 45, minStock: 2 },
    { name: "Radiomicrofono UHF", sku: "AUD-RF-UHF", category: "Audio", price: 12, minStock: 8 },
    { name: "Testa mobile LED PAR", sku: "LUX-PAR-LED", category: "Luci", price: 18, minStock: 12 },
    { name: "Cavo DMX 5m", sku: "LUX-DMX-5M", category: "Luci", price: 3.5, minStock: 30 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        vatRate: 22,
        isActive: true,
      },
      update: {},
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: p.minStock * 2,
        minStock: p.minStock,
      },
      update: {},
    });
  }

  await prisma.quoteAutomationRule.upsert({
    where: { id: "rule-manutenzione" },
    create: {
      id: "rule-manutenzione",
      name: "Pacchetto Manutenzione",
      category: "Manutenzione",
      isActive: true,
      discountPercent: 5,
      vatRate: 22,
      autoItems: [
        {
          type: "service",
          description: "Manutenzione ordinaria",
          quantity: 1,
          unitPrice: 120,
          vatRate: 22,
        },
      ],
    },
    update: {},
  });

  const techHash = await bcrypt.hash("Tecnico123!", 12);
  await prisma.user.upsert({
    where: { email: "tecnico@crm.local" },
    create: {
      email: "tecnico@crm.local",
      passwordHash: techHash,
      firstName: "Luca",
      lastName: "Bianchi",
      role: "TECHNICIAN",
      status: "ACTIVE",
    },
    update: {},
  });

  const commHash = await bcrypt.hash("Commerciale123!", 12);
  await prisma.user.upsert({
    where: { email: "commerciale@crm.local" },
    create: {
      email: "commerciale@crm.local",
      passwordHash: commHash,
      firstName: "Anna",
      lastName: "Verdi",
      role: "COMMERCIAL",
      status: "ACTIVE",
    },
    update: {},
  });

  const quoteNumber = `PRV-${new Date().getFullYear()}-0001`;
  const quote = await prisma.quote.upsert({
    where: { number: quoteNumber },
    create: {
      number: quoteNumber,
      clientId: client.id,
      createdById: admin.id,
      title: "Manutenzione impianto Q1",
      status: "SENT",
      subtotal: 570,
      vatAmount: 125.4,
      total: 695.4,
      balanceDue: 695.4,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            type: "service",
            description: "Manutenzione ordinaria x3",
            quantity: 3,
            unitPrice: 120,
            vatRate: 22,
            total: 360,
            sortOrder: 0,
          },
          {
            type: "product",
            description: "Materiali vari",
            quantity: 1,
            unitPrice: 210,
            vatRate: 22,
            total: 210,
            sortOrder: 1,
          },
        ],
      },
    },
    update: {},
  });

  const technician = await prisma.user.findUnique({
    where: { email: "tecnico@crm.local" },
  });

  if (technician) {
    const intNumber = `INT-${new Date().getFullYear()}-0001`;
    const intervention = await prisma.intervention.upsert({
      where: { number: intNumber },
      create: {
        number: intNumber,
        clientId: client.id,
        technicianId: technician.id,
        title: "Manutenzione programmata",
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        location: client.address ?? undefined,
      },
      update: {},
    });

    const existingEv = await prisma.event.findFirst({
      where: { interventionId: intervention.id },
    });
    if (!existingEv) {
      await prisma.event.create({
        data: {
          title: "Intervento Acme",
          type: "INTERVENTION",
          startAt: intervention.scheduledAt!,
          endAt: new Date(
            intervention.scheduledAt!.getTime() + 2 * 60 * 60 * 1000
          ),
          clientId: client.id,
          assigneeId: technician.id,
          interventionId: intervention.id,
          color: "#6366f1",
        },
      });
    }
  }

  const demoLeadEmail = "giulia@example.com";
  const existingLead = await prisma.lead.findFirst({
    where: { email: demoLeadEmail },
  });
  if (!existingLead) {
    await prisma.lead.create({
      data: {
        name: "Giulia Neri",
        email: demoLeadEmail,
        phone: "+39 333 1234567",
        company: "Startup XYZ",
        message: "Richiesta informazioni su servizi di manutenzione",
        source: "website",
        status: "new",
      },
    });
  }

  const existingWelcome = await prisma.notification.findFirst({
    where: {
      userId: admin.id,
      title: "Benvenuto",
    },
  });
  if (!existingWelcome) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "INFO",
        title: "Benvenuto",
        message:
          "Gestionale operativo pronto: clienti, eventi, preventivi audio/luci e magazzino attrezzature.",
      },
    });
  }

  console.log("✅ Seed completato!");
  console.log("");
  console.log("Credenziali di accesso (override con ADMIN_EMAIL / ADMIN_PASSWORD nel .env):");
  console.log(`  Admin:        ${adminEmail} / (password = valore corrente di ADMIN_PASSWORD nel .env)`);
  console.log("  Commerciale:  commerciale@crm.local / Commerciale123!");
  console.log("  Tecnico:      tecnico@crm.local / Tecnico123!");
  console.log("  Cliente:      cliente@demo.it / Cliente123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
