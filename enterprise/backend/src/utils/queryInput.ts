export function parsePagination(page: unknown, limit: unknown) {
  const pageNum = Math.max(1, Number(page) || 1);
  const take = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (pageNum - 1) * take;
  return { page: pageNum, take, skip };
}
