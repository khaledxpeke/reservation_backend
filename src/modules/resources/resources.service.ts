import { prisma } from '../../lib/prisma';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors';
import { CreateResourceInput, UpdateResourceInput } from './resources.schema';

export async function listResources(partnerId: string) {
  return prisma.resource.findMany({
    where: { partnerId },
    include: { availabilities: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createResource(userId: string, input: CreateResourceInput) {
  const partner = await prisma.partner.findUnique({
    where: { userId },
    include: { pack: true, _count: { select: { resources: true } } },
  });
  if (!partner) throw new NotFoundError('Partner');

  const maxResources = partner.pack?.maxResources ?? 1;
  if (partner._count.resources >= maxResources) {
    throw new BadRequestError(
      'RESOURCE_LIMIT_REACHED',
      `Your plan allows a maximum of ${maxResources} resource(s). Upgrade your pack to add more.`,
    );
  }

  const existing = await prisma.resource.findUnique({
    where: { partnerId_name: { partnerId: partner.id, name: input.name } },
  });
  if (existing) {
    throw new ConflictError('RESOURCE_EXISTS', 'A resource with this name already exists');
  }

  return prisma.resource.create({
    data: { ...input, partnerId: partner.id },
  });
}

export async function updateResource(userId: string, resourceId: string, input: UpdateResourceInput) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { partner: true },
  });
  if (!resource) throw new NotFoundError('Resource');
  if (resource.partner.userId !== userId) throw new ForbiddenError('You can only update your own resources');

  return prisma.resource.update({ where: { id: resourceId }, data: input });
}

export async function deleteResource(userId: string, resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { partner: true },
  });
  if (!resource) throw new NotFoundError('Resource');
  if (resource.partner.userId !== userId) throw new ForbiddenError('You can only delete your own resources');

  return prisma.resource.update({
    where: { id: resourceId },
    data: { isActive: false },
  });
}
