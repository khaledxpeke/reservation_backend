import { Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { CreateReservationInput, ListReservationsQuery } from './reservations.schema';

const SLOT_LOCK_PREFIX = 'slot:';
const SLOT_LOCK_TTL = 300; // 5 minutes

function slotLockKey(resourceId: string, date: string, startTime: string): string {
  return `${SLOT_LOCK_PREFIX}${resourceId}:${date}:${startTime}`;
}

export async function createReservation(input: CreateReservationInput, userId?: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { partner: true },
  });
  if (!resource || !resource.isActive) throw new NotFoundError('Resource');

  const lockKey = slotLockKey(input.resourceId, input.date, input.startTime);

  let lockHeld = false;
  if (redis) {
    try {
      const locked = await redis.set(lockKey, '1', 'EX', SLOT_LOCK_TTL, 'NX');
      if (!locked) {
        throw new ConflictError('SLOT_LOCKED', 'This time slot is currently being booked by another guest');
      }
      lockHeld = true;
    } catch (err) {
      if (err instanceof ConflictError) throw err;
      // Redis down: continue without distributed lock (DB conflict check still applies)
    }
  }

  const dateStart = new Date(input.date);
  dateStart.setUTCHours(0, 0, 0, 0);
  const endDateToUse = input.endDate ? new Date(input.endDate) : new Date(input.date);
  const dateEnd = new Date(endDateToUse);
  dateEnd.setUTCHours(23, 59, 59, 999);

  let conflicting;
  if (input.endDate && input.endDate !== input.date) {
    // Booking a date range
    conflicting = await prisma.reservation.findFirst({
      where: {
        resourceId: input.resourceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            date: { lte: dateEnd },
            endDate: { gte: dateStart },
          },
          {
            endDate: null,
            date: { gte: dateStart, lte: dateEnd },
          }
        ],
      },
    });
  } else {
    // Booking a single time slot
    conflicting = await prisma.reservation.findFirst({
      where: {
        resourceId: input.resourceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            date: { lte: dateStart },
            endDate: { gte: dateStart },
          },
          {
            endDate: null,
            date: { gte: dateStart, lte: dateEnd },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          }
        ],
      },
    });
  }

  if (conflicting) {
    if (redis && lockHeld) {
      try {
        await redis.del(lockKey);
      } catch {
        // ignore
      }
    }
    throw new ConflictError('SLOT_ALREADY_BOOKED', 'This time slot is no longer available');
  }

  return prisma.reservation.create({
    data: {
      resourceId: input.resourceId,
      userId: userId ?? null,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      date: new Date(input.date),
      endDate: input.endDate ? new Date(input.endDate) : null,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'PENDING',
    },
    include: {
      resource: { select: { name: true, partner: { select: { name: true } } } },
    },
  });
}

export async function listPartnerReservations(userId: string, query: ListReservationsQuery) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new NotFoundError('Partner');

  const where: Prisma.ReservationWhereInput = {
    resource: { partnerId: partner.id },
  };

  if (query.status) where.status = query.status;
  if (query.resourceId) where.resourceId = query.resourceId;
  if (query.date) {
    const dateStart = new Date(query.date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(query.date);
    dateEnd.setUTCHours(23, 59, 59, 999);
    where.date = { gte: dateStart, lte: dateEnd };
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { resource: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
  ]);

  return paginatedResponse(reservations, total, pagination);
}

export async function updateReservationStatus(
  userId: string,
  role: string,
  reservationId: string,
  status: ReservationStatus,
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { resource: { include: { partner: true } } },
  });
  if (!reservation) throw new NotFoundError('Reservation');

  if (role !== 'SUPER_ADMIN' && reservation.resource.partner.userId !== userId) {
    throw new ForbiddenError('You can only manage reservations for your own resources');
  }

  if (reservation.status !== 'PENDING') {
    throw new BadRequestError('INVALID_STATUS_TRANSITION', `Cannot change status from ${reservation.status}`);
  }

  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status },
    include: { resource: { select: { name: true } } },
  });

  const dateStr = reservation.date.toISOString().split('T')[0];
  const lockKey = slotLockKey(reservation.resourceId, dateStr, reservation.startTime);
  if (redis && (status === 'REJECTED' || status === 'CANCELLED')) {
    try {
      await redis.del(lockKey);
    } catch {
      // ignore
    }
  }

  return updated;
}

export async function listAdminReservations(query: ListReservationsQuery) {
  const where: Prisma.ReservationWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.resourceId) where.resourceId = query.resourceId;
  if (query.date) {
    const dateStart = new Date(query.date);
    dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(query.date);
    dateEnd.setUTCHours(23, 59, 59, 999);
    where.date = { gte: dateStart, lte: dateEnd };
  }

  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { resource: { select: { name: true, partner: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.reservation.count({ where }),
  ]);

  return paginatedResponse(reservations, total, pagination);
}

export async function deleteReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) throw new NotFoundError('Reservation');

  const lockKey = slotLockKey(reservation.resourceId, reservation.date.toISOString().split('T')[0], reservation.startTime);
  if (redis) {
    try {
      await redis.del(lockKey);
    } catch {
      // ignore
    }
  }

  await prisma.reservation.delete({ where: { id } });
}

export async function getAdminStats() {
  const [totalBookings, pending, confirmed, rejected] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
    prisma.reservation.count({ where: { status: 'REJECTED' } }),
  ]);

  const totalPartners = await prisma.partner.count();
  const verifiedPartners = await prisma.partner.count({ where: { isVerified: true } });
  const totalResources = await prisma.resource.count({ where: { isActive: true } });

  return {
    bookings: { total: totalBookings, pending, confirmed, rejected },
    partners: { total: totalPartners, verified: verifiedPartners },
    resources: { total: totalResources },
  };
}

