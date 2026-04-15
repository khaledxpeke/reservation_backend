import { DayOfWeek } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import { calculateSlotsForDay } from '../../lib/slotEngine';
import { AvailableSlotsQuery } from './slots.schema';

const DAY_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export async function getAvailableSlots(query: AvailableSlotsQuery) {
  const resource = await prisma.resource.findUnique({ where: { id: query.resourceId } });
  if (!resource || !resource.isActive) throw new NotFoundError('Resource');

  const targetDate = new Date(query.date);
  const dayOfWeek = DAY_MAP[targetDate.getUTCDay()];

  const availabilities = await prisma.availability.findMany({
    where: { resourceId: query.resourceId, dayOfWeek },
  });

  if (availabilities.length === 0) {
    return { date: query.date, dayOfWeek, slots: [] };
  }

  const dayStart = new Date(query.date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(query.date);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      resourceId: query.resourceId,
      date: { gte: dayStart, lte: dayEnd },
      status: { in: ['PENDING', 'CONFIRMED'] },
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
    query.durationMin,
    resource.bufferTimeMin
  );

  return { date: query.date, dayOfWeek, slots };
}
