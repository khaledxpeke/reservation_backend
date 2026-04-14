import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../lib/errors';
import { CreatePartnerInput, ListPartnersQuery, UpdatePartnerInput } from './partners.schema';

const partnerSelect = {
  id: true,
  name: true,
  logo: true,
  coverImage: true,
  city: true,
  phone: true,
  address: true,
  isVerified: true,
  settings: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  pack: { select: { id: true, name: true, maxResources: true } },
  user: { select: { id: true, email: true, status: true } },
} as const;

export async function listPartners(query: ListPartnersQuery) {
  const where: Prisma.PartnerWhereInput = {};

  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.isVerified !== undefined) where.isVerified = query.isVerified;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [partners, total] = await Promise.all([
    prisma.partner.findMany({ where, select: partnerSelect, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.partner.count({ where }),
  ]);

  return paginatedResponse(partners, total, pagination);
}

export async function getPartner(id: string) {
  const partner = await prisma.partner.findUnique({
    where: { id },
    select: {
      ...partnerSelect,
      resources: { select: { id: true, name: true, capacity: true, isActive: true } },
    },
  });
  if (!partner) throw new NotFoundError('Partner');
  return partner;
}

export async function getPartnerByUserId(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new NotFoundError('Partner');
  return partner;
}

export async function createPartner(input: CreatePartnerInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError('EMAIL_EXISTS', 'An account with this email already exists');
  }

  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw new BadRequestError('INVALID_CATEGORY', 'The specified category does not exist');
  }

  if (input.packId) {
    const pack = await prisma.pack.findUnique({ where: { id: input.packId } });
    if (!pack) throw new NotFoundError('Pack');
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: 'PARTNER',
      partner: {
        create: {
          name: input.name,
          city: input.city,
          phone: input.phone,
          address: input.address,
          categoryId: input.categoryId,
          logo: input.logo ?? undefined,
          coverImage: input.coverImage ?? undefined,
          packId: input.packId ?? undefined,
          isVerified: input.isVerified ?? false,
        },
      },
    },
  });

  const created = await prisma.partner.findUnique({
    where: { userId: user.id },
    select: partnerSelect,
  });
  if (!created) throw new NotFoundError('Partner');
  return created;
}

export async function deletePartner(id: string) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw new NotFoundError('Partner');

  await prisma.user.delete({ where: { id: partner.userId } });
}

export async function updatePartner(id: string, userId: string, role: string, input: UpdatePartnerInput) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw new NotFoundError('Partner');

  if (role !== 'SUPER_ADMIN' && partner.userId !== userId) {
    throw new ForbiddenError('You can only update your own profile');
  }

  return prisma.partner.update({ where: { id }, data: input, select: partnerSelect });
}

export async function verifyPartner(id: string, isVerified: boolean) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw new NotFoundError('Partner');

  return prisma.partner.update({
    where: { id },
    data: { isVerified },
    select: partnerSelect,
  });
}

export async function assignPack(id: string, packId: string | null) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw new NotFoundError('Partner');

  if (packId) {
    const pack = await prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundError('Pack');
  }

  return prisma.partner.update({
    where: { id },
    data: { packId },
    select: partnerSelect,
  });
}
