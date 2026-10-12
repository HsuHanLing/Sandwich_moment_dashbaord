export type CountryExchangeRate = {
  country: string;
  currency: string;
  usdRate: number;
  effectiveDate: string;
};

/**
 * Fixed reporting exchange rates.
 *
 * `usdRate` means the USD value of one unit of the local currency.
 * Countries not listed here are treated as USD at a 1:1 rate.
 */
export const COUNTRY_EXCHANGE_RATES: readonly CountryExchangeRate[] = [
  {
    country: "United States",
    currency: "USD",
    usdRate: 1,
    effectiveDate: "2026-10-12",
  },
  {
    country: "South Africa",
    currency: "ZAR",
    usdRate: 0.060572,
    effectiveDate: "2026-10-12",
  },
];

export const DEFAULT_USD_RATE = 1;
