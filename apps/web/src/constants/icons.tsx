import { bankLogoOptions } from "@/lib/bank-logos";
import type { AccountIconOption } from "@/types";

export const baseAccountIconOptions: AccountIconOption[] = [
  { key: "initials", label: "Iniciais" },
  {
    key: "bank",
    label: "Banco",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10h18" />
        <path d="M4 10l8-5 8 5" />
        <path d="M5 10v7" />
        <path d="M9 10v7" />
        <path d="M15 10v7" />
        <path d="M19 10v7" />
        <path d="M3 17h18" />
      </svg>
    ),
  },
  {
    key: "wallet",
    label: "Carteira",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="3" />
        <path d="M16 12h4" />
        <path d="M7 7V5h10" />
      </svg>
    ),
  },
  {
    key: "card",
    label: "Cartão",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    key: "cash",
    label: "Dinheiro",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M7 9h.01" />
        <path d="M17 15h.01" />
      </svg>
    ),
  },
  {
    key: "savings",
    label: "Poupança",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v8" />
        <path d="M8 11l4 4 4-4" />
      </svg>
    ),
  },
  {
    key: "benefits",
    label: "Benefícios",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="11" rx="2" />
        <path d="M9 7V5h6v2" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    key: "invest",
    label: "Investimento",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19h16" />
        <rect x="6" y="10" width="3" height="7" rx="1" />
        <rect x="11" y="7" width="3" height="10" rx="1" />
        <rect x="16" y="13" width="3" height="4" rx="1" />
      </svg>
    ),
  },
];

export const accountIconOptions: AccountIconOption[] = [
  ...baseAccountIconOptions,
  ...bankLogoOptions,
];

export const accountIconLookup = accountIconOptions.reduce<
  Record<string, AccountIconOption>
>((acc, option) => {
  acc[option.key] = option;
  return acc;
}, {});

export const categoryIconOptions: AccountIconOption[] = [
  ...baseAccountIconOptions,
  {
    key: "tag",
    label: "Etiqueta",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 10l-6-6H6a2 2 0 0 0-2 2v8l6 6 10-10z" />
        <circle cx="9" cy="7" r="1.5" />
      </svg>
    ),
  },
  {
    key: "cart",
    label: "Compras",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M3 4h2l2.8 9.5a2 2 0 0 0 2 1.5h7.4a2 2 0 0 0 2-1.5L21 8H7" />
      </svg>
    ),
  },
  {
    key: "home",
    label: "Casa",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    key: "car",
    label: "Transporte",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 16l1.5-6h11L19 16" />
        <path d="M5 16h14" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    key: "food",
    label: "Alimentação",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 3v7a4 4 0 0 0 4 4h1" />
        <path d="M8 3v7" />
        <path d="M12 3v18" />
        <path d="M20 4c0 3-2 5-4 5v12" />
      </svg>
    ),
  },
  {
    key: "health",
    label: "Saúde",
    icon: ({ className = "h-5 w-5" }) => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-6-4.35-8-7.5C2 10 4 7 7 7c2 0 3.5 1.4 5 3 1.5-1.6 3-3 5-3 3 0 5 3 3 6.5-2 3.15-8 7.5-8 7.5z" />
      </svg>
    ),
  },
];

export const categoryIconLookup = categoryIconOptions.reduce<
  Record<string, AccountIconOption>
>((acc, option) => {
  acc[option.key] = option;
  return acc;
}, {});
