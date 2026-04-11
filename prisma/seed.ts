import {
  PrismaClient,
  UserRole,
  UserStatus,
  DayOfWeek,
  ReservationStatus,
  ApprovalStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

const hash = (p: string) => bcrypt.hash(p, 10);

/** "YYYY-MM-DD" offset from today */
function dateStr(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Starting seed…\n");

  // ── 0. Clean slate (order matters due to FK constraints) ──────────────────
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.user.deleteMany();
  console.log("✓  Database cleaned\n");

  // ── 1. Packs ──────────────────────────────────────────────────────────────
  const [packSilver, packGold, packPlatinum] = await Promise.all([
    prisma.pack.create({
      data: {
        name: "Silver",
        maxResources: 1,
        features: ["Tableau de bord", "Réservations illimitées"],
        priceMonthly: 0,
      },
    }),
    prisma.pack.create({
      data: {
        name: "Gold",
        maxResources: 5,
        features: [
          "Tableau de bord",
          "Réservations illimitées",
          "Offres promotionnelles",
          "Statistiques",
        ],
        priceMonthly: 29.99,
      },
    }),
    prisma.pack.create({
      data: {
        name: "Platinum",
        maxResources: 20,
        features: [
          "Tableau de bord",
          "Réservations illimitées",
          "Offres promotionnelles",
          "Statistiques avancées",
          "Support prioritaire",
          "API accès",
        ],
        priceMonthly: 79.99,
      },
    }),
  ]);
  console.log("✓  Packs : Silver / Gold / Platinum");

  // ── 2. Categories & sub-categories ───────────────────────────────────────
  const catPadel = await prisma.category.create({
    data: {
      name: "Padel",
      slug: "padel",
      subCategories: {
        create: [
          { name: "Padel extérieur", defaultDurationMin: 90 },
          { name: "Padel intérieur", defaultDurationMin: 90 },
          { name: "Padel couvert", defaultDurationMin: 60 },
        ],
      },
    },
  });

  const catSport = await prisma.category.create({
    data: {
      name: "Sport",
      slug: "sport",
      subCategories: {
        create: [
          { name: "Football", defaultDurationMin: 60 },
          { name: "Tennis", defaultDurationMin: 60 },
          { name: "Squash", defaultDurationMin: 45 },
          { name: "Badminton", defaultDurationMin: 60 },
        ],
      },
    },
  });

  const catWellness = await prisma.category.create({
    data: {
      name: "Bien-être",
      slug: "bien-etre",
      subCategories: {
        create: [
          { name: "Yoga", defaultDurationMin: 60 },
          { name: "Pilates", defaultDurationMin: 45 },
          { name: "Méditation", defaultDurationMin: 30 },
        ],
      },
    },
  });

  const catCoworking = await prisma.category.create({
    data: {
      name: "Coworking",
      slug: "coworking",
      subCategories: {
        create: [
          { name: "Salle de réunion", defaultDurationMin: 60 },
          { name: "Bureau individuel", defaultDurationMin: 120 },
        ],
      },
    },
  });

  console.log(
    `✓  Catégories : ${[catPadel, catSport, catWellness, catCoworking].map((c) => c.name).join(", ")}`
  );

  // ── 3. Super Admin ────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "admin@padel.com",
      password: await hash("Admin123!"),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log("✓  Admin : admin@padel.com  /  Admin123!");

  // ── 4. Partners ───────────────────────────────────────────────────────────
  const partnersData = [
    {
      email: "contact@padelclub-paris.fr",
      password: "Partner123!",
      name: "Paris Padel Club",
      city: "Paris",
      phone: "+33 1 40 00 01 01",
      address: "15 avenue des Sports, 75008 Paris",
      categoryId: catPadel.id,
      packId: packGold.id,
      isVerified: true,
      courts: ["Court 1", "Court 2", "Court 3"],
    },
    {
      email: "info@padelolympia.fr",
      password: "Partner123!",
      name: "Padel Olympia",
      city: "Lyon",
      phone: "+33 4 72 00 02 02",
      address: "8 rue des Champions, 69003 Lyon",
      categoryId: catPadel.id,
      packId: packPlatinum.id,
      isVerified: true,
      courts: ["Terra A", "Terra B", "Terra C", "Terra D"],
    },
    {
      email: "bonjour@marseille-padel.fr",
      password: "Partner123!",
      name: "Marseille Padel",
      city: "Marseille",
      phone: "+33 4 91 00 03 03",
      address: "22 boulevard Michelet, 13008 Marseille",
      categoryId: catPadel.id,
      packId: packGold.id,
      isVerified: true,
      courts: ["Piste 1", "Piste 2"],
    },
    {
      email: "hello@bordeaux-sport.fr",
      password: "Partner123!",
      name: "Sport Center Bordeaux",
      city: "Bordeaux",
      phone: "+33 5 56 00 04 04",
      address: "5 cours de l'Intendance, 33000 Bordeaux",
      categoryId: catSport.id,
      packId: packGold.id,
      isVerified: true,
      courts: ["Terrain Football", "Court Tennis A", "Court Tennis B"],
    },
    {
      email: "contact@nantes-wellness.fr",
      password: "Partner123!",
      name: "Zen Space Nantes",
      city: "Nantes",
      phone: "+33 2 40 00 05 05",
      address: "12 rue du Bien-être, 44000 Nantes",
      categoryId: catWellness.id,
      packId: packSilver.id,
      isVerified: false,
      courts: ["Salle Yoga"],
    },
    {
      email: "desk@cowork-lille.fr",
      password: "Partner123!",
      name: "CoWork Lille",
      city: "Lille",
      phone: "+33 3 20 00 06 06",
      address: "3 place du Général de Gaulle, 59000 Lille",
      categoryId: catCoworking.id,
      packId: packGold.id,
      isVerified: true,
      courts: ["Salle Panorama", "Salle Innovation"],
    },
    {
      email: "padel@nice-riviera.fr",
      password: "Partner123!",
      name: "Padel Riviera Nice",
      city: "Nice",
      phone: "+33 4 93 00 07 07",
      address: "1 promenade des Sports, 06000 Nice",
      categoryId: catPadel.id,
      packId: packPlatinum.id,
      isVerified: true,
      courts: ["Court Azur 1", "Court Azur 2", "Court Azur 3"],
    },
    {
      email: "info@strasbourg-padel.fr",
      password: "Partner123!",
      name: "Alsace Padel Club",
      city: "Strasbourg",
      phone: "+33 3 88 00 08 08",
      address: "7 route du Rhin, 67000 Strasbourg",
      categoryId: catPadel.id,
      packId: packSilver.id,
      isVerified: false,
      courts: ["Court 1"],
    },
  ];

  // All days of the week
  const allDays: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];

  // Weekend only
  const weekendDays: DayOfWeek[] = ["SATURDAY", "SUNDAY"];

  // Weekdays only
  const weekDays: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ];

  const createdPartners = [];

  for (const p of partnersData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        password: await hash(p.password),
        role: UserRole.PARTNER,
        status: UserStatus.ACTIVE,
      },
    });

    const partner = await prisma.partner.create({
      data: {
        userId: user.id,
        name: p.name,
        city: p.city,
        phone: p.phone,
        address: p.address,
        categoryId: p.categoryId,
        packId: p.packId,
        isVerified: p.isVerified,
      },
    });

    // Create resources (courts/rooms)
    const resources = await Promise.all(
      p.courts.map((courtName) =>
        prisma.resource.create({
          data: {
            partnerId: partner.id,
            name: courtName,
            capacity: courtName.toLowerCase().includes("réunion") ? 12 : 4,
            isActive: true,
          },
        })
      )
    );

    // Set availabilities for each resource
    for (const resource of resources) {
      // Coworking & wellness: weekdays only; sport: all days; padel: all days
      const days =
        p.categoryId === catCoworking.id
          ? weekDays
          : p.categoryId === catWellness.id
          ? allDays
          : allDays;

      const isWeekend = (d: DayOfWeek) =>
        d === "SATURDAY" || d === "SUNDAY";

      for (const day of days) {
        await prisma.availability.create({
          data: {
            resourceId: resource.id,
            dayOfWeek: day,
            startTime: isWeekend(day) ? "08:00" : "09:00",
            endTime: isWeekend(day) ? "22:00" : "21:00",
            slotIntervalMin: 90,
          },
        });
      }
    }

    createdPartners.push({ partner, resources });
    console.log(`  ✓  ${p.name} (${p.city}) — ${p.courts.length} terrain(s)`);
  }

  console.log(`\n✓  ${createdPartners.length} partenaires créés`);

  // ── 5. Reservations ───────────────────────────────────────────────────────
  const reservationsToCreate = [
    // Confirmed past
    { partnerIdx: 0, resourceIdx: 0, offsetDays: -5, start: "10:00", end: "11:30", status: ReservationStatus.CONFIRMED, name: "Jean Dupont", phone: "+33 6 11 11 11 11", email: "jean.dupont@email.fr" },
    { partnerIdx: 0, resourceIdx: 1, offsetDays: -3, start: "14:00", end: "15:30", status: ReservationStatus.CONFIRMED, name: "Marie Curie", phone: "+33 6 22 22 22 22", email: "marie@email.fr" },
    { partnerIdx: 1, resourceIdx: 0, offsetDays: -7, start: "09:00", end: "10:30", status: ReservationStatus.CONFIRMED, name: "Pierre Martin", phone: "+33 6 33 33 33 33", email: "pierre@email.fr" },
    { partnerIdx: 1, resourceIdx: 1, offsetDays: -2, start: "16:00", end: "17:30", status: ReservationStatus.REJECTED, name: "Sophie Bernard", phone: "+33 6 44 44 44 44", email: null },
    // Pending (today + future)
    { partnerIdx: 0, resourceIdx: 0, offsetDays: 1, start: "11:00", end: "12:30", status: ReservationStatus.PENDING, name: "Lucas Petit", phone: "+33 6 55 55 55 55", email: "lucas@email.fr" },
    { partnerIdx: 0, resourceIdx: 2, offsetDays: 2, start: "14:00", end: "15:30", status: ReservationStatus.PENDING, name: "Emma Blanc", phone: "+33 6 66 66 66 66", email: "emma@email.fr" },
    { partnerIdx: 1, resourceIdx: 0, offsetDays: 1, start: "10:00", end: "11:30", status: ReservationStatus.CONFIRMED, name: "Hugo Thomas", phone: "+33 6 77 77 77 77", email: null },
    { partnerIdx: 2, resourceIdx: 0, offsetDays: 3, start: "09:00", end: "10:30", status: ReservationStatus.PENDING, name: "Camille Leroy", phone: "+33 6 88 88 88 88", email: "camille@email.fr" },
    { partnerIdx: 3, resourceIdx: 0, offsetDays: 2, start: "18:00", end: "19:00", status: ReservationStatus.CONFIRMED, name: "Antoine Durand", phone: "+33 6 99 99 99 99", email: null },
    { partnerIdx: 5, resourceIdx: 0, offsetDays: 1, start: "09:00", end: "10:00", status: ReservationStatus.PENDING, name: "Julie Moreau", phone: "+33 6 10 10 10 10", email: "julie@email.fr" },
    { partnerIdx: 6, resourceIdx: 0, offsetDays: 4, start: "12:00", end: "13:30", status: ReservationStatus.PENDING, name: "Nicolas Simon", phone: "+33 6 12 12 12 12", email: "nicolas@email.fr" },
    { partnerIdx: 6, resourceIdx: 1, offsetDays: 5, start: "15:00", end: "16:30", status: ReservationStatus.CONFIRMED, name: "Isabelle Laurent", phone: "+33 6 13 13 13 13", email: "isa@email.fr" },
    { partnerIdx: 0, resourceIdx: 0, offsetDays: -1, start: "09:00", end: "10:30", status: ReservationStatus.CANCELLED, name: "Marc Dupuis", phone: "+33 6 14 14 14 14", email: null },
  ];

  for (const r of reservationsToCreate) {
    const { partner, resources } = createdPartners[r.partnerIdx];
    const resource = resources[r.resourceIdx];
    if (!resource) continue;

    await prisma.reservation.create({
      data: {
        resourceId: resource.id,
        guestName: r.name,
        guestPhone: r.phone,
        guestEmail: r.email,
        date: dateStr(r.offsetDays),
        startTime: r.start,
        endTime: r.end,
        status: r.status,
      },
    });
  }
  console.log(`✓  ${reservationsToCreate.length} réservations créées`);

  // ── 6. Offers ─────────────────────────────────────────────────────────────
  const offersData = [
    {
      partnerIdx: 0,
      title: "Happy Hour Padel",
      description: "50% de réduction sur tous les créneaux de 9h à 12h en semaine.",
      discountPercent: 50,
      validFrom: dateStr(-2),
      validUntil: dateStr(30),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 1,
      title: "Weekend Promo",
      description: "20% de réduction sur les réservations du weekend. Offre limitée.",
      discountPercent: 20,
      validFrom: dateStr(0),
      validUntil: dateStr(14),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 2,
      title: "Été Padel",
      description: "Profitez de l'été avec 15% de réduction sur tous nos terrains.",
      discountPercent: 15,
      validFrom: dateStr(-7),
      validUntil: dateStr(60),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 3,
      title: "Formule Soirée Sport",
      description: "30% sur les créneaux après 19h du lundi au vendredi.",
      discountPercent: 30,
      validFrom: dateStr(0),
      validUntil: dateStr(21),
      approvalStatus: ApprovalStatus.PENDING,
    },
    {
      partnerIdx: 6,
      title: "Côte d'Azur Summer",
      description: "25% de réduction pour découvrir nos courts en bord de mer.",
      discountPercent: 25,
      validFrom: dateStr(-3),
      validUntil: dateStr(45),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 5,
      title: "Séminaire d'entreprise",
      description: "Réservez une salle pour votre équipe et bénéficiez de 10% de réduction.",
      discountPercent: 10,
      validFrom: dateStr(0),
      validUntil: dateStr(90),
      approvalStatus: ApprovalStatus.PENDING,
    },
    {
      partnerIdx: 7,
      title: "Ouverture Alsace",
      description: "Pour notre ouverture, 40% sur tous les créneaux ce mois-ci.",
      discountPercent: 40,
      validFrom: dateStr(-1),
      validUntil: dateStr(30),
      approvalStatus: ApprovalStatus.REJECTED,
    },
  ];

  for (const o of offersData) {
    const { partner } = createdPartners[o.partnerIdx];
    await prisma.offer.create({
      data: {
        partnerId: partner.id,
        title: o.title,
        description: o.description,
        discountPercent: o.discountPercent,
        validFrom: o.validFrom,
        validUntil: o.validUntil,
        approvalStatus: o.approvalStatus,
      },
    });
  }
  console.log(`✓  ${offersData.length} offres créées`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
╔═══════════════════════════════════════════════╗
║           SEED TERMINÉ AVEC SUCCÈS            ║
╠═══════════════════════════════════════════════╣
║  Admin      admin@padel.com / Admin123!       ║
║  Partenaires  Partner123! (mot de passe)      ║
╠═══════════════════════════════════════════════╣
║  Partenaires vérifiés                         ║
║    Paris Padel Club   contact@padelclub-paris.fr  ║
║    Padel Olympia      info@padelolympia.fr    ║
║    Marseille Padel    bonjour@marseille-padel.fr ║
║    Sport Center BDX   hello@bordeaux-sport.fr ║
║    CoWork Lille       desk@cowork-lille.fr    ║
║    Padel Riviera Nice padel@nice-riviera.fr   ║
╠═══════════════════════════════════════════════╣
║  En attente vérification                      ║
║    Zen Space Nantes   contact@nantes-wellness.fr ║
║    Alsace Padel Club  info@strasbourg-padel.fr║
╚═══════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
