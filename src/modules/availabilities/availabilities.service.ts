import { prisma } from '../../lib/prisma';
import { ForbiddenError, NotFoundError } from '../../lib/errors';
import { SetAvailabilitiesInput } from './availabilities.schema';

export async function getAvailabilities(resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new NotFoundError('Resource');

  return prisma.availability.findMany({
    where: { resourceId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

export async function setAvailabilities(userId: string, resourceId: string, input: SetAvailabilitiesInput) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { partner: true },
  });
  if (!resource) throw new NotFoundError('Resource');
  if (resource.partner.userId !== userId) {
    throw new ForbiddenError('You can only manage availabilities for your own resources');
  }

  await prisma.$transaction(async (tx) => {
    await tx.availability.deleteMany({ where: { resourceId } });
    await tx.availability.createMany({
      data: input.availabilities.map((a) => ({
        resourceId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        slotIntervalMin: a.slotIntervalMin,
      })),
    });
  });

  return prisma.availability.findMany({
    where: { resourceId },
    orderBy: { dayOfWeek: 'asc' },
  });
}
