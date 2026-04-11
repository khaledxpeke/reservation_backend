import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { NotFoundError } from '../../lib/errors';
import { MarketplaceSearchQuery } from './marketplace.schema';

export async function searchPartners(query: MarketplaceSearchQuery) {
  const where: Prisma.PartnerWhereInput = {
    isVerified: true,
    user: { status: 'ACTIVE' },
  };

  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({
      where,
      select: {
        id: true,
        name: true,
        logo: true,
        city: true,
        address: true,
        category: { select: { id: true, name: true, slug: true } },
        resources: {
          where: { isActive: true },
          select: { id: true, name: true, capacity: true },
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

export async function getPublicPartner(id: string) {
  const partner = await prisma.partner.findFirst({
    where: { id, isVerified: true, user: { status: 'ACTIVE' } },
    select: {
      id: true,
      name: true,
      logo: true,
      city: true,
      phone: true,
      address: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          subCategories: { select: { id: true, name: true, defaultDurationMin: true } },
        },
      },
      resources: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          capacity: true,
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
