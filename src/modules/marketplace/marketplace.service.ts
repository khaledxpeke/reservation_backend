import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { NotFoundError } from '../../lib/errors';
import { CourtSlotsQuery, MarketplaceSearchQuery } from './marketplace.schema';
import * as slotsService from '../slots/slots.service';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function slotInTimeBand(startTime: string, band: string): boolean {
  const mins = timeToMinutes(startTime);
  if (band === 'all') return true;
  if (band === 'morning') return mins >= 5 * 60 && mins < 12 * 60;
  if (band === 'afternoon') return mins >= 12 * 60 && mins < 17 * 60;
  if (band === 'evening') return mins >= 17 * 60 && mins <= 23 * 60 + 59;
  return true;
}

function computeSlotPrice(pricePerHour: unknown, durationMin: number): number {
  if (pricePerHour == null) return 0;
  const hourly = Number(pricePerHour);
  if (Number.isNaN(hourly)) return 0;
  return Math.round(((hourly * durationMin) / 60) * 100) / 100;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export type CourtOfferRow = {
  partnerId: string;
  partnerName: string;
  resourceId: string;
  resourceName: string;
  city: string;
  governorate: string | null;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  price: number;
  originalPrice?: number;
  offerTitle?: string;
  durationMin: number;
};

export async function searchPartners(query: MarketplaceSearchQuery) {
  const where: Prisma.PartnerWhereInput = {
    isVerified: true,
    user: { status: 'ACTIVE' },
  };

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.governorate) where.governorate = { contains: query.governorate, mode: 'insensitive' };
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  if (query.subCategoryId) {
    where.resources = { some: { isActive: true, subCategoryId: query.subCategoryId } };
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      select: {
        id: true,
        name: true,
        logo: true,
        coverImage: true,
        city: true,
        governorate: true,
        address: true,
        category: { select: { id: true, name: true, slug: true, imageUrl: true } },
        resources: {
          where: { isActive: true },
          select: { id: true, name: true, capacity: true, subCategoryId: true, pricePerHour: true },
        },
        _count: { select: { resources: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.partner.count({ where }),
  ]);

  return paginatedResponse(partners, total, pagination);
}

/**
 * Flat list of bookable court rows: first available slot per resource matching filters,
 * for a given date, duration, and time-of-day band.
 */
export async function searchCourtOffers(query: CourtSlotsQuery): Promise<CourtOfferRow[]> {
  const partnerWhere: Prisma.PartnerWhereInput = {
    isVerified: true,
    user: { status: 'ACTIVE' },
  };
  if (query.categoryId) partnerWhere.categoryId = query.categoryId;
  if (query.city) partnerWhere.city = { contains: query.city, mode: 'insensitive' };
  if (query.governorate) partnerWhere.governorate = { contains: query.governorate, mode: 'insensitive' };

  const resourceWhere: Prisma.ResourceWhereInput = {
    isActive: true,
    partner: partnerWhere,
  };
  if (query.subCategoryId) {
    resourceWhere.subCategoryId = query.subCategoryId;
  }

  const resources = await prisma.resource.findMany({
    where: resourceWhere,
    select: {
      id: true,
      name: true,
      pricePerHour: true,
      partner: {
        select: {
          id: true,
          name: true,
          city: true,
          governorate: true,
          coverImage: true,
          logo: true,
        },
      },
    },
    orderBy: [{ partner: { name: 'asc' } }, { name: 'asc' }],
    take: 100,
  });

  const offers: CourtOfferRow[] = [];

  for (const batch of chunk(resources, 12)) {
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        try {
          const { slots } = await slotsService.getAvailableSlots({
            resourceId: r.id,
            date: query.date,
            durationMin: query.durationMin,
          });
          const available = slots.filter(
            (s) => s.status === 'available' && slotInTimeBand(s.startTime, query.timeBand),
          );
          if (available.length === 0) return [];
          const imageUrl = r.partner.coverImage ?? r.partner.logo;
          return available.map(slot => {
            const h = parseInt(slot.startTime.split(':')[0], 10);
            let rate90Min = 100; // Base rate for 90 minutes
            let offerTitle: string | undefined = undefined;

            if (h >= 8 && h < 12) {
              rate90Min = 40;
              offerTitle = "Happy Hour Matinal";
            }
            else if (h >= 12 && h < 17) {
              rate90Min = 80;
              offerTitle = "Heures Creuses";
            }

            // Calculate exact price based on duration (pro-rata of the 90min rate)
            const price = Math.round(((rate90Min * query.durationMin) / 90) * 100) / 100;
            const originalPrice = Math.round(((100 * query.durationMin) / 90) * 100) / 100;

            return {
              partnerId: r.partner.id,
              partnerName: r.partner.name,
              resourceId: r.id,
              resourceName: r.name,
              city: r.partner.city,
              governorate: r.partner.governorate,
              imageUrl,
              startTime: slot.startTime,
              endTime: slot.endTime,
              price,
              originalPrice: price < originalPrice ? originalPrice : undefined,
              offerTitle,
              durationMin: query.durationMin,
            } satisfies CourtOfferRow;
          });
        } catch {
          return [];
        }
      }),
    );
    for (const rows of batchResults) {
      if (rows && rows.length > 0) offers.push(...rows);
    }
  }

  offers.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  return offers;
}

export async function getPublicPartner(id: string) {
  const partner = await prisma.partner.findFirst({
    where: { id, isVerified: true, user: { status: 'ACTIVE' } },
    select: {
      id: true,
      name: true,
      logo: true,
      coverImage: true,
      city: true,
      phone: true,
      address: true,
      settings: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          subCategories: { select: { id: true, name: true, defaultDurationMin: true } },
        },
      },
      resources: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          capacity: true,
          pricePerHour: true,
          subCategoryId: true,
          subCategory: { select: { id: true, defaultDurationMin: true } },
          availabilities: {
            select: { dayOfWeek: true, startTime: true, endTime: true, slotIntervalMin: true },
          },
        },
      },
      offers: {
        where: { approvalStatus: 'APPROVED', validUntil: { gte: new Date() } },
        select: { id: true, title: true, description: true, discountPercent: true, validFrom: true, validUntil: true },
      },
    },
  });

  if (!partner) throw new NotFoundError('Partner');
  return partner;
}
