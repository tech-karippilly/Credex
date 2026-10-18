import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  DEFAULT_LEAD_PRIORITY,
  DEFAULT_LEAD_STAGE,
  LEAD_EXPORT_MAX_ROWS,
  LEAD_IMPORT_MAX_BYTES,
  LEAD_IMPORT_MAX_ROWS,
  LEAD_PHONE_REGEX,
  LEAD_SOURCES,
} from '../constants/lead.constants';
import { LeadQueryDto } from '../dto/lead-query.dto';
import {
  LeadImportCommitResponse,
  LeadImportIssue,
  LeadImportPreviewResponse,
  LeadImportPreviewRow,
  LeadResponse,
} from '../interfaces/lead-response.interface';
import { LeadsService } from '../leads.service';
import { formatLeadDate, parseLeadDate } from '../utils/lead-dates.util';
import {
  LEAD_IMPORT_HEADERS,
  headerMapping,
  parseBudget,
  parseEnum,
  parseModules,
  rowValues,
  type LeadImportField,
} from '../utils/lead-excel-map.util';
import { buildLeadFilter, leadSort } from '../utils/lead-filter.util';
import {
  cellText,
  normalizeEmail,
  normalizePhone,
  spreadsheetSafe,
} from '../utils/lead-normalize.util';
import { INTEREST_TYPES, LEAD_PRIORITIES, LEAD_STAGES } from '../constants/lead.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { isUserActive } from '../../users/utils/user-account.util';
import { UsersService } from '../../users/users.service';
import { isDuplicateKeyError } from '../utils/lead-normalize.util';

const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

type ParsedRow = {
  rowNumber: number;
  values: Record<string, string>;
  companyName: string;
  contactName: string;
  phone: string;
  normalizedPhone: string;
  alternatePhone?: string;
  email?: string;
  normalizedEmail: string | null;
  website?: string;
  location?: string;
  source: string;
  stage: string;
  priority: string;
  assignedUserId?: string;
  interestType?: string;
  interestedModules: string[];
  requestedFeatures?: string;
  changeRequests?: string;
  businessRequirements?: string;
  estimatedBudget?: number;
  expectedTimeline?: string;
  decisionMaker?: string;
  nextFollowUpAt?: string;
  nextAction?: string;
  notes?: string;
};

