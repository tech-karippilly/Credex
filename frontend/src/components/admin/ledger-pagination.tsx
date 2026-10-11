export const PAGE_SIZES = [10, 20, 50, 100] as const;

export function LedgerPagination({
  pageSizeId,
  page,
  totalPages,
  limit,
  loading = false,
  onPageChange,
  onLimitChange,
}: {
  pageSizeId: string;
  page: number;
  totalPages: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const displayPage = totalPages === 0 ? 1 : page;
  const displayPages = Math.max(totalPages, 1);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {displayPage} of {displayPages}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={pageSizeId} className="text-sm font-semibold">
          Rows per page
        </label>
        <select
          id={pageSizeId}
          className="field h-9 w-auto"
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline h-9"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-outline h-9"
          disabled={loading || totalPages === 0 || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
