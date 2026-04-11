import { describe, it, expect } from 'vitest';
import { calculateAvailableSlots, calculateSlotsForDay } from '../src/lib/slotEngine';

describe('Slot Engine - calculateAvailableSlots', () => {
  const defaultAvailability = {
    startTime: '08:00',
    endTime: '22:00',
    slotIntervalMin: 60,
  };

  it('returns all slots as available when no bookings exist', () => {
    const slots = calculateAvailableSlots(defaultAvailability, [], 60);

    expect(slots.length).toBe(14);
    expect(slots.every((s) => s.status === 'available')).toBe(true);
    expect(slots[0]).toEqual({ startTime: '08:00', endTime: '09:00', status: 'available' });
    expect(slots[slots.length - 1]).toEqual({ startTime: '21:00', endTime: '22:00', status: 'available' });
  });

  it('marks overlapping slots as booked', () => {
    const bookings = [{ startTime: '10:00', endTime: '11:30' }];
    const slots = calculateAvailableSlots(defaultAvailability, bookings, 60);

    const at10 = slots.find((s) => s.startTime === '10:00');
    expect(at10?.status).toBe('booked');

    const at09 = slots.find((s) => s.startTime === '09:00');
    expect(at09?.status).toBe('available');

    const at1130 = slots.find((s) => s.startTime === '12:00');
    expect(at1130?.status).toBe('available');
  });

  it('handles 90-minute slot durations with Padel-like scheduling', () => {
    const availability = { startTime: '08:00', endTime: '22:00', slotIntervalMin: 90 };
    const bookings = [{ startTime: '10:00', endTime: '11:30' }];

    const slots = calculateAvailableSlots(availability, bookings, 90);

    // With 90min steps: 08:00, 09:30, 11:00, 12:30, 14:00, ...
    const at08 = slots.find((s) => s.startTime === '08:00');
    expect(at08).toEqual({ startTime: '08:00', endTime: '09:30', status: 'available' });

    // 09:30-11:00 overlaps with booking 10:00-11:30
    const at0930 = slots.find((s) => s.startTime === '09:30');
    expect(at0930?.status).toBe('booked');

    // 11:00-12:30 overlaps with booking 10:00-11:30
    const at1100 = slots.find((s) => s.startTime === '11:00');
    expect(at1100?.status).toBe('booked');

    // 12:30-14:00 is free
    const at1230 = slots.find((s) => s.startTime === '12:30');
    expect(at1230?.status).toBe('available');
  });

  it('handles multiple bookings in the same day', () => {
    const bookings = [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '14:00', endTime: '15:00' },
    ];
    const slots = calculateAvailableSlots(defaultAvailability, bookings, 60);

    expect(slots.find((s) => s.startTime === '09:00')?.status).toBe('booked');
    expect(slots.find((s) => s.startTime === '14:00')?.status).toBe('booked');
    expect(slots.find((s) => s.startTime === '08:00')?.status).toBe('available');
    expect(slots.find((s) => s.startTime === '10:00')?.status).toBe('available');
    expect(slots.find((s) => s.startTime === '15:00')?.status).toBe('available');
  });

  it('returns empty array when duration exceeds window', () => {
    const shortAvailability = { startTime: '08:00', endTime: '09:00', slotIntervalMin: 60 };
    const slots = calculateAvailableSlots(shortAvailability, [], 120);

    expect(slots).toEqual([]);
  });

  it('handles bookings at the edges of the availability window', () => {
    const bookings = [{ startTime: '08:00', endTime: '09:00' }];
    const slots = calculateAvailableSlots(defaultAvailability, bookings, 60);

    expect(slots.find((s) => s.startTime === '08:00')?.status).toBe('booked');
    expect(slots.find((s) => s.startTime === '09:00')?.status).toBe('available');
  });

  it('handles a fully booked day', () => {
    const bookings = [{ startTime: '08:00', endTime: '22:00' }];
    const slots = calculateAvailableSlots(defaultAvailability, bookings, 60);

    expect(slots.every((s) => s.status === 'booked')).toBe(true);
  });

  it('correctly uses slot interval for stepping', () => {
    const availability = { startTime: '08:00', endTime: '10:00', slotIntervalMin: 30 };
    const slots = calculateAvailableSlots(availability, [], 30);

    expect(slots.length).toBe(4);
    expect(slots.map((s) => s.startTime)).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });
});

describe('Slot Engine - calculateSlotsForDay', () => {
  it('merges and sorts slots from multiple availability windows', () => {
    const availabilities = [
      { startTime: '14:00', endTime: '18:00', slotIntervalMin: 60 },
      { startTime: '08:00', endTime: '12:00', slotIntervalMin: 60 },
    ];

    const slots = calculateSlotsForDay(availabilities, [], 60);

    expect(slots.length).toBe(8);
    expect(slots[0].startTime).toBe('08:00');
    expect(slots[slots.length - 1].startTime).toBe('17:00');
  });

  it('handles bookings across multiple windows', () => {
    const availabilities = [
      { startTime: '08:00', endTime: '12:00', slotIntervalMin: 60 },
      { startTime: '14:00', endTime: '18:00', slotIntervalMin: 60 },
    ];
    const bookings = [{ startTime: '10:00', endTime: '11:00' }];

    const slots = calculateSlotsForDay(availabilities, bookings, 60);

    expect(slots.find((s) => s.startTime === '10:00')?.status).toBe('booked');
    expect(slots.find((s) => s.startTime === '14:00')?.status).toBe('available');
  });
});