@Injectable()
export class LeadExcelService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    private readonly leadsService: LeadsService,
    private readonly usersService: UsersService,
  ) {}

  async template(): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return this.writeExport(
      [this.exampleTemplateRow()],
      'credex-leads-template.xlsx',
      'xlsx',
    );
  }

  async preview(file: Express.Multer.File): Promise<LeadImportPreviewResponse> {
    const parsed = await this.parseFile(file);
    return this.buildPreview(file.originalname || 'upload', parsed.format, parsed.rows);
  }

  async commit(
    file: Express.Multer.File,
    actor: AuthenticatedUser,
  ): Promise<LeadImportCommitResponse> {
    const preview = await this.preview(file);
    let inserted = 0;
    let skipped = 0;

    for (const row of preview.rows) {
      if (row.status !== 'valid') {
        skipped += 1;
        continue;
      }
      try {
        const created = await this.leadsService.create(
          {
            companyName: row.values.companyName,
            contactName: row.values.contactName,
            phone: row.values.phone,
            alternatePhone: row.values.alternatePhone || undefined,
            email: row.values.email || undefined,
            website: row.values.website || undefined,
            location: row.values.location || undefined,
            source: row.values.source || 'IMPORT',
            stage: row.values.stage || undefined,
            priority: row.values.priority || undefined,
            assignedUserId: row.values.assignedUserId || undefined,
            interestType: row.values.interestType || undefined,
            interestedModules: row.values.interestedModules
              ? row.values.interestedModules.split('|').filter(Boolean)
              : undefined,
            requestedFeatures: row.values.requestedFeatures || undefined,
            changeRequests: row.values.changeRequests || undefined,
            businessRequirements: row.values.businessRequirements || undefined,
            estimatedBudget: row.values.estimatedBudget
              ? Number(row.values.estimatedBudget)
              : undefined,
            expectedTimeline: row.values.expectedTimeline || undefined,
            decisionMaker: row.values.decisionMaker || undefined,
            nextFollowUpAt: row.values.nextFollowUpAt || undefined,
            nextAction: row.values.nextAction || undefined,
            notes: row.values.notes || undefined,
          },
          actor,
        );
        const lead = await this.leadsService.requireLead(created.id);
        await this.leadsService.recordActivity(
          lead,
          actor,
          'IMPORT',
          'Imported from spreadsheet',
          { filename: preview.filename, rowNumber: row.rowNumber },
        );
        inserted += 1;
      } catch (error) {
        skipped += 1;
        row.status = isDuplicateKeyError(error) || /already exists/i.test(
          error instanceof Error ? error.message : '',
        )
          ? 'duplicate'
          : 'invalid';
        row.messages = [
          error instanceof Error ? error.message : 'Could not import this row',
        ];
      }
    }

    const validRows = preview.rows.filter((row) => row.status === 'valid').length;
    return {
      ...preview,
      validRows,
      invalidRows: preview.rows.filter((row) => row.status === 'invalid').length,
      duplicateRows: preview.rows.filter((row) => row.status === 'duplicate').length,
      inserted,
      skipped,
    };
  }

  async export(
    query: LeadQueryDto & { format?: 'xlsx' | 'csv' },
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const format = query.format ?? 'xlsx';
    const filter = buildLeadFilter(query);
    const total = await this.leadModel.countDocuments(filter).exec();
    if (total > LEAD_EXPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Export is limited to ${LEAD_EXPORT_MAX_ROWS} rows. Narrow the filters and try again.`,
      );
    }
    const leads = await this.leadModel
      .find(filter)
      .sort(leadSort(query))
      .limit(LEAD_EXPORT_MAX_ROWS)
      .exec();
    const rows = leads.map((lead) => this.leadsService.toResponse(lead));
    const stamp = new Date().toISOString().slice(0, 10);
    return this.writeExport(rows, `credex-leads-${stamp}.${format}`, format);
  }

  private async buildPreview(
    filename: string,
    format: 'xlsx' | 'csv',
    parsedRows: ParsedRow[],
  ): Promise<LeadImportPreviewResponse> {
    const issues: LeadImportIssue[] = [];
    const rows: LeadImportPreviewRow[] = [];
    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();

    for (const parsed of parsedRows) {
      const messages: string[] = [];
      if (!parsed.companyName) messages.push('Company name is required');
      if (!parsed.contactName) messages.push('Contact name is required');
      if (!parsed.phone) messages.push('Phone is required');
      else if (!LEAD_PHONE_REGEX.test(parsed.phone)) {
        messages.push('Phone number is invalid');
      }

      let status: LeadImportPreviewRow['status'] = messages.length
        ? 'invalid'
        : 'valid';

      if (parsed.values.assignedUserEmail?.startsWith('__invalid__:')) {
        messages.push('Assigned user email does not match an active login account');
      }
      if (
        parsed.nextFollowUpAt &&
        !/^\d{4}-\d{2}-\d{2}$/.test(parsed.nextFollowUpAt)
      ) {
        messages.push('Next follow-up date must be YYYY-MM-DD');
      }
      if (parsed.values.source && parsed.source === 'IMPORT' && parsed.values.source.trim() && parseEnum(parsed.values.source, LEAD_SOURCES) === null) {
        messages.push('Source is invalid');
      }

      if (status === 'valid' && messages.length > 0) {
        status = 'invalid';
      }

      if (status === 'valid') {
        if (seenPhones.has(parsed.normalizedPhone)) {
          status = 'duplicate';
          messages.push('Duplicate phone in this file');
        }
        if (parsed.normalizedEmail && seenEmails.has(parsed.normalizedEmail)) {
          status = 'duplicate';
          messages.push('Duplicate email in this file');
        }
        const existing = await this.leadsService.findDuplicate(
          parsed.normalizedPhone,
          parsed.normalizedEmail,
        );
        if (existing) {
          status = 'duplicate';
          messages.push('A lead with this phone number or email already exists');
        }
      }

      if (parsed.normalizedPhone) seenPhones.add(parsed.normalizedPhone);
      if (parsed.normalizedEmail) seenEmails.add(parsed.normalizedEmail);

      for (const message of messages) {
        issues.push({ rowNumber: parsed.rowNumber, message });
      }

      rows.push({
        rowNumber: parsed.rowNumber,
        status,
        messages,
        values: this.previewValues(parsed),
      });
    }

    return {
      filename,
      format,
      totalRows: rows.length,
      validRows: rows.filter((row) => row.status === 'valid').length,
      invalidRows: rows.filter((row) => row.status === 'invalid').length,
      duplicateRows: rows.filter((row) => row.status === 'duplicate').length,
      rows,
      issues,
    };
  }

  private previewValues(parsed: ParsedRow): Record<string, string> {
    return {
      companyName: parsed.companyName,
      contactName: parsed.contactName,
      phone: parsed.phone,
      alternatePhone: parsed.alternatePhone ?? '',
      email: parsed.email ?? '',
      website: parsed.website ?? '',
      location: parsed.location ?? '',
      source: parsed.source,
      stage: parsed.stage,
      priority: parsed.priority,
      assignedUserId: parsed.assignedUserId ?? '',
      interestType: parsed.interestType ?? '',
      interestedModules: parsed.interestedModules.join('|'),
      requestedFeatures: parsed.requestedFeatures ?? '',
      changeRequests: parsed.changeRequests ?? '',
      businessRequirements: parsed.businessRequirements ?? '',
      estimatedBudget:
        parsed.estimatedBudget !== undefined ? String(parsed.estimatedBudget) : '',
      expectedTimeline: parsed.expectedTimeline ?? '',
      decisionMaker: parsed.decisionMaker ?? '',
      nextFollowUpAt: parsed.nextFollowUpAt ?? '',
      nextAction: parsed.nextAction ?? '',
      notes: parsed.notes ?? '',
    };
  }

  private async parseFile(file: Express.Multer.File): Promise<{
    format: 'xlsx' | 'csv';
    rows: ParsedRow[];
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A spreadsheet file is required');
    }
    if (file.buffer.length > LEAD_IMPORT_MAX_BYTES) {
      throw new BadRequestException('Spreadsheet must be 8 MB or smaller');
    }
    const format = this.detectFormat(file);
    const table = await this.readTable(file.buffer, format);
    if (table.length < 2) {
      throw new BadRequestException('The spreadsheet does not contain any data rows');
    }
    const headers = table[0].map((cell) => cellText(cell));
    const { mapping } = headerMapping(headers);
    if (mapping.companyName === undefined || mapping.contactName === undefined || mapping.phone === undefined) {
      throw new BadRequestException(
        'The spreadsheet must include Company Name, Contact Name, and Phone columns',
      );
    }
    if (table.length - 1 > LEAD_IMPORT_MAX_ROWS) {
      throw new BadRequestException(
        `Imports are limited to ${LEAD_IMPORT_MAX_ROWS} rows`,
      );
    }

    const rows: ParsedRow[] = [];
    for (let index = 1; index < table.length; index += 1) {
      const raw = rowValues(table[index], mapping);
      if (this.isEmptyRow(raw)) {
        continue;
      }
      rows.push(await this.normalizeParsedRow(index + 1, raw));
    }
    if (rows.length === 0) {
      throw new BadRequestException('The spreadsheet does not contain any data rows');
    }
    return { format, rows };
  }

  private async normalizeParsedRow(
    rowNumber: number,
    raw: Record<LeadImportField, string>,
  ): Promise<ParsedRow> {
    const phone = raw.phone?.trim() ?? '';
    const email = raw.email?.trim() || undefined;
    const source = parseEnum(raw.source || 'IMPORT', LEAD_SOURCES) ?? 'IMPORT';
    const stage = parseEnum(raw.stage || DEFAULT_LEAD_STAGE, LEAD_STAGES) ?? DEFAULT_LEAD_STAGE;
    const priority =
      parseEnum(raw.priority || DEFAULT_LEAD_PRIORITY, LEAD_PRIORITIES) ??
      DEFAULT_LEAD_PRIORITY;
    let assignedUserId: string | undefined;
    if (raw.assignedUserEmail) {
      const user = await this.usersService.findByEmail(raw.assignedUserEmail);
      if (!user || !isUserActive(user)) {
        // Keep the row parseable; preview will still succeed with a later validation
        assignedUserId = undefined;
        raw.assignedUserEmail = `__invalid__:${raw.assignedUserEmail}`;
      } else {
        assignedUserId = user._id.toString();
      }
    }
    let nextFollowUpAt: string | undefined;
    if (raw.nextFollowUpAt) {
      try {
        nextFollowUpAt = formatLeadDate(parseLeadDate(raw.nextFollowUpAt, 'next follow-up date')) ?? undefined;
      } catch {
        nextFollowUpAt = raw.nextFollowUpAt;
      }
    }
    const interestType = raw.interestType
      ? parseEnum(raw.interestType, INTEREST_TYPES) ?? undefined
      : undefined;

    return {
      rowNumber,
      values: raw,
      companyName: raw.companyName?.trim() ?? '',
      contactName: raw.contactName?.trim() ?? '',
      phone,
      normalizedPhone: phone ? normalizePhone(phone) : '',
      alternatePhone: raw.alternatePhone || undefined,
      email,
      normalizedEmail: email ? normalizeEmail(email) : null,
      website: raw.website || undefined,
      location: raw.location || undefined,
      source,
      stage,
      priority,
      assignedUserId,
      interestType,
      interestedModules: parseModules(raw.interestedModules ?? ''),
      requestedFeatures: raw.requestedFeatures || undefined,
      changeRequests: raw.changeRequests || undefined,
      businessRequirements: raw.businessRequirements || undefined,
      estimatedBudget: raw.estimatedBudget ? parseBudget(raw.estimatedBudget) ?? undefined : undefined,
      expectedTimeline: raw.expectedTimeline || undefined,
      decisionMaker: raw.decisionMaker || undefined,
      nextFollowUpAt,
      nextAction: raw.nextAction || undefined,
      notes: raw.notes || undefined,
    };
  }

  private isEmptyRow(raw: Record<string, string>): boolean {
    return Object.values(raw).every((value) => !value);
  }

  private detectFormat(file: Express.Multer.File): 'xlsx' | 'csv' {
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      throw new BadRequestException(
        'Excel 97-2003 (.xls) files are not supported. Upload an .xlsx or .csv file.',
      );
    }
    const buffer = file.buffer;
    if (
      buffer.length >= 4 &&
      buffer[0] === XLS_MAGIC[0] &&
      buffer[1] === XLS_MAGIC[1] &&
      buffer[2] === XLS_MAGIC[2] &&
      buffer[3] === XLS_MAGIC[3]
    ) {
      throw new BadRequestException(
        'Excel 97-2003 (.xls) files are not supported. Upload an .xlsx or .csv file.',
      );
    }
    if (name.endsWith('.csv')) {
      return 'csv';
    }
    if (name.endsWith('.xlsx') || (buffer[0] === 0x50 && buffer[1] === 0x4b)) {
      return 'xlsx';
    }
    if (this.looksLikeCsv(buffer)) {
      return 'csv';
    }
    throw new BadRequestException('Unsupported file. Upload an .xlsx or .csv file.');
  }

  private looksLikeCsv(buffer: Buffer): boolean {
    const sample = buffer.subarray(0, 512).toString('utf8');
    return sample.includes(',') && !sample.includes('\0');
  }

  private async readTable(
    buffer: Buffer,
    format: 'xlsx' | 'csv',
  ): Promise<unknown[][]> {
    const workbook = new ExcelJS.Workbook();
    if (format === 'csv') {
      await workbook.csv.read(Readable.from(buffer));
    } else {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('The spreadsheet does not contain a worksheet');
    }
    const rows: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(values);
    });
    return rows;
  }

  private exampleTemplateRow(): LeadResponse {
    return {
      id: '',
      companyName: 'Acme Traders',
      contactName: 'Priya Nair',
      phone: '+919876543210',
      alternatePhone: '',
      email: 'priya@example.com',
      website: 'https://example.com',
      location: 'Kochi',
      source: 'REFERRAL',
      stage: 'NEW',
      priority: 'MEDIUM',
      assignedUserId: null,
      assignedUserName: null,
      assignedUserEmail: '',
      interestType: 'PURCHASE_EXISTING',
      interestedModules: ['Loans', 'CRM'],
      requestedFeatures: '',
      changeRequests: '',
      businessRequirements: '',
      estimatedBudget: 250000,
      expectedTimeline: 'Q1 2027',
      decisionMaker: 'Priya Nair',
      nextFollowUpAt: '2026-10-20',
      nextAction: 'Call to confirm demo',
      notes: 'Met at a partner event',
      sourceEnquiryId: null,
      lastActivityAt: null,
      lastActivitySummary: null,
      lastActivityType: null,
      createdByUserId: '',
      updatedByUserId: '',
      createdAt: '',
      updatedAt: '',
    };
  }

  async writeExport(
    rows: LeadResponse[],
    filename: string,
    format: 'xlsx' | 'csv',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');
    sheet.addRow([...LEAD_IMPORT_HEADERS]);
    for (const row of rows) {
      sheet.addRow(
        [
          row.companyName,
          row.contactName,
          row.phone,
          row.alternatePhone ?? '',
          row.email ?? '',
          row.website ?? '',
          row.location ?? '',
          row.source,
          row.stage,
          row.priority,
          row.assignedUserEmail ?? '',
          row.interestType ?? '',
          row.interestedModules.join(', '),
          row.requestedFeatures ?? '',
          row.changeRequests ?? '',
          row.businessRequirements ?? '',
          row.estimatedBudget ?? '',
          row.expectedTimeline ?? '',
          row.decisionMaker ?? '',
          row.nextFollowUpAt ?? '',
          row.nextAction ?? '',
          row.notes ?? '',
        ].map((value) => spreadsheetSafe(String(value ?? ''))),
      );
    }
    const buffer =
      format === 'csv'
        ? Buffer.from(await workbook.csv.writeBuffer())
        : Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      filename,
      contentType:
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
