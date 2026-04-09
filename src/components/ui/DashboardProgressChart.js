"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

export function DashboardProgressChart() {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    Chart.defaults.font.family = "'Space Grotesk', sans-serif";
    Chart.defaults.color = "#737373";

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
        datasets: [
          {
            label: "Your Progress",
            data: [10, 25, 42, 48, null, null],
            borderColor: "#D97757",
            backgroundColor: (context) => {
              const c = context.chart.ctx;
              const g = c.createLinearGradient(0, 0, 0, 200);
              g.addColorStop(0, "rgba(217, 119, 87, 0.2)");
              g.addColorStop(1, "rgba(217, 119, 87, 0)");
              return g;
            },
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#D97757",
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBorderWidth: 0,
          },
          {
            label: "Target",
            data: [10, 20, 30, 40, 50, 60],
            borderColor: "#404040",
            borderDash: [5, 5],
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#171717",
            titleColor: "#fff",
            bodyColor: "#a3a3a3",
            borderColor: "#262626",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label(ctx) {
                const y = ctx.parsed.y;
                if (y == null) return "";
                return `${y}% Completed`;
              },
            },
          },
        },
        scales: {
          y: {
            grid: { color: "rgba(255,255,255,0.05)", drawBorder: false },
            ticks: { font: { size: 10 }, padding: 10 },
            min: 0,
            max: 100,
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, padding: 10 },
          },
        },
        interaction: { intersect: false, mode: "index" },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="h-64 w-full max-w-full min-w-0 relative">
      <canvas ref={canvasRef} className="max-h-64 max-w-full" />
    </div>
  );
}
