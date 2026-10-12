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
 * Rates are the inverse of the USD-based rates published by ExchangeRate-API
 * on 2026-10-12 (https://open.er-api.com/v6/latest/USD).
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
    country: "United Kingdom",
    currency: "GBP",
    usdRate: 1.323442804,
    effectiveDate: "2026-10-12",
  },
  {
    country: "South Africa",
    currency: "ZAR",
    usdRate: 0.0605554766,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Canada",
    currency: "CAD",
    usdRate: 0.7014378775,
    effectiveDate: "2026-10-12",
  },
  {
    country: "India",
    currency: "INR",
    usdRate: 0.01031307016,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Hungary",
    currency: "HUF",
    usdRate: 0.003066854358,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Japan",
    currency: "JPY",
    usdRate: 0.006319909935,
    effectiveDate: "2026-10-12",
  },
  {
    country: "France",
    currency: "EUR",
    usdRate: 1.120286256,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Germany",
    currency: "EUR",
    usdRate: 1.120286256,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Philippines",
    currency: "PHP",
    usdRate: 0.01591681035,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Ukraine",
    currency: "UAH",
    usdRate: 0.02226821549,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Mexico",
    currency: "MXN",
    usdRate: 0.05432791373,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Australia",
    currency: "AUD",
    usdRate: 0.6984205917,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Argentina",
    currency: "ARS",
    usdRate: 0.0006596843041,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Chile",
    currency: "CLP",
    usdRate: 0.001021441588,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Thailand",
    currency: "THB",
    usdRate: 0.02982037044,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Saudi Arabia",
    currency: "SAR",
    usdRate: 0.2666666667,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Nigeria",
    currency: "NGN",
    usdRate: 0.0007517825345,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Iran",
    currency: "IRR",
    usdRate: 0.0000006049582296,
    effectiveDate: "2026-10-12",
  },
  {
    country: "Ireland",
    currency: "EUR",
    usdRate: 1.120286256,
    effectiveDate: "2026-10-12",
  },
];

export const DEFAULT_USD_RATE = 1;
