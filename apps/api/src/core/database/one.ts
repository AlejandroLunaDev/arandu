/** The row of a query that always returns one (`insert ... returning`, an aggregate, an upsert): a missing row is a bug. */
export function one<T>(rows: readonly T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error('Expected the query to return a row');
  return row;
}
