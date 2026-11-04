import dayjs from 'dayjs';

/** Whole weeks since HRT start (0 if start is today or in the future). */
export function weeksOnHrt(hrtStartDate: string, now = dayjs()): number {
  const start = dayjs(hrtStartDate).startOf('day');
  if (!start.isValid()) return 0;
  const days = now.startOf('day').diff(start, 'day');
  if (days < 0) return 0;
  return Math.floor(days / 7);
}

export function formatHrtBadge(hrtStartDate: string, now = dayjs()): string {
  const weeks = weeksOnHrt(hrtStartDate, now);
  if (weeks === 0) {
    const days = now.startOf('day').diff(dayjs(hrtStartDate).startOf('day'), 'day');
    if (days < 0) return 'HRT starts soon';
    if (days === 0) return 'Day 1 on HRT';
    return `Week 1 on HRT · Day ${days + 1}`;
  }
  return `Week ${weeks} on HRT`;
}
