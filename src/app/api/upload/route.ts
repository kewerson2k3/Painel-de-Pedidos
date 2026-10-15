import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Extensões permitidas com segurança
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.xlsx',
  '.xls',
  '.csv',
  '.docx',
  '.doc',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
]);

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      const singleFile = formData.get('file') as File;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const uploadedResults = [];

    for (const file of files) {
      if (typeof file === 'string' || !file.name) continue;

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `O arquivo ${file.name} excede o limite máximo de 30MB.` },
          { status: 400 }
        );
      }

      const originalName = path.basename(file.name);
      const ext = path.extname(originalName).toLowerCase();

      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          {
            error: `Extensão '${ext}' não permitida. Apenas arquivos PDF, Planilhas (XLSX, XLS, CSV), Documentos e Imagens são aceitos.`,
          },
          { status: 400 }
        );
      }

      // Gera um nome de arquivo único e seguro para evitar colisão e directory traversal
      const hash = crypto.randomBytes(8).toString('hex');
      const sanitizedBase = originalName
        .replace(ext, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);
      const uniqueFileName = `${Date.now()}-${hash}-${sanitizedBase}${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      uploadedResults.push({
        url: `/uploads/${uniqueFileName}`,
        name: originalName,
        size: file.size,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedResults,
      // Se for apenas 1, inclui também no formato individual para conveniência
      file: uploadedResults[0] || null,
    });
  } catch (error: any) {
    console.error('Erro no upload de arquivo:', error);
    return NextResponse.json(
      { error: 'Erro ao processar upload de arquivo: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
