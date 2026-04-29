import { FactureStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { paginate, paginatedResponse, PaginationInput } from '../../lib/pagination';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { ListFacturesQuery } from './factures.schema';

const factureInclude = {
  partner: { select: { id: true, name: true, city: true, phone: true } },
  reservation: {
    select: {
      id: true,
      reference: true,
      guestName: true,
      guestPhone: true,
      guestEmail: true,
      date: true,
      endDate: true,
      startTime: true,
      endTime: true,
      resource: { select: { id: true, name: true } },
    },
  },
} as const;

function dateRange(query: ListFacturesQuery) {
  if (query.dateFrom || query.dateTo) {
    const start = query.dateFrom ? new Date(query.dateFrom) : new Date('1970-01-01');
    start.setUTCHours(0, 0, 0, 0);
    const end = query.dateTo ? new Date(query.dateTo) : new Date();
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  if (!query.month) return undefined;
  const month = query.month;
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

function buildWhere(query: ListFacturesQuery, partnerId?: string): Prisma.ReservationFactureWhereInput {
  const where: Prisma.ReservationFactureWhereInput = {};
  if (partnerId) where.partnerId = partnerId;
  else if (query.partnerId) where.partnerId = query.partnerId;
  if (query.status) where.status = query.status;
  if (query.clientName) {
    where.reservation = { guestName: { contains: query.clientName, mode: 'insensitive' } };
  }

  const range = dateRange(query);
  if (range) where.generatedAt = { gte: range.start, lte: range.end };

  return where;
}

async function listFactures(where: Prisma.ReservationFactureWhereInput, query: ListFacturesQuery) {
  const pagination: PaginationInput = { page: query.page, limit: query.limit };
  const { skip, take } = paginate(pagination);

  const [items, total, totals] = await Promise.all([
    prisma.reservationFacture.findMany({
      where,
      include: factureInclude,
      orderBy: { generatedAt: 'desc' },
      skip,
      take,
    }),
    prisma.reservationFacture.count({ where }),
    prisma.reservationFacture.aggregate({
      where,
      _sum: { amountDue: true, amountPaid: true },
    }),
  ]);

  const totalDue = totals._sum.amountDue ?? new Prisma.Decimal(0);
  const totalPaid = totals._sum.amountPaid ?? new Prisma.Decimal(0);

  return {
    ...paginatedResponse(items, total, pagination),
    totals: {
      totalDue,
      totalPaid,
      remaining: totalDue.sub(totalPaid).toDecimalPlaces(2),
    },
  };
}

export async function listEtatReglement(query: ListFacturesQuery) {
  return listFactures(buildWhere(query), query);
}

export async function listPartnerFactures(userId: string, query: ListFacturesQuery) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw new NotFoundError('Partner');

  return listFactures(buildWhere(query, partner.id), query);
}

function resolveFactureStatus(amountPaid: Prisma.Decimal, amountDue: Prisma.Decimal): FactureStatus {
  if (amountPaid.equals(0)) return 'UNPAID';
  if (amountPaid.lessThan(amountDue)) return 'PARTIAL';
  return 'PAID';
}

export async function updateFacturePayment(id: string, amountPaidInput: number) {
  const facture = await prisma.reservationFacture.findUnique({ where: { id } });
  if (!facture) throw new NotFoundError('Facture');

  const amountPaid = new Prisma.Decimal(amountPaidInput).toDecimalPlaces(2);
  if (amountPaid.greaterThan(facture.amountDue)) {
    throw new BadRequestError('PAYMENT_EXCEEDS_AMOUNT_DUE', 'Paid amount cannot exceed the facture amount due');
  }

  const status = resolveFactureStatus(amountPaid, facture.amountDue);

  return prisma.reservationFacture.update({
    where: { id },
    data: {
      amountPaid,
      status,
      paidAt: status === 'PAID' ? new Date() : null,
    },
    include: factureInclude,
  });
}

export async function getFactureForPdf(id: string, userId: string, role: string) {
  const facture = await prisma.reservationFacture.findUnique({
    where: { id },
    include: {
      partner: { select: { id: true, userId: true, name: true, city: true, phone: true, address: true } },
      reservation: {
        select: {
          id: true,
          reference: true,
          guestName: true,
          guestPhone: true,
          guestEmail: true,
          date: true,
          endDate: true,
          startTime: true,
          endTime: true,
          resource: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!facture) throw new NotFoundError('Facture');

  if (role !== 'SUPER_ADMIN' && facture.partner.userId !== userId) {
    throw new ForbiddenError('You can only download your own factures');
  }

  return facture;
}
