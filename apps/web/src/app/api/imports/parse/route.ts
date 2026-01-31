import { NextRequest, NextResponse } from "next/server";
import { parseOFX } from "@/lib/ofx-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".ofx")) {
      return NextResponse.json(
        { error: "Formato de arquivo inválido. Envie um arquivo .ofx" },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    if (!content.trim()) {
      return NextResponse.json(
        { error: "Arquivo vazio" },
        { status: 400 }
      );
    }

    // Parse OFX
    const parsed = await parseOFX(content);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("Error parsing OFX:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao processar arquivo OFX" },
      { status: 500 }
    );
  }
}
