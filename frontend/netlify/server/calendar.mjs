const dayMs = 86400000;
const iso = (time) => new Date(time).toISOString().slice(0, 10);
const utc = (year, month, day) => Date.UTC(year, month - 1, day);
const monday = (time) => time + ((8 - new Date(time).getUTCDay()) % 7) * dayMs;

export function validDate(value) {
  if (!/^(19|20|21)\d\d-\d\d-\d\d$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && iso(time) === value;
}

function easter(year) {
  const golden = year % 19;
  const century = Math.floor(year / 100);
  const cycle = year % 100;
  const correction = Math.floor(century / 4);
  const lunar = (19 * golden + century - correction - Math.floor((century - Math.floor((century + 8) / 25) + 1) / 3) + 15) % 30;
  const weekday = (32 + 2 * (century % 4) + 2 * Math.floor(cycle / 4) - lunar - cycle % 4) % 7;
  const offset = lunar + weekday - 7 * Math.floor((golden + 11 * lunar + 22 * weekday) / 451) + 114;
  return utc(year, Math.floor(offset / 31), offset % 31 + 1);
}

export function colombianHolidays(year) {
  const fixed = [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]];
  const shifted = [[1, 6], [3, 19], [6, 29], [8, 15], [10, 12], [11, 1], [11, 11]];
  const sunday = easter(year);
  return new Set([
    ...fixed.map(([month, day]) => utc(year, month, day)),
    ...shifted.map(([month, day]) => monday(utc(year, month, day))),
    sunday - 3 * dayMs, sunday - 2 * dayMs,
    ...[39, 60, 68].map((days) => monday(sunday + days * dayMs)),
  ].map(iso));
}

export function businessDeadline(base, days, exclusions = []) {
  if (!validDate(base) || !Number.isInteger(days) || days < 1 || days > 365) return null;
  const closed = new Set(exclusions);
  let time = Date.parse(base);
  let year = new Date(time).getUTCFullYear();
  let holidays = colombianHolidays(year);
  let remaining = days;
  while (remaining) {
    time += dayMs;
    const date = new Date(time);
    if (date.getUTCFullYear() !== year) {
      year = date.getUTCFullYear();
      holidays = colombianHolidays(year);
    }
    const current = iso(time);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !closed.has(current) && !holidays.has(current)) remaining--;
  }
  return iso(time);
}
