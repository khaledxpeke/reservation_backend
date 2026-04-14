import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import {
  CreateCategoryInput,
  CreateSubCategoryInput,
  UpdateCategoryInput,
  UpdateSubCategoryInput,
} from './categories.schema';

export async function listCategories() {
  return prisma.category.findMany({
    include: { subCategories: true },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: input.name }, { slug: input.slug }] },
  });
  if (existing) {
    throw new ConflictError('CATEGORY_EXISTS', 'A category with this name or slug already exists');
  }

  return prisma.category.create({ data: input, include: { subCategories: true } });
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category');

  return prisma.category.update({ where: { id }, data, include: { subCategories: true } });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError('Category');

  await prisma.category.delete({ where: { id } });
}

export async function addSubCategory(categoryId: string, input: CreateSubCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundError('Category');

  const existing = await prisma.subCategory.findUnique({
    where: { categoryId_name: { categoryId, name: input.name } },
  });
  if (existing) {
    throw new ConflictError('SUBCATEGORY_EXISTS', 'This subcategory already exists in this category');
  }

  return prisma.subCategory.create({
    data: { ...input, categoryId },
  });
}

export async function updateSubCategory(id: string, data: UpdateSubCategoryInput) {
  const sub = await prisma.subCategory.findUnique({ where: { id } });
  if (!sub) throw new NotFoundError('SubCategory');

  return prisma.subCategory.update({ where: { id }, data });
}

export async function deleteSubCategory(id: string) {
  const sub = await prisma.subCategory.findUnique({ where: { id } });
  if (!sub) throw new NotFoundError('SubCategory');

  await prisma.subCategory.delete({ where: { id } });
}
