export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked';
}

interface AvailabilityWindow {
  startTime: string;
  endTime: string;
  slotIntervalMin: number;
}

interface Booking {
  startTime: string;
  endTime: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Core gap-finder algorithm. Given an availability window and existing bookings,
 * calculates all possible time slots and marks them as available or booked.
 *
 * Steps:
 * 1. Convert the availability window to a minute-based range
 * 2. Sort existing bookings by start time
 * 3. Walk through the window in steps of `slotIntervalMin`
 * 4. For each candidate slot, check overlap with any existing booking
 * 5. Emit slots with their status
 */
export function calculateAvailableSlots(
  availability: AvailabilityWindow,
  bookings: Booking[],
  requestedDurationMin: number,
): TimeSlot[] {
  const openStart = timeToMinutes(availability.startTime);
  const openEnd = timeToMinutes(availability.endTime);
  const stepMin = availability.slotIntervalMin;

  const sortedBookings = [...bookings].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  const slots: TimeSlot[] = [];

  for (let cursor = openStart; cursor + requestedDurationMin <= openEnd; cursor += stepMin) {
    const slotStart = cursor;
    const slotEnd = cursor + requestedDurationMin;

    const isBooked = sortedBookings.some((booking) => {
      const bStart = timeToMinutes(booking.startTime);
      const bEnd = timeToMinutes(booking.endTime);
      return slotStart < bEnd && slotEnd > bStart;
    });

    slots.push({
      startTime: minutesToTime(slotStart),
      endTime: minutesToTime(slotEnd),
      status: isBooked ? 'booked' : 'available',
    });
  }

  return slots;
}

/**
 * Process multiple availability windows for the same day
 * (in case a resource has split hours, e.g. morning + afternoon)
 */
export function calculateSlotsForDay(
  availabilities: AvailabilityWindow[],
  bookings: Booking[],
  requestedDurationMin: number,
): TimeSlot[] {
  const allSlots: TimeSlot[] = [];

  for (const avail of availabilities) {
    const slots = calculateAvailableSlots(avail, bookings, requestedDurationMin);
    allSlots.push(...slots);
  }

  return allSlots.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );
}
