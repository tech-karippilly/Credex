import { useEffect, useState, type ComponentType } from "react";
import {
  Briefcase,
  Contact,
  FileText,
  Inbox,
  Layers,
  Loader2,
  PieChart,
  Wallet,
} from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import { applicationsApi } from "@/lib/applications-api";
import { careersApi } from "@/lib/careers-api";
import {
  currentMonthKey,
  dashboardApi,
  formatMonthKey,
  formatMonthLabel,
  parseMonthKey,
  type ExpensesByCategory,
  type ExpensesSummary,
} from "@/lib/dashboard-api";
import { enquiriesApi } from "@/lib/enquiries-api";
import { leadsApi } from "@/lib/leads-api";
import {
  canSeeDashboardCard,
  type AdminAccess,
  type AdminTab,
  type DashboardCardId,
  visibleDashboardCards,
} from "@/lib/permissions";
import { servicesApi } from "@/lib/services-api";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(n) || 0,
  );

const percentLabel = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format((Number(n) || 0) / 100);

type CountCardId = Exclude<
  DashboardCardId,
  "expenses_summary" | "expenses_by_category"
>;

const COUNT_ICONS: Record<CountCardId, ComponentType<{ className?: string }>> =
  {
    services: Layers,
    jobs: Briefcase,
    applications: FileText,
    enquiries: Inbox,
    leads: Contact,
  };

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat("en-IN", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, index, 1))),
}));

function yearOptions(selectedYear: number): number[] {
  const current = new Date().getUTCFullYear();
  const start = current - 5;
  const end = Math.max(current, selectedYear);
  const years: number[] = [];
  for (let year = end; year >= start; year -= 1) years.push(year);
  return years;
}

function PanelHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{text}</p>
    </div>
  );
}

type CountState = Record<CountCardId, number | null | undefined>;

