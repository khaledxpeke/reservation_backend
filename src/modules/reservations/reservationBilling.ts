import { BookingUnit, Prisma, ReservationStatus } from '@prisma/client';
import { BadRequestError } from '../../lib/errors';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function computeReservationTotal(reservation: {
  date: Date;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  resource: { price: Prisma.Decimal | null; bookingUnit: BookingUnit };
}) {
  const price = reservation.resource.price?.toNumber() ?? 0;
  if (price <= 0) return new Prisma.Decimal(0);

  if (reservation.resource.bookingUnit === 'DAYS') {
    const end = reservation.endDate ?? reservation.date;
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end.getTime() - reservation.date.getTime()) / dayMs) + 1);
    return new Prisma.Decimal(price * days).toDecimalPlaces(2);
  }

  const durationMinutes = Math.max(0, timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime));
  if (reservation.resource.bookingUnit === 'HOURS') {
    return new Prisma.Decimal(price * (durationMinutes / 60)).toDecimalPlaces(2);
  }

  return new Prisma.Decimal(price * durationMinutes).toDecimalPlaces(2);
}

export function getNextFactureReference(sequence: number, generatedAt = new Date()) {
  const year = generatedAt.getUTCFullYear();
  const month = String(generatedAt.getUTCMonth() + 1).padStart(2, '0');
  return `FAC-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

export function getNextReservationReference(sequence: number, createdAt = new Date()) {
  const year = createdAt.getUTCFullYear();
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  return `RES-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

export function validateReservationTransition(
  from: ReservationStatus,
  to: ReservationStatus,
  options?: { allowPaidCancellation?: boolean },
) {
  if (from === to) return;
  if (from === 'PENDING' && ['CONFIRMED', 'REJECTED', 'CANCELLED'].includes(to)) return;
  if (from === 'CONFIRMED' && ['PAID', 'CANCELLED'].includes(to)) return;
  if (from === 'PAID' && to === 'CANCELLED' && options?.allowPaidCancellation) return;

  throw new BadRequestError('INVALID_STATUS_TRANSITION', `Cannot change status from ${from} to ${to}`);
}
