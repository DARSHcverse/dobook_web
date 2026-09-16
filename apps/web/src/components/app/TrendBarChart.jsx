'use client';

// recharts is ~8MB unpacked and is only used by the dashboard's Monthly Trends
// card. Isolating it here lets next/dynamic keep it out of the shared bundle
// that the landing, industry and booking pages load.
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function TrendBarChart({
  data,
  dataKey,
  label,
  allowDecimals = true,
  tickFormatter,
  valueFormatter,
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={allowDecimals} tick={{ fontSize: 12 }} tickFormatter={tickFormatter} />
        <Tooltip
          formatter={(value) => [valueFormatter ? valueFormatter(value) : value, label]}
          labelStyle={{ fontWeight: 600 }}
        />
        <Bar dataKey={dataKey} fill="#e11d48" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
