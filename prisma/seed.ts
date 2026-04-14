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

type PadelCourtSub = "interior" | "exterior" | "covered";

function padelSubCategoryId(
  subs: { id: string; name: string }[],
  t: PadelCourtSub,
): string | undefined {
  const label: Record<PadelCourtSub, string> = {
    interior: "Padel intérieur",
    exterior: "Padel extérieur",
    covered: "Padel couvert",
  };
  return subs.find((s) => s.name === label[t])?.id;
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
      imageUrl: picsum("category-padel", 1200, 675),
      subCategories: {
        create: [
          { name: "Padel extérieur", defaultDurationMin: 90 },
          { name: "Padel intérieur", defaultDurationMin: 90 },
          { name: "Padel couvert", defaultDurationMin: 60 },
        ],
      },
    },
  });

  console.log(`✓  Catégories : ${catPadel.name}`);

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

  // ── 4. Partners (Djerba — Médenine) ────────────────────────────────────────
  const padelSubList = await prisma.subCategory.findMany({
    where: { categoryId: catPadel.id },
  });

  const partnersData = [
    {
      email: "contact@bourgo-arena.djerba.tn",
      password: "Partner123!",
      name: "Bourgo Arena Padel Djerba",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 123 001",
      address: "Inside Bourgo Mall, Midoun, Djerba",
      categoryId: catPadel.id,
      packId: packPlatinum.id,
      isVerified: true,
      description:
        "A premier indoor sports complex featuring two latest-generation indoor padel courts. Known for its high ceilings and professional LED lighting, it offers a premium experience regardless of weather.",
      keyFeatures: [
        "2 Indoor Courts",
        "Professional Coaching",
        "Racket Rental",
        "Changing Rooms",
      ],
      courts: [
        { name: "Court Indoor 1", subType: "interior" as const },
        { name: "Court Indoor 2", subType: "interior" as const },
      ],
      logo: picsum("bourgo-arena-padel-djerba-logo", 256, 256),
      coverImage: picsum("bourgo-arena-padel-djerba-cover", 1600, 900),
    },
    {
      email: "padel@radisson-djerba.tn",
      password: "Partner123!",
      name: "Padel Club Djerba Radisson",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 002",
      address: "Zone Touristique, Houmt Souk, Djerba (Radisson Blu Palace Resort)",
      categoryId: catPadel.id,
      packId: packGold.id,
      isVerified: true,
      description:
        "Located within the prestigious Radisson Blu Palace Resort, this club offers outdoor courts with a luxury resort vibe. Ideal for those who enjoy playing near the sea with access to high-end hotel amenities.",
      keyFeatures: ["3 Outdoor Courts", "Resort Access", "Parking", "High-end Infrastructure"],
      courts: [
        { name: "Court Outdoor 1", subType: "exterior" as const },
        { name: "Court Outdoor 2", subType: "exterior" as const },
        { name: "Court Outdoor 3", subType: "exterior" as const },
      ],
      logo: picsum("radisson-padel-club-djerba-logo", 256, 256),
      coverImage: picsum("radisson-padel-club-djerba-cover", 1600, 900),
    },
    {
      email: "padel@clubmed-djerba.tn",
      password: "Partner123!",
      name: "Club Med Padel Center",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 123 003",
      address: "Club Med Djerba La Douce, Midoun, Djerba",
      categoryId: catPadel.id,
      packId: packGold.id,
      isVerified: true,
      description:
        "Part of the Club Med complex, this center offers a friendly and social atmosphere. While often reserved for residents, it frequently hosts tournaments and open sessions for the local padel community.",
      keyFeatures: ["Multiple Courts", "Social Environment", "Tourist-friendly"],
      courts: [
        { name: "Court Central 1", subType: "exterior" as const },
        { name: "Court Central 2", subType: "exterior" as const },
        { name: "Court Central 3", subType: "covered" as const },
      ],
      logo: picsum("club-med-padel-center-djerba-logo", 256, 256),
      coverImage: picsum("club-med-padel-center-djerba-cover", 1600, 900),
    },
    {
      email: "contact@countryclub-djerba.tn",
      password: "Partner123!",
      name: "Country Club Padel Djerba",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 004",
      address: "Route de Houmt Souk, Djerba",
      categoryId: catPadel.id,
      packId: packGold.id,
      isVerified: true,
      description:
        "A vibrant sports hub known for its community atmosphere and well-maintained courts. It is a favorite for local players and expats, offering a mix of competitive play and social events. The club is recognized for its high-quality synthetic turf and professional lighting for night sessions.",
      keyFeatures: [
        "2 Outdoor Panorama Courts",
        "Social Lounge/Cafe",
        "Equipment Shop",
        "Night Lighting",
      ],
      courts: [
        { name: "Court Panorama 1", subType: "exterior" as const },
        { name: "Court Panorama 2", subType: "exterior" as const },
      ],
      logo: picsum("country-club-padel-djerba-logo", 256, 256),
      coverImage: picsum("country-club-padel-djerba-cover", 1600, 900),
    },
    {
      email: "contact@padel-sidisalem.tn",
      password: "Partner123!",
      name: "Padel Sidi Salem - Sassi Stadium",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 123 005",
      address: "Sidi Salem Beach Area, Houmt Souk, Djerba",
      categoryId: catPadel.id,
      packId: packSilver.id,
      isVerified: true,
      description:
        'Part of a larger multi-sport complex, this facility offers a unique playing experience near the scenic Sidi Salem coast. It is highly rated for its "fair-play" philosophy and modern infrastructure. It often hosts "Padel Prestige" sessions and local tournaments.',
      keyFeatures: [
        "2 High-Spec Outdoor Courts",
        "Multi-sport facilities (Football/Tennis nearby)",
        "Changing Rooms",
        "Beach Proximity",
      ],
      courts: [
        { name: "Court Sassi 1", subType: "exterior" as const },
        { name: "Court Sassi 2", subType: "exterior" as const },
      ],
      logo: picsum("padel-sidi-salem-sassi-stadium-logo", 256, 256),
      coverImage: picsum("padel-sidi-salem-sassi-stadium-cover", 1600, 900),
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

    // Create resources (courts) with padel sub-category + hourly price
    const resources = await Promise.all(
      p.courts.map((court, i) => {
        const subId = padelSubCategoryId(padelSubList, court.subType);
        return prisma.resource.create({
          data: {
            partnerId: partner.id,
            name: court.name,
            capacity: 4,
            isActive: true,
            subCategoryId: subId,
            pricePerHour: 100, // Base price for Djerba courts
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
    console.log(`  ✓  ${p.name} (${p.city}) — ${p.courts.length} terrain(s)`);
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
      title: "Happy Hour Matinal",
      description: "De 8h à 12h, le terrain est à seulement 40 DT / heure !",
      discountPercent: 60,
      validFrom: dateStr(-2),
      validUntil: dateStr(30),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 1,
      title: "Offre Après-Midi",
      description: "De 12h à 17h, profitez du terrain pour 80 DT / heure.",
      discountPercent: 20,
      validFrom: dateStr(0),
      validUntil: dateStr(14),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 2,
      title: "Matinée Padel",
      description: "Votre session du matin (8h-12h) est à 40 DT / heure.",
      discountPercent: 60,
      validFrom: dateStr(-7),
      validUntil: dateStr(60),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 3,
      title: "Créneaux Creux",
      description: "Réservez entre 12h et 17h et payez 80 DT au lieu de 100 DT.",
      discountPercent: 20,
      validFrom: dateStr(0),
      validUntil: dateStr(21),
      approvalStatus: ApprovalStatus.APPROVED,
    },
    {
      partnerIdx: 4,
      title: "Padel Prestige Matin",
      description: "Les terrains sont à 40 DT de 8h à 12h. Profitez-en !",
      discountPercent: 60,
      validFrom: dateStr(-3),
      validUntil: dateStr(45),
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
║  Djerba (Médenine) — 5 clubs                  ║
║    Bourgo Arena Padel   contact@bourgo-arena.djerba.tn ║
║    Radisson Padel       padel@radisson-djerba.tn ║
║    Club Med Padel       padel@clubmed-djerba.tn ║
║    Country Club Padel   contact@countryclub-djerba.tn ║
║    Padel Sidi Salem     contact@padel-sidisalem.tn ║
╚═══════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
