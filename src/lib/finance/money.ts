export const currencyDigits = {
  PKR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  SAR: 2,
  JPY: 0,
  KWD: 3,
} as const;
export type Currency = keyof typeof currencyDigits;
export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && Object.hasOwn(currencyDigits, value);
}
export function minor(value: string, currency: Currency): bigint {
  if (typeof value !== "string" || !/^-?\d{1,18}(\.\d+)?$/.test(value))
    throw Error("Invalid decimal amount");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const digits = currencyDigits[currency];
  if (fraction.length > digits) throw Error("Too many currency decimal places");
  const result =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  return negative ? -result : result;
}
export function decimal(value: bigint, currency: Currency): string {
  const digits = currencyDigits[currency];
  const sign = value < 0n ? "-" : "";
  const abs = (value < 0n ? -value : value)
    .toString()
    .padStart(digits + 1, "0");
  return (
    sign + (digits ? abs.slice(0, -digits) + "." + abs.slice(-digits) : abs)
  );
}
export function prorate(
  amount: string,
  numerator: number,
  denominator: number,
  currency: Currency,
): string {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator < 0 ||
    denominator <= 0 ||
    numerator > denominator
  )
    throw Error("Invalid allocation");
  const value = minor(amount, currency);
  if (value < 0n) throw Error("Allocation must be positive");
  return decimal(
    (value * BigInt(numerator) + BigInt(denominator) / 2n) /
      BigInt(denominator),
    currency,
  );
}
export function displayMoney(value: string | null, currency: Currency): string {
  if (value === null) return "Unavailable";
  const normalized = decimal(minor(value, currency), currency);
  const [whole, fraction] = normalized.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction !== undefined ? "." + fraction : ""}`;
}
