import {
  PrismaClient,
  UserRole,
  UserStatus,
  DayOfWeek,
  ReservationStatus,
  ApprovalStatus,
  CategoryType,
  BookingUnit
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

const hash = (p: string) => bcrypt.hash(p, 10);

function reservationReference(index: number, createdAt = new Date()): string {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `RES-${year}${month}-${String(index).padStart(4, "0")}`;
}

/** Demo image URLs (Lorem Picsum). Avoids Unsplash hotlink/404 issues with the Next.js Image optimizer. */
function picsum(seed: string, w: number, h: number): string {
  const s = seed.slice(0, 100).replace(/\s+/g, "-");
  return `https://picsum.photos/seed/${encodeURIComponent(s)}/${w}/${h}`;
}

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
  const catCoworking = await prisma.category.create({
    data: {
      name: "Espaces de Travail",
      slug: "coworking",
      imageUrl: picsum("category-coworking", 1200, 675),
      subCategories: {
        create: [
          { name: "Salle de réunion", defaultDurationMin: 60 },
          { name: "Bureau privé", defaultDurationMin: 240 },
          { name: "Open space", defaultDurationMin: 240 },
        ],
      },
    },
  });

  const catVehicles = await prisma.category.create({
    data: {
      name: "Location de Véhicules",
      slug: "vehicules",
      imageUrl: picsum("category-vehicles", 1200, 675),
      subCategories: {
        create: [
          { name: "Voiture", defaultDurationMin: 1440 }, // 1 day
          { name: "Quad", defaultDurationMin: 120 },
          { name: "Scooter", defaultDurationMin: 1440 },
        ],
      },
    },
  });

  const catWellness = await prisma.category.create({
    data: {
      name: "Bien-être & Spa",
      slug: "bien-etre",
      imageUrl: picsum("category-wellness", 1200, 675),
      subCategories: {
        create: [
          { name: "Massage", defaultDurationMin: 60 },
          { name: "Hammam", defaultDurationMin: 60 },
          { name: "Soin du visage", defaultDurationMin: 30 },
        ],
      },
    },
  });

  console.log(`✓  Catégories créées`);

  // ── 3. Super Admin ────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "admin@reservation.com",
      password: await hash("Admin123!"),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log("✓  Admin : admin@reservation.com  /  Admin123!");

  // ── 4. Partners (Djerba — Médenine) ────────────────────────────────────────
  const coworkingSubList = await prisma.subCategory.findMany({ where: { categoryId: catCoworking.id } });
  const vehiclesSubList = await prisma.subCategory.findMany({ where: { categoryId: catVehicles.id } });
  const wellnessSubList = await prisma.subCategory.findMany({ where: { categoryId: catWellness.id } });

  const getSubId = (list: {id: string, name: string}[], name: string) => list.find(s => s.name === name)?.id;

  const partnersData = [
    {
      email: "contact@coworking-djerba.tn",
      password: "Partner123!",
      name: "Djerba Coworking Hub",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 123 001",
      address: "Centre Ville, Midoun, Djerba",
      categoryId: catCoworking.id,
      packId: packPlatinum.id,
      isVerified: true,
      description: "L'espace de coworking idéal pour les nomades numériques et les entreprises locales. Connexion fibre optique, café gratuit et espaces climatisés.",
      keyFeatures: ["Fibre Optique", "Salles climatisées", "Café gratuit"],
      resourcesData: [
        { name: "Salle de réunion (6 pers.)", subId: getSubId(coworkingSubList, "Salle de réunion"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 30 },
        { name: "Bureau Privé A", subId: getSubId(coworkingSubList, "Bureau privé"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 80 },
        { name: "Pass Open Space", subId: getSubId(coworkingSubList, "Open space"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.DAYS, price: 20 },
      ],
      logo: picsum("coworking-djerba-logo", 256, 256),
      coverImage: picsum("coworking-djerba-cover", 1600, 900),
    },
    {
      email: "resa@djerba-rentacar.tn",
      password: "Partner123!",
      name: "Djerba Rent A Car",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 002",
      address: "Aéroport Djerba Zarzis",
      categoryId: catVehicles.id,
      packId: packGold.id,
      isVerified: true,
      description: "Location de voitures et de scooters à des prix compétitifs. Explorez l'île de Djerba en toute liberté.",
      keyFeatures: ["Kilométrage illimité", "Assurance tous risques", "Livraison à l'hôtel"],
      resourcesData: [
        { name: "Clio 5 - Manuelle", subId: getSubId(vehiclesSubList, "Voiture"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 120 },
        { name: "Polo 7 - Automatique", subId: getSubId(vehiclesSubList, "Voiture"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 150 },
        { name: "Scooter Vespa 50cc", subId: getSubId(vehiclesSubList, "Scooter"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 60 },
      ],
      logo: picsum("rentacar-djerba-logo", 256, 256),
      coverImage: picsum("rentacar-djerba-cover", 1600, 900),
    },
    {
      email: "spa@radisson-djerba.tn",
      password: "Partner123!",
      name: "Radisson Thalasso & Spa",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 003",
      address: "Zone Touristique, Houmt Souk",
      categoryId: catWellness.id,
      packId: packGold.id,
      isVerified: true,
      description: "Détendez-vous dans notre centre de thalassothérapie. Massages relaxants, hammam traditionnel et soins esthétiques.",
      keyFeatures: ["Piscine à l'eau de mer", "Produits naturels", "Thérapeutes certifiés"],
      resourcesData: [
        { name: "Massage Relaxant (1h)", subId: getSubId(wellnessSubList, "Massage"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 120 },
        { name: "Accès Hammam + Gommage", subId: getSubId(wellnessSubList, "Hammam"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 70 },
      ],
      logo: picsum("spa-djerba-logo", 256, 256),
      coverImage: picsum("spa-djerba-cover", 1600, 900),
    },
    {
      email: "contact@djerba-quad.tn",
      password: "Partner123!",
      name: "Djerba Quad Adventures",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 123 004",
      address: "Route Touristique, Midoun",
      categoryId: catVehicles.id,
      packId: packSilver.id,
      isVerified: true,
      description: "Découvrez les pistes sauvages et les plages de Djerba en Quad. Des circuits guidés pour tous les niveaux.",
      keyFeatures: ["Quads récents", "Guide inclus", "Casques fournis"],
      resourcesData: [
        { name: "Quad Kymco 250cc (2h)", subId: getSubId(vehiclesSubList, "Quad"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 40 },
        { name: "Quad Kymco 250cc (Demi-journée)", subId: getSubId(vehiclesSubList, "Quad"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 35 },
      ],
      logo: picsum("quad-djerba-logo", 256, 256),
      coverImage: picsum("quad-djerba-cover", 1600, 900),
    },
    {
      email: "hello@djerba-yoga.tn",
      password: "Partner123!",
      name: "Djerba Yoga Studio",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 005",
      address: "Marina, Houmt Souk",
      categoryId: catWellness.id,
      packId: packSilver.id,
      isVerified: true,
      description: "Retrouvez la paix intérieure dans notre studio face à la mer. Cours de Hatha, Vinyasa et Yin Yoga.",
      keyFeatures: ["Vue sur mer", "Tapis fournis", "Petits groupes"],
      resourcesData: [
        { name: "Cours Collectif Vinyasa", subId: undefined, categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 25 },
        { name: "Séance Privée Hatha", subId: undefined, categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 80 },
      ],
      logo: picsum("yoga-djerba-logo", 256, 256),
      coverImage: picsum("yoga-djerba-cover", 1600, 900),
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
        governorate: p.governorate,
        phone: p.phone,
        address: p.address,
        categoryId: p.categoryId,
        packId: p.packId,
        isVerified: p.isVerified,
        logo: p.logo,
        coverImage: p.coverImage,
        settings: {
          description: p.description,
          keyFeatures: p.keyFeatures,
        },
      },
    });

    // Create resources with their specific category type and unit
    const resources = await Promise.all(
      p.resourcesData.map((resData, i) => {
        return prisma.resource.create({
          data: {
            partnerId: partner.id,
            name: resData.name,
            capacity: 4,
            isActive: true,
            subCategoryId: resData.subId,
            price: resData.price, // dynamic price
            categoryType: resData.categoryType,
            bookingUnit: resData.bookingUnit,
          },
        });
      }),
    );

    // Availabilities — all days for padel clubs
    for (const resource of resources) {
      for (const day of allDays) {
        await prisma.availability.create({
          data: {
            resourceId: resource.id,
            dayOfWeek: day,
            startTime: "08:00",
            endTime: "23:00",
            slotIntervalMin: 60,
          },
        });
      }
    }

    createdPartners.push({ partner, resources });
    console.log(`  ✓  ${p.name} (${p.city}) — ${p.resourcesData.length} ressource(s)`);
  }

  console.log(`\n✓  ${createdPartners.length} partenaires créés`);

  // ── 5. Reservations ───────────────────────────────────────────────────────
  const reservationsToCreate = [
    { partnerIdx: 0, resourceIdx: 0, offsetDays: -5, start: "10:00", end: "11:30", status: ReservationStatus.CONFIRMED, name: "Amine Ben Salah", phone: "+216 98 111 111", email: "amine@email.tn" },
    { partnerIdx: 0, resourceIdx: 1, offsetDays: -3, start: "14:00", end: "15:30", status: ReservationStatus.CONFIRMED, name: "Sarra Trabelsi", phone: "+216 98 222 222", email: "sarra@email.tn" },
    { partnerIdx: 1, resourceIdx: 0, offsetDays: -7, start: "09:00", end: "10:30", status: ReservationStatus.CONFIRMED, name: "Karim Jlassi", phone: "+216 98 333 333", email: "karim@email.tn" },
    { partnerIdx: 1, resourceIdx: 1, offsetDays: -2, start: "16:00", end: "17:30", status: ReservationStatus.REJECTED, name: "Leïla Mzoughi", phone: "+216 98 444 444", email: null },
    { partnerIdx: 0, resourceIdx: 0, offsetDays: 1, start: "11:00", end: "12:30", status: ReservationStatus.PENDING, name: "Omar Khelil", phone: "+216 98 555 555", email: "omar@email.tn" },
    { partnerIdx: 1, resourceIdx: 2, offsetDays: 2, start: "14:00", end: "15:30", status: ReservationStatus.PENDING, name: "Inès Bouazizi", phone: "+216 98 666 666", email: "ines@email.tn" },
    { partnerIdx: 2, resourceIdx: 0, offsetDays: 1, start: "10:00", end: "11:30", status: ReservationStatus.CONFIRMED, name: "Hedi Ayari", phone: "+216 98 777 777", email: null },
    { partnerIdx: 2, resourceIdx: 1, offsetDays: 3, start: "09:00", end: "10:30", status: ReservationStatus.PENDING, name: "Maram Sassi", phone: "+216 98 888 888", email: "maram@email.tn" },
    { partnerIdx: 3, resourceIdx: 0, offsetDays: 2, start: "18:00", end: "19:00", status: ReservationStatus.CONFIRMED, name: "Youssef Dhouib", phone: "+216 98 999 999", email: null },
    { partnerIdx: 4, resourceIdx: 0, offsetDays: 1, start: "09:00", end: "10:00", status: ReservationStatus.PENDING, name: "Nour Guiga", phone: "+216 97 101 010", email: "nour@email.tn" },
    { partnerIdx: 4, resourceIdx: 1, offsetDays: 4, start: "12:00", end: "13:30", status: ReservationStatus.PENDING, name: "Selim Rekik", phone: "+216 97 121 212", email: "selim@email.tn" },
    { partnerIdx: 3, resourceIdx: 1, offsetDays: 5, start: "15:00", end: "16:30", status: ReservationStatus.CONFIRMED, name: "Dorra Ben Ammar", phone: "+216 97 131 313", email: "dorra@email.tn" },
    { partnerIdx: 0, resourceIdx: 0, offsetDays: -1, start: "09:00", end: "10:30", status: ReservationStatus.CANCELLED, name: "Fares Haddad", phone: "+216 97 141 414", email: null },
  ];

  let reservationIndex = 1;
  for (const r of reservationsToCreate) {
    const { partner, resources } = createdPartners[r.partnerIdx];
    const resource = resources[r.resourceIdx];
    if (!resource) continue;

    await prisma.reservation.create({
      data: {
        reference: reservationReference(reservationIndex),
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
    reservationIndex += 1;
  }
  console.log(`✓  ${reservationsToCreate.length} réservations créées`);

  // ── 6. Offers ─────────────────────────────────────────────────────────────
  const offersData = [
    {
      partnerIdx: 0,
      title: "Happy Hour Matin",
      description: "De 8h à 12h, votre espace est à moitié prix !",
      discountPercent: 50,
      validFrom: dateStr(0),
      recurrence: "DAILY" as const,
      timeStart: "08:00",
      timeEnd: "12:00",
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 1,
      title: "Offre Week-end",
      description: "Réservez votre véhicule le week-end avec 20% de remise.",
      discountPercent: 20,
      validFrom: dateStr(0),
      validUntil: dateStr(60),
      recurrence: "WEEKEND" as const,
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 2,
      title: "Matinée Bien-être",
      description: "Vos soins du matin (8h-12h) avec une remise exceptionnelle.",
      discountPercent: 30,
      validFrom: dateStr(0),
      recurrence: "WEEKDAY" as const,
      timeStart: "08:00",
      timeEnd: "12:00",
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 3,
      title: "Aventure Fin de Journée",
      description: "Profitez du coucher de soleil avec 20% de remise sur votre session quad.",
      discountPercent: 20,
      validFrom: dateStr(0),
      validUntil: dateStr(30),
      recurrence: "DAILY" as const,
      timeStart: "17:00",
      timeEnd: "20:00",
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 4,
      title: "Zen Matinal",
      description: "Les sessions de yoga sont à -40% de 8h à 12h. Respirez !",
      discountPercent: 40,
      validFrom: dateStr(0),
      recurrence: "DAILY" as const,
      timeStart: "08:00",
      timeEnd: "12:00",
      approvalStatus: ApprovalStatus.APPROVED,
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
        validUntil: o.validUntil ?? null,
        recurrence: o.recurrence,
        timeStart: o.timeStart ?? null,
        timeEnd: o.timeEnd ?? null,
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
║  Admin      admin@reservation.com / Admin123! ║
║  Partenaires  Partner123! (mot de passe)      ║
╠═══════════════════════════════════════════════╣
║  Djerba (Médenine) — 5 Partenaires           ║
║    Coworking Hub Djerba contact@coworking-djerba.tn ║
║    Djerba Rent A Car    resa@djerba-rentacar.tn ║
║    Radisson Spa         spa@radisson-djerba.tn ║
║    Djerba Quad          contact@djerba-quad.tn ║
║    Studio Yoga          hello@djerba-yoga.tn ║
╚═══════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
