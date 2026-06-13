import { DayOfWeek, Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { calculateSlotsForDay } from '../../lib/slotEngine';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { assertBookableNotInPastWallTime, getAppTimeZone } from '../../lib/slotPastFilter';
import {
  CreateReservationInput,
  ListReservationsQuery,
  PartnerBlockSlotInput,
} from './reservations.schema';
import {
  computeReservationTotal,
  getNextFactureReference,
  getNextReservationReference,
  validateReservationTransition,
} from './reservationBilling';

const SLOT_LOCK_PREFIX = 'slot:';
const SLOT_LOCK_TTL = 300; // 5 minutes
const BLOCKING_STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'PAID'];

function slotLockKey(resourceId: string, date: string, startTime: string): string {
  return `${SLOT_LOCK_PREFIX}${resourceId}:${date}:${startTime}`;
}

const UTC_DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

function utcDayOfWeekFromYmd(ymd: string): DayOfWeek {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return UTC_DAY_MAP[d.getUTCDay()]!;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Vérifie que le créneau correspond exactement à un slot « disponible » du moteur (agenda + réservations existantes). */
async function assertPartnerSlotMatchesCalendar(
  resourceId: string,
  bufferTimeMin: number,
  dateYmd: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  assertBookableNotInPastWallTime(dateYmd, startTime, new Date(), getAppTimeZone());

  const dayOfWeek = utcDayOfWeekFromYmd(dateYmd);
  const availabilities = await prisma.availability.findMany({
    where: { resourceId, dayOfWeek },
  });
  if (availabilities.length === 0) {
    throw new BadRequestError('NO_AVAILABILITY', 'Aucune disponibilité ce jour-là pour cette ressource.');
  }

  const durationMin = timeToMinutes(endTime) - timeToMinutes(startTime);
  if (durationMin <= 0) {
    throw new BadRequestError('INVALID_RANGE', 'Plage horaire invalide.');
  }

  const dayStart = new Date(dateYmd);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dateYmd);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      resourceId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: BLOCKING_STATUSES },
    },
    select: { startTime: true, endTime: true },
  });

  const slots = calculateSlotsForDay(
    availabilities.map((a) => ({
      startTime: a.startTime,
      endTime: a.endTime,
      slotIntervalMin: a.slotIntervalMin,
    })),
    reservations,
    durationMin,
    bufferTimeMin,
  );

  const ok = slots.some(
    (s) =>
      s.startTime === startTime &&
      s.endTime === endTime &&
      s.status === 'available',
  );
  if (!ok) {
    throw new BadRequestError(
      'SLOT_NOT_AVAILABLE',
      'Ce créneau ne peut pas être bloqué (déjà pris ou hors de votre agenda).',
    );
  }
}

export async function createPartnerTimeBlock(partnerUserId: string, input: PartnerBlockSlotInput) {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { partner: true },
  });
  if (!resource || !resource.isActive) throw new NotFoundError('Resource');
  if (resource.partner.userId !== partnerUserId) {
    throw new ForbiddenError('Vous ne pouvez bloquer que vos propres ressources.');
  }

  const isDayBased = resource.bookingUnit === 'DAYS';
  let rangeEndYmd: string;
  let startTime = input.startTime;
  let endTime = input.endTime;
  let prismaEndDate: Date | null = null;

  if (isDayBased) {
    rangeEndYmd = input.endDate ?? input.date;
    if (rangeEndYmd < input.date) {
      throw new BadRequestError('INVALID_RANGE', 'La date de fin doit être le même jour ou après le début.');
    }
    startTime = '00:00';
    endTime = '23:59';
    prismaEndDate = new Date(rangeEndYmd);
  } else {
    if (input.endDate && input.endDate !== input.date) {
      throw new BadRequestError(
        'DAY_RANGE_NOT_ALLOWED',
        'Les blocages sur plusieurs jours sont possibles uniquement pour les ressources facturées à la journée.',
      );
    }
    await assertPartnerSlotMatchesCalendar(
      input.resourceId,
      resource.bufferTimeMin,
      input.date,
      input.startTime,
      input.endTime,
    );
    rangeEndYmd = input.date;
    prismaEndDate = null;
  }

  const lockKey = isDayBased
    ? `partner:block:${input.resourceId}:${input.date}:${rangeEndYmd}`
    : slotLockKey(input.resourceId, input.date, startTime);
  let lockHeld = false;
  if (redis) {
    try {
      const locked = await redis.set(lockKey, '1', 'EX', SLOT_LOCK_TTL, 'NX');
      if (!locked) {
        throw new ConflictError('SLOT_LOCKED', 'Ce créneau est en cours de réservation.');
      }
      lockHeld = true;
    } catch (err) {
      if (err instanceof ConflictError) throw err;
    }
  }

  const dateStart = new Date(input.date);
  dateStart.setUTCHours(0, 0, 0, 0);
  const dateEndRange = new Date(rangeEndYmd);
  dateEndRange.setUTCHours(23, 59, 59, 999);

  const guestNote = input.note?.trim();
  const guestName = guestNote
    ? `Hors plateforme — ${guestNote.slice(0, 80)}`
    : 'Hors plateforme';

  try {
    return await prisma.$transaction(async (tx) => {
      let conflicting;
      if (isDayBased && rangeEndYmd !== input.date) {
        conflicting = await tx.reservation.findFirst({
          where: {
            resourceId: input.resourceId,
            status: { in: BLOCKING_STATUSES },
            OR: [
              {
                date: { lte: dateEndRange },
                endDate: { gte: dateStart },
              },
              {
                endDate: null,
                date: { gte: dateStart, lte: dateEndRange },
              },
            ],
          },
        });
      } else {
        const dayEnd = new Date(input.date);
        dayEnd.setUTCHours(23, 59, 59, 999);
        conflicting = await tx.reservation.findFirst({
          where: {
            resourceId: input.resourceId,
            status: { in: BLOCKING_STATUSES },
            OR: [
              {
                date: { lte: dateStart },
                endDate: { gte: dateStart },
              },
              {
                endDate: null,
                date: { gte: dateStart, lte: isDayBased ? dateEndRange : dayEnd },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
              },
            ],
          },
        });
      }

      if (conflicting) {
        throw new ConflictError('SLOT_ALREADY_BOOKED', 'Ce créneau n’est plus libre.');
      }

      const createdAt = new Date();
      const monthStart = new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1));
      const nextMonthStart = new Date(
        Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + 1, 1),
      );
      const monthCount = await tx.reservation.count({
        where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
      });

      return tx.reservation.create({
        data: {
          reference: getNextReservationReference(monthCount + 1, createdAt),
          resourceId: input.resourceId,
          userId: null,
          guestName,
          guestPhone: 'externe',
          guestEmail: null,
          date: new Date(input.date),
          endDate: prismaEndDate,
          startTime,
          endTime,
          status: 'CONFIRMED',
          createdAt,
        },
        include: {
          resource: { select: { name: true, partner: { select: { name: true } } } },
        },
      });
    });
  } finally {
    if (redis && lockHeld) {
      try {
        await redis.del(lockKey);
      } catch {
        // ignore
      }
    }
  }
}

