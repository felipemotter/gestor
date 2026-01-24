export const BRAZIL_TZ = "America/Sao_Paulo";

export const brazilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRAZIL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const currencyNoCentsFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: BRAZIL_TZ,
});

export const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: BRAZIL_TZ,
});

export const calendarDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: BRAZIL_TZ,
});

export const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: BRAZIL_TZ,
});

export const formatCompactCurrency = (value: number) =>
  currencyFormatter
    .format(value)
    .replace(/\s/g, "")
    .replace("R$", "R$ ");

export const formatCompactBRL = (value: number) => {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const formatNumber = (num: number, suffix: string) =>
    `${sign}R$ ${num.toFixed(1).replace(".", ",")}${suffix}`;
  if (absoluteValue >= 1_000_000_000) {
    return formatNumber(absoluteValue / 1_000_000_000, "B");
  }
  if (absoluteValue >= 1_000_000) {
    return formatNumber(absoluteValue / 1_000_000, "M");
  }
  if (absoluteValue >= 1_000) {
    return formatNumber(absoluteValue / 1_000, "k");
  }
  return `${sign}${currencyNoCentsFormatter.format(absoluteValue)}`;
};
