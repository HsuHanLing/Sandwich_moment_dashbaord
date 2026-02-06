"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocale } from "@/contexts/LocaleContext";

type AgeItem = { attr: string; users: number; share: number };
type DeviceItem = { attr: string; users: number; share: number };

function ageToDisplay(attr: string, locale: string) {
  if (locale !== "en") return attr;
  return attr.replace(/岁$/, ""); // "18-24岁" -> "18-24", "35+岁" -> "35+"
}

function deviceToDisplay(attr: string) {
  return attr; // ANDROID, iOS, WEB already English
}

/* Google-inspired palette */
const COLORS_AGE = ["#4285f4", "#34a853", "#fbbc04"];
const COLORS_DEVICE = ["#4285f4", "#ea4335", "#34a853"];

export function UserAttributesChart({
  age,
  device,
  ageLabel = "年龄分布",
  deviceLabel = "设备类型",
}: {
  age: AgeItem[];
  device: DeviceItem[];
  ageLabel?: string;
  deviceLabel?: string;
}) {
  const { locale } = useLocale();
  const ageData = age.map((a) => ({ name: ageToDisplay(a.attr, locale), value: a.users }));
  const deviceData = device.map((d) => ({ name: deviceToDisplay(d.attr), value: d.users }));

  return (
    <div className="flex flex-col gap-8 overflow-visible">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <h3 className="mb-2 text-[10px] font-medium text-[var(--secondary-text)]">{ageLabel}</h3>
        <div className="h-[180px] w-full max-w-[280px] mx-auto min-w-0 overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={ageData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={1}
                dataKey="value"
              >
                {ageData.map((_, i) => (
                  <Cell key={i} fill={COLORS_AGE[i % COLORS_AGE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card-bg)",
                  padding: "3px 6px",
                  fontSize: 9,
                  lineHeight: 1.3,
                }}
                formatter={(value, name, props) => {
                  const v = Number(value ?? 0);
                  const total = ageData.reduce((s, d) => s + d.value, 0);
                  const pct = total ? (v / total) * 100 : 0;
                  return [`${v.toLocaleString()} (${pct.toFixed(1)}%)`, String(name ?? "")];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="square" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 rounded-lg border border-[var(--border)] p-2 text-[10px]">
          {age.map((a) => (
            <div key={a.attr} className="flex justify-between py-0.5">
              <span>{ageToDisplay(a.attr, locale)}</span>
              <span className="tabular-nums">{a.share.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <h3 className="mb-2 text-[10px] font-medium text-[var(--secondary-text)]">{deviceLabel}</h3>
        <div className="h-[180px] w-full max-w-[280px] mx-auto min-w-0 overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={1}
                dataKey="value"
              >
                {deviceData.map((_, i) => (
                  <Cell key={i} fill={COLORS_DEVICE[i % COLORS_DEVICE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card-bg)",
                  padding: "3px 6px",
                  fontSize: 9,
                  lineHeight: 1.3,
                }}
                formatter={(value, name, props) => {
                  const v = Number(value ?? 0);
                  const total = deviceData.reduce((s, d) => s + d.value, 0);
                  const pct = total ? (v / total) * 100 : 0;
                  return [`${v.toLocaleString()} (${pct.toFixed(1)}%)`, String(name ?? "")];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="square" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 rounded-lg border border-[var(--border)] p-2 text-[10px]">
          {device.map((d) => (
            <div key={d.attr} className="flex justify-between py-0.5">
              <span>{deviceToDisplay(d.attr)}</span>
              <span className="tabular-nums">{d.share.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
