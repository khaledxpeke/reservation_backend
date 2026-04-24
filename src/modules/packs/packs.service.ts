import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { CreatePackInput, UpdatePackInput } from './packs.schema';

/** Prisma Json must be a real JSON array, not JSON.stringify (which stored a string value in JSONB). */
function featuresJson(features: string[]): Prisma.InputJsonValue {
  return features;
}

/**
 * Older rows may have been saved with JSON.stringify — Prisma returns a string. Normalize to string[].
 */
function normalizePackFeatures(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string');
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function mapPack<T extends { features: Prisma.JsonValue }>(row: T) {
  return { ...row, features: normalizePackFeatures(row.features) };
}

export async function listPacks() {
  const rows = await prisma.pack.findMany({ orderBy: { priceMonthly: 'asc' } });
  return rows.map(mapPack);
}

export async function createPack(input: CreatePackInput) {
  const existing = await prisma.pack.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError('PACK_EXISTS', 'A pack with this name already exists');
  }

  const created = await prisma.pack.create({
    data: {
      name: input.name,
      maxResources: input.maxResources,
      features: featuresJson(input.features),
      priceMonthly: input.priceMonthly,
    },
  });
  return mapPack(created);
}

export async function updatePack(id: string, input: UpdatePackInput) {
  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) throw new NotFoundError('Pack');

  const data: Prisma.PackUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.maxResources !== undefined) data.maxResources = input.maxResources;
  if (input.features !== undefined) data.features = featuresJson(input.features);
  if (input.priceMonthly !== undefined) data.priceMonthly = input.priceMonthly;

  const updated = await prisma.pack.update({ where: { id }, data });
  return mapPack(updated);
}

export async function deletePack(id: string) {
  const pack = await prisma.pack.findUnique({ where: { id } });
  if (!pack) throw new NotFoundError('Pack');

  await prisma.pack.delete({ where: { id } });
}

