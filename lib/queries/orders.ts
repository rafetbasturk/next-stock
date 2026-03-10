export type YearRangeResult = {
  minYear: number;
  maxYear: number;
};

export async function yearRangeQuery(timeZone: string = "UTC"): Promise<YearRangeResult> {
  const [{ sql }, { db }, { orders }] = await Promise.all([
    import("drizzle-orm"),
    import("@/db"),
    import("@/db/schema"),
  ]);

  const result = await db
    .select({
      minYear: sql<number | null>`MIN(EXTRACT(YEAR FROM ${orders.orderDate} AT TIME ZONE ${timeZone}))`,
      maxYear: sql<number | null>`MAX(EXTRACT(YEAR FROM ${orders.orderDate} AT TIME ZONE ${timeZone}))`,
    })
    .from(orders);

  const { minYear, maxYear } = result[0] ?? {};
  const currentYear = new Date().getFullYear();

  return {
    minYear: minYear ?? currentYear,
    maxYear: maxYear ?? currentYear,
  };
}
