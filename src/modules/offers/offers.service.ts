import { ApprovalStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { CreateOfferInput, ListOffersQuery } from './offers.schema';

export async function createOffer(userId: string, input: CreateOfferInput) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new NotFoundError('Partner');

  return prisma.offer.create({
    data: {
      partnerId: partner.id,
      title: input.title,
      description: input.description,
      discountPercent: input.discountPercent,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    },
  });
}

export async function listPartnerOffers(userId: string, query: ListOffersQuery) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new NotFoundError('Partner');

  const where: Prisma.OfferWhereInput = { partnerId: partner.id };
  if (query.approvalStatus) where.approvalStatus = query.approvalStatus;

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.offer.count({ where }),
  ]);

  return paginatedResponse(offers, total, pagination);
}

export async function listPublicOffers(query: ListOffersQuery) {
  const where: Prisma.OfferWhereInput = {
    approvalStatus: 'APPROVED',
    validUntil: { gte: new Date() },
  };

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: { partner: { select: { name: true, city: true } } },
      orderBy: { validFrom: 'desc' },
      skip,
      take,
    }),
    prisma.offer.count({ where }),
  ]);

  return paginatedResponse(offers, total, pagination);
}

export async function updateApproval(offerId: string, approvalStatus: ApprovalStatus) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new NotFoundError('Offer');

  return prisma.offer.update({
    where: { id: offerId },
    data: { approvalStatus },
  });
}

export async function listAllOffers(query: ListOffersQuery) {
  const where: Prisma.OfferWhereInput = {};
  if (query.approvalStatus) where.approvalStatus = query.approvalStatus;

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: { partner: { select: { name: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.offer.count({ where }),
  ]);

  return paginatedResponse(offers, total, pagination);
}
