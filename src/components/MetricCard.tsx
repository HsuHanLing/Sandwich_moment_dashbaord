"use client";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
};

export function MetricCard({ title, value, subtitle, trend, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
          {subtitle && (
            <p
              className={`mt-0.5 text-xs ${
                trend === "up"
                  ? "text-emerald-600"
                  : trend === "down"
                    ? "text-rose-600"
                    : "text-stone-500"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-stone-100 p-2 dark:bg-stone-800">{icon}</div>
        )}
      </div>
    </div>
  );
}
