import { brazilDateFormatter, BRAZIL_TZ } from "./formatters";

export const getBrazilToday = () => brazilDateFormatter.format(new Date());

export const getDateParts = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, monthIndex: month - 1, day };
};

export const formatDateKey = (year: number, monthIndex: number, day: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;

export const parseBrazilDate = (value: string) => {
  const parts = getDateParts(value);
  if (!parts) {
    return new Date();
  }
  return new Date(Date.UTC(parts.year, parts.monthIndex, parts.day, 12));
};

export const addDaysToBrazilDate = (value: string, offset: number) => {
  const base = parseBrazilDate(value);
  base.setUTCDate(base.getUTCDate() + offset);
  return brazilDateFormatter.format(base);
};

export const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const parseDateValue = (value: string) => {
  if (isDateOnly(value)) {
    return parseBrazilDate(value);
  }
  return new Date(value);
};

export const subtractDaysFromBrazilDate = (value: string, offset: number) =>
  addDaysToBrazilDate(value, -offset);

export const toBrazilDateKey = (value: string) => {
  if (isDateOnly(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return brazilDateFormatter.format(parsed);
};

export const getMonthRange = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return { startDate: "", endDate: "" };
  }

  const paddedMonth = String(month).padStart(2, "0");
  const endDay = new Date(year, month, 0).getDate();

  return {
    startDate: `${year}-${paddedMonth}-01`,
    endDate: `${year}-${paddedMonth}-${String(endDay).padStart(2, "0")}`,
  };
};

export const calendarWeekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export { BRAZIL_TZ, brazilDateFormatter };
