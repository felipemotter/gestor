import { parse as parseOFXFile, type OFXTransaction } from "ofx-js";

export type ParsedTransaction = {
  fitId: string;
  type: "DEBIT" | "CREDIT" | string;
  postedAt: string; // YYYY-MM-DD
  amount: number;
  memo: string;
  hash: string;
};

export type ParsedOFX = {
  bankId: string;
  bankName: string;
  accountId: string;
  currency: string;
  startDate: string;
  endDate: string;
  ledgerBalance: number | null;
  transactions: ParsedTransaction[];
};

/**
 * Parse OFX date format (20260124000000[-3:BRT]) to YYYY-MM-DD
 */
function parseOFXDate(dateStr: string): string {
  if (!dateStr) return "";
  // Remove timezone part if present
  const cleanDate = dateStr.split("[")[0];
  // Extract YYYYMMDD from YYYYMMDDHHMMSS
  const year = cleanDate.slice(0, 4);
  const month = cleanDate.slice(4, 6);
  const day = cleanDate.slice(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Generate a hash for duplicate detection
 */
function generateHash(fitId: string, amount: number, postedAt: string, memo: string): string {
  const data = `${fitId}|${amount}|${postedAt}|${memo}`;
  // Simple hash using string manipulation (browser-compatible)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Parse an OFX file content and extract transactions
 */
export async function parseOFX(content: string): Promise<ParsedOFX> {
  const ofx = await parseOFXFile(content);

  // Navigate to the statement data
  // Credit card statements use CREDITCARDMSGSRSV1 > CCSTMTTRNRS > CCSTMTRS
  // Bank statements use BANKMSGSRSV1 > STMTTRNRS > STMTRS
  const signOn = ofx.OFX?.SIGNONMSGSRSV1?.SONRS;
  const bankInfo = signOn?.FI;
  const bankName = bankInfo?.ORG ?? "";
  const bankId = bankInfo?.FID ?? "";

  // Try credit card statement first
  let statement = ofx.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;
  let accountFrom = statement?.CCACCTFROM;

  // If not credit card, try bank statement
  if (!statement) {
    statement = ofx.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
    accountFrom = statement?.BANKACCTFROM;
  }

  if (!statement) {
    throw new Error("Formato OFX não suportado. Não foi possível encontrar dados de extrato.");
  }

  const currency = statement.CURDEF ?? "BRL";
  const accountId = accountFrom?.ACCTID ?? "";

  const tranList = statement.BANKTRANLIST;
  const startDate = parseOFXDate(tranList?.DTSTART ?? "");
  const endDate = parseOFXDate(tranList?.DTEND ?? "");

  // Get ledger balance
  const ledgerBal = statement.LEDGERBAL;
  const ledgerBalance = ledgerBal?.BALAMT ? parseFloat(ledgerBal.BALAMT) : null;

  // Parse transactions
  const rawTransactions = tranList?.STMTTRN ?? [];
  const transactionArray = Array.isArray(rawTransactions) ? rawTransactions : [rawTransactions];

  const transactions: ParsedTransaction[] = transactionArray
    .filter((tx: OFXTransaction) => tx && tx.FITID)
    .map((tx: OFXTransaction) => {
      const fitId = String(tx.FITID ?? "");
      const type = String(tx.TRNTYPE ?? "OTHER");
      const postedAt = parseOFXDate(String(tx.DTPOSTED ?? ""));
      const amount = parseFloat(String(tx.TRNAMT ?? "0"));
      const memo = String(tx.MEMO ?? "").trim();
      const hash = generateHash(fitId, amount, postedAt, memo);

      return {
        fitId,
        type,
        postedAt,
        amount,
        memo,
        hash,
      };
    });

  return {
    bankId,
    bankName,
    accountId,
    currency,
    startDate,
    endDate,
    ledgerBalance,
    transactions,
  };
}
