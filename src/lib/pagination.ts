import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function paginate(input: PaginationInput) {
  const skip = (input.page - 1) * input.limit;
  return { skip, take: input.limit };
}

export function paginatedResponse<T>(data: T[], total: number, input: PaginationInput) {
  return {
    items: data,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