export function OverviewPanel({
  go,
  access,
}: {
  go: (tab: AdminTab) => void;
  access: AdminAccess;
}) {
  const [period, setPeriod] = useState(currentMonthKey);
  const [counts, setCounts] = useState<CountState>({
    services: undefined,
    jobs: undefined,
    applications: undefined,
    enquiries: undefined,
    leads: undefined,
  });
  const [expenses, setExpenses] = useState<ExpensesSummary | null>(null);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [byCategory, setByCategory] = useState<ExpensesByCategory | null>(null);
  const [byCategoryError, setByCategoryError] = useState<string | null>(null);
  const [byCategoryLoading, setByCategoryLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleCards = visibleDashboardCards(access);
  const showPeriodFilter = visibleCards.some((card) => card.supportsPeriodFilter);
  const { year, monthNumber } = parseMonthKey(period);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const problems: string[] = [];
      async function count(
        label: string,
        allowed: boolean,
        load: () => Promise<{ length: number }>,
      ) {
        if (!allowed) return undefined;
        try {
          return (await load()).length;
        } catch (error) {
          problems.push(`${label}: ${apiErrorMessage(error, "Could not load")}`);
          return null;
        }
      }

      const services = await count(
        "Services",
        canSeeDashboardCard(access, "services"),
        () => servicesApi.listAdmin(),
      );
      const jobs = await count(
        "Careers",
        canSeeDashboardCard(access, "jobs"),
        () => careersApi.listAdmin(),
      );
      const applications = await count(
        "Applications",
        canSeeDashboardCard(access, "applications"),
        () => applicationsApi.list(),
      );
      const enquiries = await count(
        "Enquiries",
        canSeeDashboardCard(access, "enquiries"),
        () => enquiriesApi.list(),
      );

      let leads: number | null | undefined = undefined;
      if (canSeeDashboardCard(access, "leads")) {
        try {
          leads = (await leadsApi.summary()).total;
        } catch (error) {
          problems.push(`Leads: ${apiErrorMessage(error, "Could not load")}`);
          leads = null;
        }
      }

      if (!cancelled) {
        setCounts({ services, jobs, applications, enquiries, leads });
        setNotice(problems.length > 0 ? problems.join(" ") : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [access]);

  useEffect(() => {
    if (!canSeeDashboardCard(access, "expenses_summary")) {
      setExpenses(null);
      setExpensesError(null);
      setExpensesLoading(false);
      return;
    }

    let cancelled = false;
    setExpensesLoading(true);
    setExpensesError(null);

    dashboardApi
      .expensesSummary(period)
      .then((data) => {
        if (!cancelled) {
          setExpenses(data);
          setExpensesError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setExpenses(null);
          setExpensesError(apiErrorMessage(error, "Could not load expenses summary"));
        }
      })
      .finally(() => {
        if (!cancelled) setExpensesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [access, period]);

  useEffect(() => {
    if (!canSeeDashboardCard(access, "expenses_by_category")) {
      setByCategory(null);
      setByCategoryError(null);
      setByCategoryLoading(false);
      return;
    }

    let cancelled = false;
    setByCategoryLoading(true);
    setByCategoryError(null);

    dashboardApi
      .expensesByCategory(period)
      .then((data) => {
        if (!cancelled) {
          setByCategory(data);
          setByCategoryError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setByCategory(null);
          setByCategoryError(
            apiErrorMessage(error, "Could not load expenses by category"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setByCategoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [access, period]);

  return (
    <>
      <PanelHead
        title="Dashboard"
        text="Manage your website content, careers and incoming enquiries."
      />
      {showPeriodFilter && (
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Month</span>
            <select
              className="field w-40"
              aria-label="Dashboard month"
              value={monthNumber}
              onChange={(e) =>
                setPeriod(formatMonthKey(year, Number(e.target.value)))
              }
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">Year</span>
            <select
              className="field w-28"
              aria-label="Dashboard year"
              value={year}
              onChange={(e) =>
                setPeriod(formatMonthKey(Number(e.target.value), monthNumber))
              }
            >
              {yearOptions(year).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-sm text-muted-foreground">
            Showing period: <span className="font-medium text-foreground">{formatMonthLabel(period)}</span>
            {" · "}
            by invoice date
          </p>
        </div>
      )}
      {notice && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {notice}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => {
          if (card.id === "expenses_summary") {
            return (
              <ExpensesSummaryCard
                key={card.id}
                period={period}
                loading={expensesLoading}
                error={expensesError}
                summary={expenses}
              />
            );
          }

          if (card.id === "expenses_by_category") {
            return (
              <ExpensesByCategoryCard
                key={card.id}
                period={period}
                loading={byCategoryLoading}
                error={byCategoryError}
                data={byCategory}
              />
            );
          }

          const Icon = COUNT_ICONS[card.id];
          const value = counts[card.id];
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => card.tab && go(card.tab)}
              className="card-site card-hover p-6 text-left"
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-5 font-display text-4xl font-semibold">
                {value === undefined ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : value === null ? (
                  "—"
                ) : (
                  value
                )}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            </button>
          );
        })}
      </div>
    </>
  );
}

function ExpensesSummaryCard({
  period,
  loading,
  error,
  summary,
}: {
  period: string;
  loading: boolean;
  error: string | null;
  summary: ExpensesSummary | null;
}) {
  const total = summary?.totalAmount ?? 0;
  const changePercent = summary?.changePercent ?? null;
  const previousTotal = summary?.previousMonth.totalAmount ?? 0;

  return (
    <div
      className="card-site p-6 text-left sm:col-span-2 xl:col-span-2"
      data-testid="expenses-summary-card"
    >
      <div className="flex items-start justify-between gap-3">
        <Wallet className="h-5 w-5 text-primary" />
        <p className="text-right text-sm text-muted-foreground">
          {formatMonthLabel(summary?.month ?? period)}
        </p>
      </div>
      <p className="mt-5 font-display text-4xl font-semibold">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : error ? (
          "—"
        ) : (
          inr(total)
        )}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Total Expenses</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : (
        !loading && (
          <p className="mt-3 text-sm text-muted-foreground">
            {changePercent === null
              ? `Previous month: ${inr(previousTotal)}`
              : `${changePercent > 0 ? "+" : ""}${changePercent}% vs previous month (${inr(previousTotal)})`}
          </p>
        )
      )}
    </div>
  );
}

function ExpensesByCategoryCard({
  period,
  loading,
  error,
  data,
}: {
  period: string;
  loading: boolean;
  error: string | null;
  data: ExpensesByCategory | null;
}) {
  const total = data?.totalAmount ?? 0;
  const categories = data?.categories ?? [];
  const empty = !loading && !error && categories.length === 0;

  return (
    <div
      className="card-site p-6 text-left sm:col-span-2 xl:col-span-2"
      data-testid="expenses-by-category-card"
    >
      <div className="flex items-start justify-between gap-3">
        <PieChart className="h-5 w-5 text-primary" aria-hidden />
        <p className="text-right text-sm text-muted-foreground">
          {formatMonthLabel(data?.month ?? period)}
        </p>
      </div>
      <p className="mt-5 font-display text-4xl font-semibold">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : error ? (
          "—"
        ) : (
          inr(total)
        )}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Expenses by Category</p>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : empty ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No expenses recorded for this period.
        </p>
      ) : (
        !loading && (
          <ul
            className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1"
            aria-label="Expenses by category"
          >
            {categories.map((row) => (
              <li key={`${row.categoryId}-${row.categoryName}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">
                    {row.categoryName}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {inr(row.totalAmount)}
                    <span className="ml-2 text-foreground/80">
                      {percentLabel(row.percent)}
                    </span>
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 overflow-hidden rounded-sm bg-muted"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-sm bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
