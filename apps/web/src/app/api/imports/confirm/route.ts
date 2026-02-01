import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ParsedTransaction } from "@/lib/ofx-parser";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type TransactionWithCategory = ParsedTransaction & {
  category_id?: string | null;
  override_description?: string;
};

type ImportRequest = {
  accountId: string;
  familyId: string;
  transactions: TransactionWithCategory[];
  source: string;
  rawHash: string;
  startDate?: string | null;
  endDate?: string | null;
  ledgerBalance?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body: ImportRequest = await request.json();
    const { accountId, familyId, transactions, source, rawHash, startDate, endDate, ledgerBalance } = body;

    if (!accountId || !familyId || !transactions?.length) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Check for existing import batch with same hash (idempotency)
    const { data: existingBatch } = await supabase
      .from("import_batches")
      .select("id")
      .eq("family_id", familyId)
      .eq("source", source)
      .eq("raw_hash", rawHash)
      .maybeSingle();

    if (existingBatch) {
      return NextResponse.json(
        { error: "Este arquivo já foi importado anteriormente" },
        { status: 409 }
      );
    }

    // Create import batch
    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        family_id: familyId,
        source,
        raw_hash: rawHash,
        status: "pending",
        metadata: {
          transaction_count: transactions.length,
          imported_at: new Date().toISOString(),
          date_start: startDate ?? null,
          date_end: endDate ?? null,
          ledger_balance: ledgerBalance ?? null,
        },
        created_by: user.id,
      })
      .select("id")
      .single();

    if (batchError) {
      console.error("Error creating import batch:", batchError);
      return NextResponse.json(
        { error: "Erro ao criar lote de importação" },
        { status: 500 }
      );
    }

    // Check for duplicate transactions by external_id (FITID)
    const fitIds = transactions.map((tx) => tx.fitId);
    const { data: existingTransactions } = await supabase
      .from("transactions")
      .select("external_id")
      .eq("account_id", accountId)
      .in("external_id", fitIds);

    const existingFitIds = new Set(existingTransactions?.map((t) => t.external_id) ?? []);

    // Filter out duplicates
    const newTransactions = transactions.filter((tx) => !existingFitIds.has(tx.fitId));

    if (newTransactions.length === 0) {
      // Update batch status to processed with 0 transactions
      await supabase
        .from("import_batches")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
          metadata: {
            transaction_count: 0,
            skipped_duplicates: transactions.length,
          },
        })
        .eq("id", batch.id);

      return NextResponse.json({
        success: true,
        imported: 0,
        duplicates: transactions.length,
        autoCategorized: 0,
        batchId: batch.id,
      });
    }

    // Count transactions with client-side categories
    let autoCategorized = 0;

    // Insert transactions
    const transactionsToInsert = newTransactions.map((tx) => {
      const hasCategoryFromClient = tx.category_id != null;
      if (hasCategoryFromClient) autoCategorized++;

      return {
        account_id: accountId,
        amount: tx.amount,
        description: tx.override_description || tx.memo,
        original_description: tx.memo,
        posted_at: tx.postedAt,
        source: "ofx",
        source_hash: tx.hash,
        external_id: tx.fitId,
        import_batch_id: batch.id,
        category_id: tx.category_id ?? null,
        auto_categorized: hasCategoryFromClient,
      };
    });

    const { data: insertedRows, error: insertError } = await supabase
      .from("transactions")
      .insert(transactionsToInsert)
      .select("id, category_id, original_description, amount");

    if (insertError) {
      console.error("Error inserting transactions:", insertError);
      // Update batch status to failed
      await supabase
        .from("import_batches")
        .update({
          status: "failed",
          metadata: {
            error: insertError.message,
          },
        })
        .eq("id", batch.id);

      return NextResponse.json(
        { error: "Erro ao inserir transações" },
        { status: 500 }
      );
    }

    // Server-side fallback: apply rules to uncategorized transactions
    const uncategorizedRows = (insertedRows ?? []).filter((row) => !row.category_id);
    if (uncategorizedRows.length > 0) {
      // Create a service_role client for reading rules (bypasses RLS)
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      const { data: rules } = await serviceClient
        .from("rules")
        .select("id, match, action, priority, created_at")
        .eq("family_id", familyId)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });

      if (rules && rules.length > 0) {
        for (const row of uncategorizedRows) {
          const tx = {
            original_description: row.original_description,
            amount: Number(row.amount),
          };

          for (const rule of rules) {
            const match = rule.match as Record<string, unknown>;
            const action = rule.action as Record<string, unknown>;

            let matched = true;
            const desc = (tx.original_description ?? "").toLowerCase();
            const absAmount = Math.abs(tx.amount);

            if (match.description_contains) {
              if (!desc.includes(String(match.description_contains).toLowerCase())) {
                matched = false;
              }
            }

            if (matched && match.description_regex) {
              try {
                const regex = new RegExp(String(match.description_regex), "i");
                if (!regex.test(tx.original_description ?? "")) {
                  matched = false;
                }
              } catch {
                matched = false;
              }
            }

            if (matched && match.amount_exact != null) {
              if (Math.abs(absAmount - Math.abs(Number(match.amount_exact))) > 0.009) {
                matched = false;
              }
            }

            if (matched && match.amount_min != null) {
              if (absAmount < Number(match.amount_min)) {
                matched = false;
              }
            }

            if (matched && match.amount_max != null) {
              if (absAmount > Number(match.amount_max)) {
                matched = false;
              }
            }

            if (matched && action.set_category_id) {
              const updateData: Record<string, unknown> = {
                category_id: action.set_category_id,
                auto_categorized: true,
              };
              if (action.set_description) {
                updateData.description = action.set_description;
              }

              const { error: updateError } = await serviceClient
                .from("transactions")
                .update(updateData)
                .eq("id", row.id);

              if (!updateError) {
                autoCategorized++;
              }
              break;
            }
          }
        }
      }
    }

    // Update batch status to processed
    await supabase
      .from("import_batches")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        metadata: {
          transaction_count: newTransactions.length,
          skipped_duplicates: transactions.length - newTransactions.length,
          auto_categorized: autoCategorized,
          date_start: startDate ?? null,
          date_end: endDate ?? null,
          ledger_balance: ledgerBalance ?? null,
        },
      })
      .eq("id", batch.id);

    // Update account reconciliation state (only advance, never retrocede)
    if (endDate) {
      const updateData: Record<string, unknown> = {
        reconciled_until: endDate,
      };
      if (ledgerBalance != null) {
        updateData.reconciled_balance = ledgerBalance;
      }

      // Only update if the new endDate is after the current reconciled_until
      const { data: currentAccount } = await supabase
        .from("accounts")
        .select("reconciled_until")
        .eq("id", accountId)
        .single();

      const shouldUpdate =
        !currentAccount?.reconciled_until ||
        endDate > currentAccount.reconciled_until;

      if (shouldUpdate) {
        await supabase
          .from("accounts")
          .update(updateData)
          .eq("id", accountId);
      }
    }

    return NextResponse.json({
      success: true,
      imported: newTransactions.length,
      duplicates: transactions.length - newTransactions.length,
      autoCategorized,
      batchId: batch.id,
    });
  } catch (error) {
    console.error("Error confirming import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao confirmar importação" },
      { status: 500 }
    );
  }
}
