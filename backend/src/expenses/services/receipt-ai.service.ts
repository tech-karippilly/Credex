import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { ExpenseCategoriesService } from '../../expense-categories/expense-categories.service';
import { AiService } from '../../ai/ai.service';
import { EXPENSE_RECEIPT_MIME_REGEX } from '../constants/expense-categories';
import { ReceiptAnalysisResponse } from '../interfaces/expense-response.interface';
import { parseReceiptExtraction } from '../parse-receipt-extraction';
import { buildReceiptExtractionPrompt } from '../receipt-extraction.prompt';

@Injectable()
export class ReceiptAiService {
  private readonly logger = new Logger(ReceiptAiService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  async analyzeReceipt(
    file: Express.Multer.File,
  ): Promise<ReceiptAnalysisResponse> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Receipt file is required');
    }

    const mimeType = file.mimetype?.toLowerCase() ?? '';
    if (!EXPENSE_RECEIPT_MIME_REGEX.test(mimeType)) {
      throw new BadRequestException(
        'Receipt must be a JPG, PNG, or PDF file',
      );
    }

    try {
      const categoryNames =
        await this.expenseCategoriesService.getActiveCategoryNames();
      let raw: string;

      if (mimeType === 'application/pdf') {
        const text = await this.extractPdfText(file.buffer);
        raw = await this.aiService.generateText(
          buildReceiptExtractionPrompt(categoryNames, text),
        );
      } else {
        const base64 = file.buffer.toString('base64');
        raw = await this.aiService.generateWithInlineData(
          buildReceiptExtractionPrompt(categoryNames),
          mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
          base64,
        );
      }

      const parsed = parseReceiptExtraction(raw, categoryNames);
      const mapped = await this.expenseCategoriesService.mapCategoryNameToId(
        parsed.categoryName,
      );

      return {
        ...parsed,
        categoryId: mapped.categoryId,
        categoryName: mapped.categoryName,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      this.logger.warn(
        `Receipt analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadGatewayException(
        'Unable to extract expense details from the receipt',
      );
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const parsed = await pdfParse(buffer);
      const text = (parsed.text ?? '').replace(/\s+/g, ' ').trim();
      if (!text) {
        throw new BadRequestException('Could not read text from the PDF receipt');
      }
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Could not read text from the PDF receipt');
    }
  }
}
