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

export function VelocityBurnupChart() {
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
    Chart.defaults.color = "#A8A29E";

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"],
        datasets: [
          {
            label: "Actual Impact",
            data: [5, 12, 25, 35, 42, 58, 64, null],
            borderColor: "#D97757",
            backgroundColor: (context) => {
              const c = context.chart.ctx;
              const g = c.createLinearGradient(0, 0, 0, 300);
              g.addColorStop(0, "rgba(217, 119, 87, 0.2)");
              g.addColorStop(1, "rgba(217, 119, 87, 0)");
              return g;
            },
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#D97757",
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: "Target Trajectory",
            data: [5, 15, 25, 35, 45, 55, 65, 75],
            borderColor: "#E7E5E4",
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
            backgroundColor: "#1C1917",
            titleFont: { size: 12, family: "'Space Grotesk', sans-serif" },
            bodyFont: { size: 12, family: "'Space Grotesk', sans-serif" },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          y: {
            grid: {
              color: "rgba(231, 229, 228, 0.1)",
              drawBorder: false,
            },
            ticks: { font: { size: 10 }, color: "#A8A29E" },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: "#A8A29E" },
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
    <div className="w-full h-[240px] relative">
      <canvas ref={canvasRef} />
    </div>
  );
}
