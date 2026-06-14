import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

interface SalesChartProps {
  labels: string[];
  omzetData: number[];
}

export default function SalesChart({
  labels,
  omzetData,
}: SalesChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');

    try {
      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Omzet',
              data: omzetData,
              backgroundColor: 'rgba(124, 58, 237, 0.2)',
              borderColor: '#7c3aed',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#7c3aed',
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                padding: 16,
                font: { size: 11 },
                color: isDark ? '#cbd5e1' : '#64748b',
              },
            },
            tooltip: {
              backgroundColor: isDark ? '#1e293b' : '#f8fafc',
              titleColor: isDark ? '#f1f5f9' : '#0f172a',
              bodyColor: isDark ? '#cbd5e1' : '#334155',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function (context) {
                  const value = context.raw as number;
                  return context.dataset.label + ': Rp ' + value.toLocaleString('id-ID');
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 10 },
                color: isDark ? '#cbd5e1' : '#64748b',
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: isDark ? '#334155' : '#f1f5f9' },
              ticks: {
                font: { size: 10 },
                color: isDark ? '#cbd5e1' : '#64748b',
                callback: function (value) {
                  if (typeof value === 'number') {
                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                    if (value >= 1000) return (value / 1000).toFixed(0) + 'rb';
                  }
                  return value;
                },
              },
            },
          },
        },
      });
    } catch (error) {
      console.error('Failed to create chart:', error);
    }

    return function cleanup() {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [labels, omzetData]);

  if (labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 dark:text-slate-400">
        <p className="text-sm">Belum ada data penjualan</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <canvas ref={canvasRef} />
    </div>
  );
}