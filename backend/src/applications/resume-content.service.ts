import { BadRequestException, Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { extname } from 'path';
import WordExtractor from 'word-extractor';

const MIN_TEXT_LENGTH = 1;

@Injectable()
export class ResumeContentService {
  async readFromUrl(
    url: string,
    mimeType: string,
    fileName: string,
  ): Promise<string> {
    const buffer = await this.download(url);
    return this.extract(buffer, mimeType, fileName);
  }

  async extract(
    buffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<string> {
    const extension = extname(fileName).toLowerCase();
    let text = '';

    if (extension === '.pdf' || mimeType === 'application/pdf') {
      text = await this.extractPdf(buffer);
    } else if (
      extension === '.docx' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      text = await this.extractDocx(buffer);
    } else if (extension === '.doc' || mimeType === 'application/msword') {
      text = await this.extractDoc(buffer);
    } else {
      throw new BadRequestException('Resume must be a PDF, DOC, or DOCX file');
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length < MIN_TEXT_LENGTH) {
      throw new BadRequestException('Could not read text from the resume');
    }

    return normalized;
  }

  private async download(url: string): Promise<Buffer> {
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    } catch {
      throw new BadRequestException('Could not read the resume');
    }

    if (!response.ok) {
      throw new BadRequestException('Could not read the resume');
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      const parsed = await pdfParse(buffer);
      return parsed.text ?? '';
    } catch {
      throw new BadRequestException('Could not read text from the resume');
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value ?? '';
    } catch {
      throw new BadRequestException('Could not read text from the resume');
    }
  }

  private async extractDoc(buffer: Buffer): Promise<string> {
    try {
      const extractor = new WordExtractor();
      const parsed = await extractor.extract(buffer);
      return parsed.getBody() ?? '';
    } catch {
      throw new BadRequestException('Could not read text from the resume');
    }
  }
}
