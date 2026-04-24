import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { UpdateCustomerProfileInput, ListMyReservationsQuery } from './customers.schema';

export async function getMyAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customerProfile: true },
  });
  if (!user || !user.customerProfile) throw new NotFoundError('Customer profile');

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    customerProfile: user.customerProfile,
  };
}

export async function updateMyProfile(userId: string, input: UpdateCustomerProfileInput) {
  const profile = await prisma.customerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Customer profile');

  const data: Prisma.CustomerProfileUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.dob !== undefined) data.dob = new Date(input.dob);
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.region !== undefined) data.region = input.region;

  return prisma.customerProfile.update({ where: { userId }, data });
}

export async function listMyReservations(userId: string, query: ListMyReservationsQuery) {
  const where: Prisma.ReservationWhereInput = { userId };

  if (query.status) where.status = query.status;

  if (query.scope === 'upcoming') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    where.OR = [
      { endDate: null, date: { gte: today } },
      { endDate: { gte: today } },
    ];
  } else if (query.scope === 'past') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    where.OR = [
      { endDate: null, date: { lt: today } },
      { endDate: { lt: today } },
    ];
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const orderBy: Prisma.ReservationOrderByWithRelationInput[] =
    query.scope === 'past'
      ? [{ date: 'desc' }, { startTime: 'desc' }]
      : [{ date: 'asc' }, { startTime: 'asc' }];

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            partner: {
              select: {
                id: true,
                name: true,
                city: true,
                governorate: true,
                logo: true,
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
  ]);

  return paginatedResponse(reservations, total, pagination);
}

export async function cancelMyReservation(userId: string, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.userId !== userId) {
    throw new NotFoundError('Reservation');
  }

  if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') {
    return reservation;
  }

  return prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'CANCELLED' },
  });
}

