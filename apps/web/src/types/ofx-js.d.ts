declare module "ofx-js" {
  export interface OFXTransaction {
    TRNTYPE?: string;
    DTPOSTED?: string;
    TRNAMT?: string;
    FITID?: string;
    MEMO?: string;
    NAME?: string;
  }

  interface Statement {
    CURDEF?: string;
    CCACCTFROM?: AccountInfo;
    BANKACCTFROM?: AccountInfo;
    BANKTRANLIST?: TransactionList;
    LEDGERBAL?: {
      BALAMT?: string;
      DTASOF?: string;
    };
  }

  interface AccountInfo {
    ACCTID?: string;
    BANKID?: string;
    ACCTTYPE?: string;
  }

  interface TransactionList {
    DTSTART?: string;
    DTEND?: string;
    STMTTRN?: OFXTransaction | OFXTransaction[];
  }

  export interface OFXData {
    header?: Record<string, string>;
    OFX?: {
      SIGNONMSGSRSV1?: {
        SONRS?: {
          FI?: {
            ORG?: string;
            FID?: string;
          };
        };
      };
      CREDITCARDMSGSRSV1?: {
        CCSTMTTRNRS?: {
          CCSTMTRS?: Statement;
        };
      };
      BANKMSGSRSV1?: {
        STMTTRNRS?: {
          STMTRS?: Statement;
        };
      };
    };
  }

  export function parse(data: string): Promise<OFXData>;
}
