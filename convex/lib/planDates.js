/** Calendar YYYY-MM-DD for plan day N (day 1 = startDate). */
export function scheduleYmd(startDate, dayNumber) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const d = new Date(sy, sm - 1, sd);
  d.setDate(d.getDate() + (dayNumber - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
