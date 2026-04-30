import {
  PrismaClient,
  UserRole,
  UserStatus,
  DayOfWeek,
  ReservationStatus,
  ApprovalStatus,
  CategoryType,
  BookingUnit,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hash = (p: string) => bcrypt.hash(p, 10);

function reservationReference(index: number): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `RES-${y}${m}-${String(index).padStart(4, "0")}`;
}

function picsum(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed.replace(/\s+/g, "-").slice(0, 80))}/${w}/${h}`;
}

function dateStr(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DAYS_ALL: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY",
  "FRIDAY", "SATURDAY", "SUNDAY",
];
const DAYS_WD: DayOfWeek[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY",
];
const DAYS_WE: DayOfWeek[] = ["SATURDAY", "SUNDAY"];

async function main() {
  console.log("Starting seed…\n");

  // ── 0. Clean slate ──────────────────────────────────────────────────────────
  await prisma.matchJoinRequest.deleteMany();
  await prisma.matchPost.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reservationFacture.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  console.log("Database cleaned\n");

  // ── 1. Packs ────────────────────────────────────────────────────────────────
  const [packStarter, packPro, packBusiness] = await Promise.all([
    prisma.pack.create({
      data: {
        name: "Starter",
        maxResources: 2,
        features: ["Tableau de bord", "Réservations illimitées"],
        priceMonthly: 0,
      },
    }),
    prisma.pack.create({
      data: {
        name: "Pro",
        maxResources: 8,
        features: [
          "Tableau de bord",
          "Réservations illimitées",
          "Offres promotionnelles",
          "Statistiques",
        ],
        priceMonthly: 39,
      },
    }),
    prisma.pack.create({
      data: {
        name: "Business",
        maxResources: 30,
        features: [
          "Tableau de bord",
          "Réservations illimitées",
          "Offres promotionnelles",
          "Statistiques avancées",
          "Support prioritaire",
          "Accès API",
        ],
        priceMonthly: 99,
      },
    }),
  ]);
  console.log("Packs: Starter / Pro / Business");

  // ── 2. Categories ────────────────────────────────────────────────────────────

  const catVehicles = await prisma.category.create({
    data: {
      name: "Location de Véhicules",
      slug: "vehicules",
      imageUrl: picsum("cat-vehicles-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Voiture", defaultDurationMin: 1440 },
          { name: "Quad & Buggy", defaultDurationMin: 120 },
          { name: "Scooter & Moto", defaultDurationMin: 480 },
          { name: "Vélo", defaultDurationMin: 240 },
        ],
      },
    },
  });

  const catCoworking = await prisma.category.create({
    data: {
      name: "Bureaux & Espaces",
      slug: "bureaux",
      imageUrl: picsum("cat-coworking-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Salle de réunion", defaultDurationMin: 60 },
          { name: "Bureau privé", defaultDurationMin: 480 },
          { name: "Open space journalier", defaultDurationMin: 480 },
          { name: "Salle de formation", defaultDurationMin: 120 },
        ],
      },
    },
  });

  const catEquipement = await prisma.category.create({
    data: {
      name: "Équipements & Matériel",
      slug: "equipements",
      imageUrl: picsum("cat-equipment-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Matériel photo/vidéo", defaultDurationMin: 480 },
          { name: "Matériel événementiel", defaultDurationMin: 480 },
          { name: "Outillage BTP", defaultDurationMin: 480 },
          { name: "Équipement sportif", defaultDurationMin: 120 },
        ],
      },
    },
  });

  const catNautique = await prisma.category.create({
    data: {
      name: "Activités Nautiques",
      slug: "nautique",
      imageUrl: picsum("cat-nautique-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Jet ski", defaultDurationMin: 30 },
          { name: "Paddle & Kayak", defaultDurationMin: 60 },
          { name: "Bateau & Voilier", defaultDurationMin: 240 },
          { name: "Plongée", defaultDurationMin: 120 },
        ],
      },
    },
  });

  const catSports = await prisma.category.create({
    data: {
      name: "Sports & Terrains",
      slug: "sports",
      imageUrl: picsum("cat-sports-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Padel", defaultDurationMin: 90 },
          { name: "Tennis", defaultDurationMin: 60 },
          { name: "Football", defaultDurationMin: 90 },
          { name: "Beach volleyball", defaultDurationMin: 60 },
        ],
      },
    },
  });

  const catBienEtre = await prisma.category.create({
    data: {
      name: "Bien-être & Spa",
      slug: "bien-etre",
      imageUrl: picsum("cat-spa-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Massage", defaultDurationMin: 60 },
          { name: "Hammam & Gommage", defaultDurationMin: 60 },
          { name: "Yoga & Méditation", defaultDurationMin: 60 },
          { name: "Soins esthétiques", defaultDurationMin: 45 },
        ],
      },
    },
  });

  const catHebergement = await prisma.category.create({
    data: {
      name: "Hébergements Atypiques",
      slug: "hebergement",
      imageUrl: picsum("cat-hebergement-djerba", 1200, 675),
      subCategories: {
        create: [
          { name: "Villa avec piscine", defaultDurationMin: 1440 },
          { name: "Riad & Maison d'hôte", defaultDurationMin: 1440 },
          { name: "Bungalow bord de mer", defaultDurationMin: 1440 },
        ],
      },
    },
  });

  console.log("7 categories created");

  // ── Sub-category lookup helpers ─────────────────────────────────────────────
  const subVeh   = await prisma.subCategory.findMany({ where: { categoryId: catVehicles.id } });
  const subCow   = await prisma.subCategory.findMany({ where: { categoryId: catCoworking.id } });
  const subEq    = await prisma.subCategory.findMany({ where: { categoryId: catEquipement.id } });
  const subNau   = await prisma.subCategory.findMany({ where: { categoryId: catNautique.id } });
  const subSpt   = await prisma.subCategory.findMany({ where: { categoryId: catSports.id } });
  const subSpa   = await prisma.subCategory.findMany({ where: { categoryId: catBienEtre.id } });
  const subHeb   = await prisma.subCategory.findMany({ where: { categoryId: catHebergement.id } });

  const sid = (list: { id: string; name: string }[], name: string) =>
    list.find((s) => s.name === name)?.id;

  // ── 3. Super Admin ──────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: "admin@rentzone.tn",
      password: await hash("Admin123!"),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log("Admin: admin@rentzone.tn / Admin123!");

  // ── 4. Partners ─────────────────────────────────────────────────────────────
  type ResourceSeed = {
    name: string;
    subId: string | undefined;
    categoryType: CategoryType;
    bookingUnit: BookingUnit;
    price: number;
    capacity?: number;
    days?: DayOfWeek[];
    startTime?: string;
    endTime?: string;
    slotIntervalMin?: number;
  };

  type PartnerSeed = {
    email: string;
    name: string;
    city: string;
    governorate: string;
    phone: string;
    address: string;
    categoryId: string;
    packId: string;
    isVerified: boolean;
    description: string;
    keyFeatures: string[];
    resources: ResourceSeed[];
    logo: string;
    coverImage: string;
  };

  const partners: PartnerSeed[] = [
    // ── Vehicles ──────────────────────────────────────────────────────────────
    {
      email: "resa@djerbacarrental.tn",
      name: "Djerba Car Rental",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 100",
      address: "Route de l'Aéroport, Houmt Souk, Djerba",
      categoryId: catVehicles.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Premier loueur de véhicules à Djerba. Flotte récente, kilométrage illimité et livraison à l'hôtel ou à l'aéroport.",
      keyFeatures: ["Kilométrage illimité", "Assurance tous risques", "Livraison hôtel/aéroport", "Flotte 2022-2024"],
      logo: picsum("djerba-car-logo", 400, 400),
      coverImage: picsum("djerba-car-cover", 1600, 900),
      resources: [
        { name: "Clio 5 Manuelle", subId: sid(subVeh, "Voiture"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 110, days: DAYS_ALL, startTime: "07:00", endTime: "22:00", slotIntervalMin: 1440 },
        { name: "Polo 8 Automatique", subId: sid(subVeh, "Voiture"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 145, days: DAYS_ALL, startTime: "07:00", endTime: "22:00", slotIntervalMin: 1440 },
        { name: "Duster 4x4 SUV", subId: sid(subVeh, "Voiture"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 180, days: DAYS_ALL, startTime: "07:00", endTime: "22:00", slotIntervalMin: 1440 },
        { name: "Scooter 125cc", subId: sid(subVeh, "Scooter & Moto"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 55, days: DAYS_ALL, startTime: "08:00", endTime: "20:00", slotIntervalMin: 480 },
        { name: "Vélo de ville", subId: sid(subVeh, "Vélo"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 8, days: DAYS_ALL, startTime: "08:00", endTime: "19:00", slotIntervalMin: 60 },
      ],
    },
    {
      email: "aventure@djerba-quad.tn",
      name: "Djerba Quad Aventures",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 650 200",
      address: "Route de Midoun, Km 3, Djerba",
      categoryId: catVehicles.id,
      packId: packPro.id,
      isVerified: true,
      description: "Partez à la découverte de Djerba sur nos quads et buggys. Circuits guidés ou libres sur les plages et pistes intérieures.",
      keyFeatures: ["Circuits guidés", "Matériel de sécurité fourni", "Groupes & familles bienvenus"],
      logo: picsum("djerba-quad-logo", 400, 400),
      coverImage: picsum("djerba-quad-cover", 1600, 900),
      resources: [
        { name: "Quad 250cc — Circuit 1h", subId: sid(subVeh, "Quad & Buggy"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 45, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 60 },
        { name: "Quad 250cc — Demi-journée", subId: sid(subVeh, "Quad & Buggy"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 38, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 120 },
        { name: "Buggy 2 places", subId: sid(subVeh, "Quad & Buggy"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 70, days: DAYS_ALL, startTime: "09:00", endTime: "17:00", slotIntervalMin: 120 },
      ],
    },

    // ── Bureaux / Coworking ────────────────────────────────────────────────────
    {
      email: "hello@djerbacowork.tn",
      name: "Djerba Coworking Hub",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 300",
      address: "Rue Moncef Bey, Houmt Souk, Djerba",
      categoryId: catCoworking.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Le premier espace de coworking de Djerba. Fibre optique 1Gbps, salles climatisées, café et snacks inclus. Idéal pour nomades numériques et équipes en déplacement.",
      keyFeatures: ["Fibre 1 Gbps", "Café & snacks inclus", "Imprimante & scanner", "Climatisation"],
      logo: picsum("djerbacowork-logo", 400, 400),
      coverImage: picsum("djerbacowork-cover", 1600, 900),
      resources: [
        { name: "Poste Open Space (journée)", subId: sid(subCow, "Open space journalier"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 25, days: DAYS_WD, startTime: "08:00", endTime: "20:00", slotIntervalMin: 1440 },
        { name: "Bureau Privé — Demi-journée", subId: sid(subCow, "Bureau privé"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 40, days: DAYS_WD, startTime: "08:00", endTime: "20:00", slotIntervalMin: 240 },
        { name: "Salle de réunion (6 pers.)", subId: sid(subCow, "Salle de réunion"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 35, days: DAYS_WD, startTime: "08:00", endTime: "20:00", slotIntervalMin: 60 },
        { name: "Salle de formation (20 pers.)", subId: sid(subCow, "Salle de formation"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 80, capacity: 20, days: DAYS_WD, startTime: "08:00", endTime: "18:00", slotIntervalMin: 120 },
      ],
    },
    {
      email: "contact@medina-office.tn",
      name: "Médina Office Center",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 310",
      address: "Zone Franche, Houmt Souk",
      categoryId: catCoworking.id,
      packId: packPro.id,
      isVerified: true,
      description: "Bureaux équipés en plein cœur de la zone franche de Djerba. Location à la journée ou à la semaine.",
      keyFeatures: ["Zone franche", "Parking gratuit", "Climatisation", "Accès H24"],
      logo: picsum("medina-office-logo", 400, 400),
      coverImage: picsum("medina-office-cover", 1600, 900),
      resources: [
        { name: "Bureau individuel", subId: sid(subCow, "Bureau privé"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 60, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
        { name: "Salle de réunion (10 pers.)", subId: sid(subCow, "Salle de réunion"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 50, capacity: 10, days: DAYS_WD, startTime: "08:00", endTime: "20:00", slotIntervalMin: 60 },
      ],
    },

    // ── Équipements ─────────────────────────────────────────────────────────────
    {
      email: "location@djerba-media.tn",
      name: "Djerba Media Location",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 400",
      address: "Marina, Houmt Souk, Djerba",
      categoryId: catEquipement.id,
      packId: packPro.id,
      isVerified: true,
      description: "Location de matériel photo et vidéo professionnel pour vos tournages, événements et projets créatifs à Djerba.",
      keyFeatures: ["Matériel Sony & Canon", "Drone FPV inclus", "Livraison sur Djerba", "Technicien disponible"],
      logo: picsum("djerba-media-logo", 400, 400),
      coverImage: picsum("djerba-media-cover", 1600, 900),
      resources: [
        { name: "Appareil Sony A7IV + objectif", subId: sid(subEq, "Matériel photo/vidéo"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 120, days: DAYS_ALL, startTime: "08:00", endTime: "20:00", slotIntervalMin: 1440 },
        { name: "Drone DJI Air 3 + pilote", subId: sid(subEq, "Matériel photo/vidéo"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 150, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 60 },
        { name: "Kit éclairage LED studio", subId: sid(subEq, "Matériel photo/vidéo"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 60, days: DAYS_ALL, startTime: "08:00", endTime: "20:00", slotIntervalMin: 1440 },
        { name: "Sonorisation événementielle", subId: sid(subEq, "Matériel événementiel"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 200, days: DAYS_ALL, startTime: "08:00", endTime: "22:00", slotIntervalMin: 1440 },
      ],
    },
    {
      email: "contact@djerba-sport-eq.tn",
      name: "Sport & Équip Djerba",
      city: "Aghir",
      governorate: "Médenine",
      phone: "+216 75 650 410",
      address: "Route Touristique Aghir, Djerba",
      categoryId: catEquipement.id,
      packId: packStarter.id,
      isVerified: true,
      description: "Location d'équipements sportifs pour la plage et les loisirs. Accessoires de snorkeling, kitesurf, pétanque et tennis.",
      keyFeatures: ["Caution simplifiée", "Livraison sur plage", "Nettoyage inclus"],
      logo: picsum("sport-eq-logo", 400, 400),
      coverImage: picsum("sport-eq-cover", 1600, 900),
      resources: [
        { name: "Kit Snorkeling complet", subId: sid(subEq, "Équipement sportif"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 12, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 60 },
        { name: "Raquettes Tennis + balles (2h)", subId: sid(subEq, "Équipement sportif"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 15, days: DAYS_ALL, startTime: "08:00", endTime: "19:00", slotIntervalMin: 60 },
      ],
    },

    // ── Nautique ─────────────────────────────────────────────────────────────────
    {
      email: "marine@djerba-jetski.tn",
      name: "Djerba Jet Ski & Water Sports",
      city: "Aghir",
      governorate: "Médenine",
      phone: "+216 75 650 500",
      address: "Plage Aghir, Route Touristique, Djerba",
      categoryId: catNautique.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Sensations fortes garanties sur nos jet skis dernière génération. Location libre ou avec accompagnateur. Baptêmes de mer pour enfants et adultes.",
      keyFeatures: ["Jet ski 4-temps", "Moniteur certifié", "Gilets fournis", "Séance découverte disponible"],
      logo: picsum("djerba-jetski-logo", 400, 400),
      coverImage: picsum("djerba-jetski-cover", 1600, 900),
      resources: [
        { name: "Jet Ski Yamaha — 30 min", subId: sid(subNau, "Jet ski"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.MINUTES, price: 60, days: DAYS_ALL, startTime: "09:00", endTime: "18:00", slotIntervalMin: 30 },
        { name: "Jet Ski Yamaha — 1h", subId: sid(subNau, "Jet ski"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.MINUTES, price: 110, days: DAYS_ALL, startTime: "09:00", endTime: "18:00", slotIntervalMin: 60 },
        { name: "Paddle double (2h)", subId: sid(subNau, "Paddle & Kayak"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 25, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 60 },
        { name: "Kayak simple (journée)", subId: sid(subNau, "Paddle & Kayak"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.DAYS, price: 40, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 1440 },
      ],
    },
    {
      email: "plongee@djerba-diving.tn",
      name: "Djerba Blue Diving Center",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 510",
      address: "Port de Houmt Souk, Djerba",
      categoryId: catNautique.id,
      packId: packPro.id,
      isVerified: true,
      description: "Centre de plongée PADI. Explorez les fonds marins de Djerba avec nos moniteurs certifiés. Baptêmes, formations et sorties guidées.",
      keyFeatures: ["Moniteurs PADI", "Matériel professionnel", "Bateaux 12 personnes", "Photos sous-marines"],
      logo: picsum("djerba-diving-logo", 400, 400),
      coverImage: picsum("djerba-diving-cover", 1600, 900),
      resources: [
        { name: "Baptême de plongée (1 immersion)", subId: sid(subNau, "Plongée"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 80, capacity: 6, days: DAYS_ALL, startTime: "08:00", endTime: "16:00", slotIntervalMin: 120 },
        { name: "Sortie plongée 2 immersions", subId: sid(subNau, "Plongée"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 130, capacity: 8, days: DAYS_ALL, startTime: "08:00", endTime: "14:00", slotIntervalMin: 240 },
        { name: "Bateau privé demi-journée (12 pers.)", subId: sid(subNau, "Bateau & Voilier"), categoryType: CategoryType.ITEM, bookingUnit: BookingUnit.HOURS, price: 350, capacity: 12, days: DAYS_ALL, startTime: "08:00", endTime: "18:00", slotIntervalMin: 240 },
      ],
    },

    // ── Sports ───────────────────────────────────────────────────────────────────
    {
      email: "padel@djerba-arena.tn",
      name: "Djerba Padel Arena",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 600",
      address: "Zone Résidentielle El Kantaoui, Djerba",
      categoryId: catSports.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Le complexe sportif de référence à Djerba. 4 courts de padel couverts, 2 courts de tennis et terrain de football 5v5. Éclairage LED, vestiaires et buvette.",
      keyFeatures: ["4 courts padel couverts", "2 courts tennis", "Football 5v5", "Location de raquettes"],
      logo: picsum("djerba-padel-logo", 400, 400),
      coverImage: picsum("djerba-padel-cover", 1600, 900),
      resources: [
        { name: "Court Padel 1", subId: sid(subSpt, "Padel"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.MINUTES, price: 35, capacity: 4, days: DAYS_ALL, startTime: "08:00", endTime: "23:00", slotIntervalMin: 90 },
        { name: "Court Padel 2", subId: sid(subSpt, "Padel"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.MINUTES, price: 35, capacity: 4, days: DAYS_ALL, startTime: "08:00", endTime: "23:00", slotIntervalMin: 90 },
        { name: "Court Tennis A", subId: sid(subSpt, "Tennis"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.MINUTES, price: 25, capacity: 4, days: DAYS_ALL, startTime: "08:00", endTime: "22:00", slotIntervalMin: 60 },
        { name: "Football 5v5 (terrain)", subId: sid(subSpt, "Football"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.MINUTES, price: 80, capacity: 10, days: DAYS_ALL, startTime: "08:00", endTime: "23:00", slotIntervalMin: 90 },
      ],
    },
    {
      email: "beach@djerba-club.tn",
      name: "Djerba Beach Sport Club",
      city: "Aghir",
      governorate: "Médenine",
      phone: "+216 75 650 610",
      address: "Plage de Sidi Mahrez, Aghir, Djerba",
      categoryId: catSports.id,
      packId: packPro.id,
      isVerified: true,
      description: "Club de sports de plage face à la mer. Beach volleyball, beach soccer et padel de plage. Ambiance décontractée et vue imprenable.",
      keyFeatures: ["Bord de mer", "Filets et ballons fournis", "Lumières nocturnes", "Bar & snacks"],
      logo: picsum("djerba-beach-logo", 400, 400),
      coverImage: picsum("djerba-beach-cover", 1600, 900),
      resources: [
        { name: "Beach Volleyball (2h)", subId: sid(subSpt, "Beach volleyball"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.HOURS, price: 20, capacity: 12, days: DAYS_ALL, startTime: "08:00", endTime: "22:00", slotIntervalMin: 60 },
        { name: "Padel Beach (1h30)", subId: sid(subSpt, "Padel"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.MINUTES, price: 30, capacity: 4, days: DAYS_ALL, startTime: "08:00", endTime: "21:00", slotIntervalMin: 90 },
      ],
    },

    // ── Bien-être ─────────────────────────────────────────────────────────────────
    {
      email: "thalasso@dar-jerba.tn",
      name: "Dar Djerba Thalasso & Spa",
      city: "Houmt Souk",
      governorate: "Médenine",
      phone: "+216 75 650 700",
      address: "Zone Touristique Nord, Houmt Souk",
      categoryId: catBienEtre.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Centre de thalassothérapie premium face à la mer. Massages, hammam traditionnel, soins du visage et yoga matinal. Produits 100% naturels.",
      keyFeatures: ["Vue sur mer", "Thérapeutes certifiés", "Produits naturels", "Piscine eau de mer"],
      logo: picsum("dar-jerba-spa-logo", 400, 400),
      coverImage: picsum("dar-jerba-spa-cover", 1600, 900),
      resources: [
        { name: "Massage relaxant (1h)", subId: sid(subSpa, "Massage"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 120, days: DAYS_ALL, startTime: "09:00", endTime: "19:00", slotIntervalMin: 60 },
        { name: "Massage sportif (1h)", subId: sid(subSpa, "Massage"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 130, days: DAYS_ALL, startTime: "09:00", endTime: "19:00", slotIntervalMin: 60 },
        { name: "Hammam traditionnel + gommage", subId: sid(subSpa, "Hammam & Gommage"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 75, days: DAYS_ALL, startTime: "09:00", endTime: "19:00", slotIntervalMin: 90 },
        { name: "Soin visage éclat", subId: sid(subSpa, "Soins esthétiques"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 85, days: DAYS_WD, startTime: "10:00", endTime: "18:00", slotIntervalMin: 60 },
      ],
    },
    {
      email: "yoga@djerba-zen.tn",
      name: "Djerba Zen Studio",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 650 710",
      address: "Marina de Midoun, Djerba",
      categoryId: catBienEtre.id,
      packId: packStarter.id,
      isVerified: true,
      description: "Studio de yoga et méditation en plein air, face à la mer. Cours collectifs et séances privées. Hatha, Vinyasa, Yin et yoga pour enfants.",
      keyFeatures: ["Cours en plein air", "Tapis fournis", "Petits groupes (max 10)", "Vue sur mer"],
      logo: picsum("djerba-zen-logo", 400, 400),
      coverImage: picsum("djerba-zen-cover", 1600, 900),
      resources: [
        { name: "Cours collectif Vinyasa (1h)", subId: sid(subSpa, "Yoga & Méditation"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 30, capacity: 10, days: DAYS_ALL, startTime: "07:00", endTime: "20:00", slotIntervalMin: 60 },
        { name: "Séance privée Hatha (1h)", subId: sid(subSpa, "Yoga & Méditation"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 90, days: DAYS_ALL, startTime: "07:00", endTime: "20:00", slotIntervalMin: 60 },
        { name: "Méditation guidée (45min)", subId: sid(subSpa, "Yoga & Méditation"), categoryType: CategoryType.SERVICE, bookingUnit: BookingUnit.MINUTES, price: 20, capacity: 15, days: DAYS_ALL, startTime: "07:00", endTime: "11:00", slotIntervalMin: 60 },
      ],
    },

    // ── Hébergement ───────────────────────────────────────────────────────────────
    {
      email: "villa@jerba-dream.tn",
      name: "Jerba Dream Villas",
      city: "Midoun",
      governorate: "Médenine",
      phone: "+216 75 650 800",
      address: "Route de la plage, Midoun, Djerba",
      categoryId: catHebergement.id,
      packId: packBusiness.id,
      isVerified: true,
      description: "Location de villas de luxe avec piscine privée à Djerba. Maisons traditionnelles et villas modernes pour 4 à 16 personnes. Linge de maison et ménage inclus.",
      keyFeatures: ["Piscines privées", "Jardin & barbecue", "Ménage quotidien", "Accueil personnalisé"],
      logo: picsum("jerba-dream-logo", 400, 400),
      coverImage: picsum("jerba-dream-cover", 1600, 900),
      resources: [
        { name: "Villa Jasmin — 4 pers.", subId: sid(subHeb, "Villa avec piscine"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 380, capacity: 4, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
        { name: "Villa Bougainvillier — 8 pers.", subId: sid(subHeb, "Villa avec piscine"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 620, capacity: 8, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
        { name: "Riad El Amel — 6 pers.", subId: sid(subHeb, "Riad & Maison d'hôte"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 420, capacity: 6, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
      ],
    },
    {
      email: "bungalow@djerba-plage.tn",
      name: "Djerba Plage Bungalows",
      city: "Aghir",
      governorate: "Médenine",
      phone: "+216 75 650 810",
      address: "Plage d'Aghir, Route Touristique",
      categoryId: catHebergement.id,
      packId: packPro.id,
      isVerified: true,
      description: "Bungalows en bois face à la mer, à 10 mètres de la plage. Ambiance naturelle, terrasse privée et petit-déjeuner inclus.",
      keyFeatures: ["Face à la mer", "Terrasse privée", "Petit-déj inclus", "Accès direct plage"],
      logo: picsum("djerba-bungalow-logo", 400, 400),
      coverImage: picsum("djerba-bungalow-cover", 1600, 900),
      resources: [
        { name: "Bungalow Mer — 2 pers.", subId: sid(subHeb, "Bungalow bord de mer"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 185, capacity: 2, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
        { name: "Bungalow Familial — 4 pers.", subId: sid(subHeb, "Bungalow bord de mer"), categoryType: CategoryType.SPACE, bookingUnit: BookingUnit.DAYS, price: 280, capacity: 4, days: DAYS_ALL, startTime: "00:00", endTime: "23:59", slotIntervalMin: 1440 },
      ],
    },
  ];

  const created: { resources: { id: string }[] }[] = [];

  for (const p of partners) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        password: await hash("Partner123!"),
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
        settings: { description: p.description, keyFeatures: p.keyFeatures },
      },
    });

    const resources = await Promise.all(
      p.resources.map((r) =>
        prisma.resource.create({
          data: {
            partnerId: partner.id,
            name: r.name,
            capacity: r.capacity ?? 4,
            isActive: true,
            subCategoryId: r.subId ?? null,
            price: r.price,
            categoryType: r.categoryType,
            bookingUnit: r.bookingUnit,
          },
        }),
      ),
    );

    for (let i = 0; i < resources.length; i++) {
      const r = p.resources[i]!;
      const res = resources[i]!;
      const days = r.days ?? DAYS_ALL;
      for (const day of days) {
        await prisma.availability.create({
          data: {
            resourceId: res.id,
            dayOfWeek: day,
            startTime: r.startTime ?? "08:00",
            endTime: r.endTime ?? "22:00",
            slotIntervalMin: r.slotIntervalMin ?? 60,
          },
        });
      }
    }

    created.push({ resources });
    console.log(`  ${p.name} (${p.city}) — ${p.resources.length} ressources`);
  }

  console.log(`\n${created.length} partenaires créés`);

  // ── 5. Sample reservations ───────────────────────────────────────────────────
  const guests = [
    { name: "Amine Ben Salah",   phone: "+216 98 111 111", email: "amine@email.tn" },
    { name: "Sarra Trabelsi",    phone: "+216 98 222 222", email: "sarra@email.tn" },
    { name: "Karim Jlassi",      phone: "+216 98 333 333", email: "karim@email.tn" },
    { name: "Leïla Mzoughi",     phone: "+216 98 444 444", email: null },
    { name: "Omar Khelil",       phone: "+216 98 555 555", email: "omar@email.tn" },
    { name: "Inès Bouazizi",     phone: "+216 98 666 666", email: "ines@email.tn" },
    { name: "Hedi Ayari",        phone: "+216 98 777 777", email: null },
    { name: "Maram Sassi",       phone: "+216 98 888 888", email: "maram@email.tn" },
    { name: "Youssef Dhouib",    phone: "+216 98 999 999", email: null },
    { name: "Nour Guiga",        phone: "+216 97 101 010", email: "nour@email.tn" },
    { name: "Selim Rekik",       phone: "+216 97 121 212", email: "selim@email.tn" },
    { name: "Dorra Ben Ammar",   phone: "+216 97 131 313", email: "dorra@email.tn" },
    { name: "Fares Haddad",      phone: "+216 97 141 414", email: null },
    { name: "Rania Boubaker",    phone: "+216 97 151 515", email: "rania@email.tn" },
    { name: "Zied Mansouri",     phone: "+216 97 161 616", email: "zied@email.tn" },
  ];

  const reservationSeeds = [
    { pi: 0, ri: 0, offset: -5, start: "10:00", end: "11:00", status: ReservationStatus.CONFIRMED, gi: 0 },
    { pi: 0, ri: 1, offset: -3, start: "09:00", end: "10:00", status: ReservationStatus.CONFIRMED, gi: 1 },
    { pi: 0, ri: 3, offset: -1, start: "08:00", end: "10:00", status: ReservationStatus.CANCELLED, gi: 2 },
    { pi: 1, ri: 0, offset: -7, start: "09:00", end: "11:00", status: ReservationStatus.CONFIRMED, gi: 3 },
    { pi: 1, ri: 2, offset: 1, start: "10:00", end: "12:00", status: ReservationStatus.PENDING, gi: 4 },
    { pi: 2, ri: 0, offset: 0, start: "08:00", end: "09:00", status: ReservationStatus.CONFIRMED, gi: 5 },
    { pi: 2, ri: 2, offset: 1, start: "14:00", end: "15:00", status: ReservationStatus.PENDING, gi: 6 },
    { pi: 4, ri: 0, offset: -2, start: "10:00", end: "11:00", status: ReservationStatus.CONFIRMED, gi: 7 },
    { pi: 5, ri: 0, offset: 1, start: "11:00", end: "11:30", status: ReservationStatus.PENDING, gi: 8 },
    { pi: 6, ri: 0, offset: 0, start: "09:00", end: "11:00", status: ReservationStatus.CONFIRMED, gi: 9 },
    { pi: 7, ri: 0, offset: -4, start: "10:00", end: "11:30", status: ReservationStatus.CONFIRMED, gi: 10 },
    { pi: 8, ri: 0, offset: 2, start: "08:00", end: "09:30", status: ReservationStatus.PENDING, gi: 11 },
    { pi: 9, ri: 0, offset: 1, start: "18:00", end: "19:30", status: ReservationStatus.CONFIRMED, gi: 12 },
    { pi: 10, ri: 0, offset: -1, start: "09:00", end: "10:00", status: ReservationStatus.CONFIRMED, gi: 13 },
    { pi: 11, ri: 0, offset: 3, start: "10:00", end: "11:00", status: ReservationStatus.PENDING, gi: 14 },
  ];

  let idx = 1;
  for (const s of reservationSeeds) {
    const pEntry = created[s.pi];
    if (!pEntry) continue;
    const res = pEntry.resources[s.ri];
    if (!res) continue;
    const g = guests[s.gi]!;
    await prisma.reservation.create({
      data: {
        reference: reservationReference(idx++),
        resourceId: res.id,
        guestName: g.name,
        guestPhone: g.phone,
        guestEmail: g.email,
        date: dateStr(s.offset),
        startTime: s.start,
        endTime: s.end,
        status: s.status,
      },
    });
  }
  console.log(`${reservationSeeds.length} réservations créées`);

  // ── 6. Offers ────────────────────────────────────────────────────────────────
  const offersData = [
    { pi: 0, title: "Week-end Explorer", description: "20% de remise sur toutes les voitures le week-end.", discountPercent: 20, recurrence: "WEEKEND" as const, approvalStatus: ApprovalStatus.APPROVED },
    { pi: 1, title: "Coucher de Soleil Quad", description: "Dernière session de la journée à prix réduit.", discountPercent: 25, recurrence: "DAILY" as const, timeStart: "16:00", timeEnd: "20:00", approvalStatus: ApprovalStatus.APPROVED },
    { pi: 2, title: "Happy Hour Coworking", description: "Tarif réduit pour les réservations en matinée.", discountPercent: 40, recurrence: "WEEKDAY" as const, timeStart: "08:00", timeEnd: "11:00", approvalStatus: ApprovalStatus.APPROVED },
    { pi: 4, title: "Pack Créateur", description: "Location de 2 jours consécutifs avec 15% de remise.", discountPercent: 15, recurrence: "NONE" as const, validFrom: dateStr(0), validUntil: dateStr(90), approvalStatus: ApprovalStatus.APPROVED },
    { pi: 5, title: "Offre Découverte", description: "Votre première session snorkeling à -30%.", discountPercent: 30, recurrence: "NONE" as const, validFrom: dateStr(0), validUntil: dateStr(60), approvalStatus: ApprovalStatus.APPROVED },
    { pi: 6, title: "Sunrise Jet Ski", description: "Sessions matinales à tarif préférentiel.", discountPercent: 20, recurrence: "DAILY" as const, timeStart: "09:00", timeEnd: "11:00", approvalStatus: ApprovalStatus.APPROVED },
    { pi: 8, title: "Padel Morning", description: "Courts de padel 40% moins chers avant midi.", discountPercent: 40, recurrence: "WEEKDAY" as const, timeStart: "08:00", timeEnd: "12:00", approvalStatus: ApprovalStatus.APPROVED },
    { pi: 10, title: "Détox Week-end", description: "Package massage + hammam avec 25% de remise les week-ends.", discountPercent: 25, recurrence: "WEEKEND" as const, approvalStatus: ApprovalStatus.APPROVED },
    { pi: 11, title: "Yoga Sunrise", description: "Le cours de yoga matinal le plus populaire de l'île.", discountPercent: 30, recurrence: "DAILY" as const, timeStart: "07:00", timeEnd: "09:00", approvalStatus: ApprovalStatus.APPROVED },
    { pi: 12, title: "Séjour Longue Durée", description: "Réservez 5 nuits ou plus et économisez 20%.", discountPercent: 20, recurrence: "NONE" as const, validFrom: dateStr(0), validUntil: dateStr(120), approvalStatus: ApprovalStatus.APPROVED },
  ];

  for (const o of offersData) {
    const pEntry = created[o.pi];
    if (!pEntry) continue;
    const pUser = partners[o.pi];
    if (!pUser) continue;
    const partnerRecord = await prisma.partner.findFirst({ where: { name: pUser.name } });
    if (!partnerRecord) continue;

    await prisma.offer.create({
      data: {
        partnerId: partnerRecord.id,
        title: o.title,
        description: o.description,
        discountPercent: o.discountPercent,
        validFrom: "validFrom" in o ? o.validFrom : undefined,
        validUntil: "validUntil" in o ? o.validUntil : undefined,
        recurrence: o.recurrence,
        timeStart: "timeStart" in o ? o.timeStart : null,
        timeEnd: "timeEnd" in o ? o.timeEnd : null,
        approvalStatus: o.approvalStatus,
      },
    });
  }
  console.log(`${offersData.length} offres créées`);

  console.log(`
╔══════════════════════════════════════════════════════╗
║            SEED TERMINÉ — Djerba / Médenine           ║
╠══════════════════════════════════════════════════════╣
║  Admin        admin@rentzone.tn  /  Admin123!         ║
║  Partenaires  Partner123!                             ║
╠══════════════════════════════════════════════════════╣
║  7 catégories · ${created.length} partenaires · ${offersData.length} offres                  ║
║  Véhicules, Bureaux, Équipements, Nautique,           ║
║  Sports, Bien-être, Hébergements                      ║
╚══════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
