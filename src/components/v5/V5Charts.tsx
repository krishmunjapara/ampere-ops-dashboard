'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function V5Charts({
  byPagePath,
  byEventName,
}: {
  byPagePath: Array<{ pagePath: string; screenPageViews: number }>;
  byEventName: Array<{ eventName: string; eventCount: number }>;
}) {
  const topPages = byPagePath.slice(0, 12);
  const topEvents = byEventName.slice(0, 12);

  const pagesData = {
    labels: topPages.map(x => x.pagePath),
    datasets: [
      {
        label: 'Page views',
        data: topPages.map(x => x.screenPageViews),
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.28)',
        borderWidth: 1,
      },
    ],
  };

  const eventsData = {
    labels: topEvents.map(x => x.eventName),
    datasets: [
      {
        label: 'Events',
        data: topEvents.map(x => x.eventCount),
        backgroundColor: 'rgba(59,130,246,0.22)',
        borderColor: 'rgba(59,130,246,0.35)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: 'rgba(255,255,255,0.9)',
        bodyColor: 'rgba(255,255,255,0.8)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255,255,255,0.55)', maxRotation: 0, autoSkip: true },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: 'rgba(255,255,255,0.55)' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  } as const;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-6 rounded-3xl border border-white/10 bg-[#0A0B0C] p-5">
        <div className="text-sm font-semibold text-white/85">Top pages</div>
        <div className="mt-1 text-[12px] text-white/45">By views in the window.</div>
        <div className="mt-4 h-[320px]">
          <Bar data={pagesData} options={options} />
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 rounded-3xl border border-white/10 bg-[#0A0B0C] p-5">
        <div className="text-sm font-semibold text-white/85">Top events</div>
        <div className="mt-1 text-[12px] text-white/45">Event counts in the window.</div>
        <div className="mt-4 h-[320px]">
          <Bar data={eventsData} options={options} />
        </div>
      </div>
    </div>
  );
}
