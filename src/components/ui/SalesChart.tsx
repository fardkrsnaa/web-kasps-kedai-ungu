import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useThemeStore } from '../../stores/useThemeStore';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface Props {
  labels: string[];
  omzetData: number[];
}

export default function SalesChart({ labels, omzetData }: Props) {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const primaryMain = '#8B5CF6';
  const primaryLight = 'rgba(139, 92, 246, 0.25)';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const textColor = isDark ? '#9CA3AF' : '#9CA3AF';

  const ctx = document.createElement('canvas').getContext('2d');
  const gradient = ctx?.createLinearGradient(0, 0, 0, 280);
  if (gradient) {
    gradient.addColorStop(0, primaryLight);
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
  }

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Omzet',
            data: omzetData,
            borderColor: primaryMain,
            backgroundColor: gradient ?? primaryLight,
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: primaryMain,
            pointBorderColor: isDark ? '#111827' : '#FFFFFF',
            pointBorderWidth: 3,
            pointHoverBackgroundColor: primaryMain,
            pointHoverBorderColor: isDark ? '#111827' : '#FFFFFF',
            pointHoverBorderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            titleColor: isDark ? '#F9FAFB' : '#111827',
            bodyColor: isDark ? '#D1D5DB' : '#6B7280',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 16,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y;
                return val !== null ? `Rp ${val.toLocaleString('id-ID')}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
              maxTicksLimit: 8,
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" },
              callback: (val: number | string) => `Rp${(Number(val) / 1000).toFixed(0)}rb`,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index' as const,
        },
      }}
      height={280}
    />
  );
}