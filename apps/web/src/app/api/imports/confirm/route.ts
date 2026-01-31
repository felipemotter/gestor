import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ParsedTransaction } from "@/lib/ofx-parser";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ImportRequest = {
  accountId: string;
  familyId: string;
  transactions: ParsedTransaction[];
  source: string;
  rawHash: string;
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
    const { accountId, familyId, transactions, source, rawHash } = body;

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
        batchId: batch.id,
      });
    }

    // Insert transactions
    const transactionsToInsert = newTransactions.map((tx) => ({
      account_id: accountId,
      amount: tx.amount,
      description: tx.memo,
      posted_at: tx.postedAt,
      source: "ofx",
      source_hash: tx.hash,
      external_id: tx.fitId,
      import_batch_id: batch.id,
      // Category will be null - user can categorize later
      category_id: null,
    }));

    const { error: insertError } = await supabase
      .from("transactions")
      .insert(transactionsToInsert);

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

    // Update batch status to processed
    await supabase
      .from("import_batches")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        metadata: {
          transaction_count: newTransactions.length,
          skipped_duplicates: transactions.length - newTransactions.length,
        },
      })
      .eq("id", batch.id);

    return NextResponse.json({
      success: true,
      imported: newTransactions.length,
      duplicates: transactions.length - newTransactions.length,
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
