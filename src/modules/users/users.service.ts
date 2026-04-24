import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { ListUsersQuery } from './users.schema';

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {};

  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.email = { contains: query.search, mode: 'insensitive' };
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, role: true, status: true, createdAt: true, partner: { select: { name: true, city: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return paginatedResponse(users, total, pagination);
}

export async function updateUserStatus(requesterId: string, userId: string, status: UserStatus) {
  if (requesterId === userId) {
    throw new ForbiddenError('Vous ne pouvez pas modifier le statut de votre propre compte.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  if (user.role === 'SUPER_ADMIN') {
    throw new ForbiddenError('Le statut d\'un administrateur ne peut pas être modifié.');
  }

  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, role: true, status: true },
  });
}

export async function deleteUser(requesterId: string, userId: string) {
  if (requesterId === userId) {
    throw new ForbiddenError('Vous ne pouvez pas supprimer votre propre compte.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  if (user.role === 'SUPER_ADMIN') {
    throw new ForbiddenError('Un compte administrateur ne peut pas être supprimé.');
  }

  await prisma.user.delete({ where: { id: userId } });
}