export async function createReservation(input: CreateReservationInput, userId?: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    include: { partner: true },
  });
  if (!resource || !resource.isActive) throw new NotFoundError('Resource');

  if (resource.bookingUnit !== 'DAYS') {
    const singleCalendarDay = !input.endDate || input.endDate === input.date;
    if (singleCalendarDay) {
      assertBookableNotInPastWallTime(input.date, input.startTime, new Date(), getAppTimeZone());
    }
  }

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
            status: { in: BLOCKING_STATUSES },
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
        status: { in: BLOCKING_STATUSES },
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

  return prisma.$transaction(async (tx) => {
    const createdAt = new Date();
    const monthStart = new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + 1, 1));
    const monthCount = await tx.reservation.count({
      where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
    });

    return tx.reservation.create({
      data: {
        reference: getNextReservationReference(monthCount + 1, createdAt),
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
        createdAt,
      },
      include: {
        resource: { select: { name: true, partner: { select: { name: true } } } },
      },
    });
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
    const useOverlap = query.dateOverlap === 'true' || query.dateOverlap === '1';
    if (useOverlap) {
      where.AND = [
        {
          OR: [
            {
              AND: [{ date: { lte: dateEnd } }, { endDate: { gte: dateStart } }],
            },
            {
              endDate: null,
              date: { gte: dateStart, lte: dateEnd },
            },
          ],
        },
      ];
    } else {
      where.date = { gte: dateStart, lte: dateEnd };
    }
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
    include: { resource: { include: { partner: true } }, facture: true },
  });
  if (!reservation) throw new NotFoundError('Reservation');

  if (role !== 'SUPER_ADMIN' && reservation.resource.partner.userId !== userId) {
    throw new ForbiddenError('You can only manage reservations for your own resources');
  }

  const isAdminPaidCancellation =
    role === 'SUPER_ADMIN' && reservation.status === 'PAID' && status === 'CANCELLED';

  validateReservationTransition(reservation.status, status, {
    allowPaidCancellation: isAdminPaidCancellation,
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (isAdminPaidCancellation) {
      await tx.reservationFacture.deleteMany({ where: { reservationId } });
      return tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
        include: { resource: { select: { name: true } }, facture: true },
      });
    }

    if (status !== 'PAID' || reservation.status === 'PAID') {
      return tx.reservation.update({
        where: { id: reservationId },
        data: { status },
        include: { resource: { select: { name: true } }, facture: true },
      });
    }

    const generatedAt = new Date();
    const monthStart = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(generatedAt.getUTCFullYear(), generatedAt.getUTCMonth() + 1, 1));
    const monthCount = await tx.reservationFacture.count({
      where: { generatedAt: { gte: monthStart, lt: nextMonthStart } },
    });
    const reservationTotal = computeReservationTotal(reservation);
    const commissionPercent = new Prisma.Decimal(reservation.resource.partner.commissionPercent);
    const amountDue = reservationTotal.mul(commissionPercent).div(100).toDecimalPlaces(2);

    await tx.reservationFacture.create({
      data: {
        reference: getNextFactureReference(monthCount + 1, generatedAt),
        reservationId,
        partnerId: reservation.resource.partnerId,
        reservationTotal,
        commissionPercent,
        amountDue,
        amountPaid: new Prisma.Decimal(0),
        status: amountDue.equals(0) ? 'PAID' : 'UNPAID',
        paidAt: amountDue.equals(0) ? generatedAt : null,
        generatedAt,
      },
    });

    return tx.reservation.update({
      where: { id: reservationId },
      data: { status },
      include: { resource: { select: { name: true } }, facture: true },
    });
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
  const [totalBookings, pending, confirmed, rejected, paid] = await Promise.all([
    prisma.reservation.count(),
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
    prisma.reservation.count({ where: { status: 'REJECTED' } }),
    prisma.reservation.count({ where: { status: 'PAID' } }),
  ]);

  const totalPartners = await prisma.partner.count();
  const verifiedPartners = await prisma.partner.count({ where: { isVerified: true } });
  const totalResources = await prisma.resource.count({ where: { isActive: true } });

  return {
    bookings: { total: totalBookings, pending, confirmed, rejected, paid },
    partners: { total: totalPartners, verified: verifiedPartners },
    resources: { total: totalResources },
  };
}

