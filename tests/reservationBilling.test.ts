import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  computeReservationTotal,
  getNextFactureReference,
  getNextReservationReference,
  validateReservationTransition,
} from '../src/modules/reservations/reservationBilling';
import { AppError } from '../src/lib/errors';

describe('reservation billing helpers', () => {
  it('computes reservation totals from resource price and booking unit', () => {
    const date = new Date('2026-04-28T00:00:00.000Z');

    expect(computeReservationTotal({
      date,
      endDate: null,
      startTime: '10:00',
      endTime: '11:30',
      resource: { price: new Prisma.Decimal(20), bookingUnit: 'HOURS' },
    }).toNumber()).toBe(30);

    expect(computeReservationTotal({
      date,
      endDate: new Date('2026-04-30T00:00:00.000Z'),
      startTime: '00:00',
      endTime: '23:59',
      resource: { price: new Prisma.Decimal(80), bookingUnit: 'DAYS' },
    }).toNumber()).toBe(240);
  });

  it('generates month-scoped facture references', () => {
    expect(getNextFactureReference(7, new Date('2026-04-28T12:00:00.000Z'))).toBe('FAC-202604-0007');
  });

  it('generates month-scoped reservation references', () => {
    expect(getNextReservationReference(12, new Date('2026-04-28T12:00:00.000Z'))).toBe('RES-202604-0012');
  });

  it('allows only valid paid reservation transitions', () => {
    expect(() => validateReservationTransition('CONFIRMED', 'PAID')).not.toThrow();
    expect(() => validateReservationTransition('PENDING', 'PAID')).toThrowError(AppError);
    expect(() => validateReservationTransition('PAID', 'CANCELLED')).toThrowError(AppError);
    expect(() =>
      validateReservationTransition('PAID', 'CANCELLED', { allowPaidCancellation: true }),
    ).not.toThrow();
  });
});
