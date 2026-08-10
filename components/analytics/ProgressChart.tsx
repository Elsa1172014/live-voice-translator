'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];

interface Point {
  date: string;
  level: string;
}

export function ProgressChart({ points }: { points: Point[] }) {
  const data = points.map((p) => ({ date: p.date, levelIndex: CEFR_ORDER.indexOf(p.level) }));

  if (data.length < 2) {
    return <p className="text-sm text-slate-500">Progress chart will appear once a few sessions are assessed.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c2942" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis
          domain={[0, CEFR_ORDER.length - 1]}
          ticks={CEFR_ORDER.map((_, i) => i)}
          tickFormatter={(v) => CEFR_ORDER[v]}
          stroke="#64748b"
          fontSize={12}
        />
        <Tooltip
          formatter={(v: number) => CEFR_ORDER[v]}
          contentStyle={{ background: '#0e1526', border: '1px solid #1c2942', borderRadius: 8 }}
        />
        <Line type="monotone" dataKey="levelIndex" stroke="#d4af37" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
