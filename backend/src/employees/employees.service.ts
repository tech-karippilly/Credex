import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  DEFAULT_EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_CODE_PREFIX,
  EMPLOYEE_DOCUMENT_FIELDS,
  EMPLOYEE_DOCUMENT_FOLDER,
  EMPLOYEE_DOCUMENT_KINDS,
  EMPLOYEE_PHOTO_MAX_BYTES,
  type EmployeeDocumentKind,
  type EmployeeStatus,
} from './constants/employee.constants';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  EmployeeDetail,
  EmployeeFileResponse,
  EmployeeListItem,
  EmployeeListResult,
  EmployeeManagerResponse,
  EmployeeOption,
  EmployeeSummary,
} from './interfaces/employee-response.interface';
import {
  EmployeeCounter,
  EmployeeCounterDocument,
} from './schemas/employee-counter.schema';
import {
  EmployeeDepartment,
  EmployeeDepartmentDocument,
} from './schemas/employee-department.schema';
import {
  EmployeeDesignation,
  EmployeeDesignationDocument,
} from './schemas/employee-designation.schema';
import {
  Employee,
  EmployeeDocument,
  EmployeeFile,
} from './schemas/employee.schema';

const IMAGE_MIME = /^image\/(jpeg|jpg|png)$/;
const DOCUMENT_MIME = /^(image\/(jpeg|jpg|png)|application\/pdf)$/;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(EmployeeDesignation.name)
    private readonly designationModel: Model<EmployeeDesignationDocument>,
    @InjectModel(EmployeeDepartment.name)
    private readonly departmentModel: Model<EmployeeDepartmentDocument>,
    @InjectModel(EmployeeCounter.name)
    private readonly counterModel: Model<EmployeeCounterDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async jobSetup(): Promise<{
    departments: Array<{ id: string; name: string }>;
    designations: Array<{ id: string; name: string }>;
  }> {
    return {
      departments: await this.listDepartments(),
      designations: await this.listDesignations(),
    };
  }

  async listDepartments(): Promise<Array<{ id: string; name: string }>> {
    await this.ensureDepartments();
    const rows = await this.departmentModel
      .find()
      .sort({ name: 1, _id: 1 })
      .exec();
    return rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
    }));
  }

  async createDepartment(name: string): Promise<{ id: string; name: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Enter a department');
    try {
      const created = await this.departmentModel.create({
        name: trimmed,
        key: trimmed.toLowerCase(),
      });
      return { id: created._id.toString(), name: created.name };
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('This department already exists');
      }
      throw error;
    }
  }

  async updateDepartment(
    id: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Enter a department');
    const current = await this.findDepartment(id);
    const previousName = current.name;
    if (previousName === trimmed) {
      return { id: current._id.toString(), name: current.name };
    }

    const key = trimmed.toLowerCase();
    const taken = await this.departmentModel
      .findOne({ key, _id: { $ne: current._id } })
      .exec();
    if (taken) {
      throw new ConflictException('This department already exists');
    }

    current.name = trimmed;
    current.key = key;
    try {
      await current.save();
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('This department already exists');
      }
      throw error;
    }

    await this.employeeModel
      .updateMany(
        { department: previousName },
        { $set: { department: trimmed } },
      )
      .exec();

    return { id: current._id.toString(), name: current.name };
  }

  async removeDepartment(id: string): Promise<void> {
    const department = await this.findDepartment(id);
    const inUse = await this.employeeModel
      .countDocuments({ department: department.name })
      .exec();
    if (inUse > 0) {
      throw new BadRequestException(
        'This department is assigned to an employee',
      );
    }
    await this.departmentModel.findByIdAndDelete(id).exec();
  }

  async listDesignations(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.designationModel
      .find()
      .sort({ name: 1, _id: 1 })
      .exec();
    return rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
    }));
  }

  async createDesignation(name: string): Promise<{ id: string; name: string }> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Enter a designation');
    }
    try {
      const created = await this.designationModel.create({
        name: trimmed,
        key: trimmed.toLowerCase(),
      });
      return { id: created._id.toString(), name: created.name };
    } catch (error) {
      throw this.conflictOrRethrow(error);
    }
  }

  async removeDesignation(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Designation not found');
    }
    const designation = await this.designationModel.findById(id).exec();
    if (!designation) throw new NotFoundException('Designation not found');

    const inUse = await this.employeeModel
      .countDocuments({ designation: designation.name })
      .exec();
    if (inUse > 0) {
      throw new BadRequestException(
        'This designation is assigned to an employee',
      );
    }

    await this.designationModel.findByIdAndDelete(id).exec();
  }

  async summary(): Promise<EmployeeSummary> {
    const [onboarding, active, exited] = await Promise.all([
      this.employeeModel.countDocuments({ status: 'onboarding' }).exec(),
      this.employeeModel.countDocuments({ status: 'active' }).exec(),
      this.employeeModel.countDocuments({ status: 'exited' }).exec(),
    ]);

    return {
      onboarding,
      active,
      exited,
      total: onboarding + active + exited,
    };
  }

  async options(): Promise<EmployeeOption[]> {
    const rows = await this.employeeModel
      .find()
      .select('employeeCode fullName status')
      .sort({ fullName: 1, _id: 1 })
      .limit(500)
      .exec();

    return rows.map((row) => ({
      id: row._id.toString(),
      employeeCode: row.employeeCode,
      fullName: row.fullName,
      status: row.status,
    }));
  }

  async list(query: EmployeeQueryDto): Promise<EmployeeListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildFilter(query);
    const [total, rows] = await Promise.all([
      this.employeeModel.countDocuments(filter).exec(),
      this.employeeModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
    ]);
    const managers = await this.managerMap(rows);

    return {
      items: rows.map((row) => this.toListItem(row, managers)),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<EmployeeDetail> {
    const employee = await this.findDocumentById(id);
    const managers = await this.managerMap([employee]);
    return this.toDetail(employee, managers);
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDetail> {
    this.assertCalendarDate('Joining date', dto.joiningDate);
    if (dto.dateOfBirth)
      this.assertCalendarDate('Date of birth', dto.dateOfBirth);
    this.assertBank(
      dto.bankName ?? '',
      dto.ifsc ?? '',
      dto.bankAccountName ?? '',
      dto.bankAccountNumber ?? '',
    );
    const department = await this.requireDepartment(dto.department);
    const designation = await this.requireDesignation(dto.designation);
    if (dto.reportingManagerId) {
      await this.assertManagerExists(dto.reportingManagerId);
    }

    const employeeCode = await this.nextEmployeeCode();
    try {
      const created = await this.employeeModel.create({
        ...this.recordFromDto(dto, employeeCode),
        department,
        designation,
      });
      const managers = await this.managerMap([created]);
      return this.toDetail(created, managers);
    } catch (error) {
      throw this.conflictOrRethrow(error);
    }
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDetail> {
    const current = await this.findDocumentById(id);
    if (dto.joiningDate)
      this.assertCalendarDate('Joining date', dto.joiningDate);
    if (dto.dateOfBirth)
      this.assertCalendarDate('Date of birth', dto.dateOfBirth);

    const bankName = dto.bankName ?? current.bankName;
    const ifsc = dto.ifsc ?? current.ifsc;
    const bankAccountName = dto.bankAccountName ?? current.bankAccountName;
    const bankAccountNumber =
      dto.bankAccountNumber ?? current.bankAccountNumber;
    this.assertBank(bankName, ifsc, bankAccountName, bankAccountNumber);

    if (dto.department !== undefined) {
      dto.department = await this.requireDepartment(dto.department);
    }
    if (dto.designation !== undefined) {
      dto.designation = await this.requireDesignation(dto.designation);
    }

    if (dto.reportingManagerId) {
      if (dto.reportingManagerId === id) {
        throw new BadRequestException(
          'An employee cannot report to themselves',
        );
      }
      await this.assertManagerExists(dto.reportingManagerId);
    }

    const patch = this.patchFromDto(dto);
    try {
      const updated = await this.employeeModel
        .findByIdAndUpdate(id, patch, { new: true, runValidators: true })
        .exec();
      if (!updated) throw new NotFoundException('Employee not found');
      const managers = await this.managerMap([updated]);
      return this.toDetail(updated, managers);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw this.conflictOrRethrow(error);
    }
  }

  async updateStatus(
    id: string,
    status: EmployeeStatus,
  ): Promise<EmployeeDetail> {
    await this.findDocumentById(id);
    const updated = await this.employeeModel
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Employee not found');
    const managers = await this.managerMap([updated]);
    return this.toDetail(updated, managers);
  }

  async uploadDocument(
    id: string,
    kind: string,
    file: Express.Multer.File,
  ): Promise<EmployeeDetail> {
    const documentKind = this.parseKind(kind);
    const employee = await this.findDocumentById(id);
    this.assertFile(documentKind, file);

    const field = EMPLOYEE_DOCUMENT_FIELDS[documentKind];
    const previous = employee[field];
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    const publicId = `${EMPLOYEE_DOCUMENT_FOLDER}/${id}/${documentKind}`;

    let uploaded: { url: string; publicId: string };
    try {
      uploaded =
        resourceType === 'raw'
          ? await this.cloudinaryService.uploadDocument(file, { publicId })
          : await this.cloudinaryService.uploadImage(file, { publicId });
    } catch (error) {
      this.logger.error(
        `Failed to upload ${documentKind} for employee ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload document');
    }

    const stored: EmployeeFile = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      resourceType,
    };

    try {
      const updated = await this.employeeModel
        .findByIdAndUpdate(
          id,
          { [field]: stored },
          { new: true, runValidators: true },
        )
        .exec();
      if (!updated) {
        await this.safeDelete(uploaded.publicId, resourceType);
        throw new NotFoundException('Employee not found');
      }

      if (
        previous?.publicId &&
        (previous.publicId !== uploaded.publicId ||
          previous.resourceType !== resourceType)
      ) {
        await this.safeDelete(previous.publicId, previous.resourceType);
      }

      const managers = await this.managerMap([updated]);
      return this.toDetail(updated, managers);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        await this.safeDelete(uploaded.publicId, resourceType);
      }
      throw error;
    }
  }

  async removeDocument(id: string, kind: string): Promise<EmployeeDetail> {
    const documentKind = this.parseKind(kind);
    const employee = await this.findDocumentById(id);
    const field = EMPLOYEE_DOCUMENT_FIELDS[documentKind];
    const current = employee[field];

    if (current?.publicId) {
      await this.safeDelete(current.publicId, current.resourceType);
    }

    const updated = await this.employeeModel
      .findByIdAndUpdate(
        id,
        { [field]: null },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException('Employee not found');
    const managers = await this.managerMap([updated]);
    return this.toDetail(updated, managers);
  }

  private recordFromDto(dto: CreateEmployeeDto, employeeCode: string) {
    return {
      employeeCode,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ?? null,
      address: dto.address ?? '',
      emergencyContactName: dto.emergencyContactName ?? '',
      emergencyContactPhone: dto.emergencyContactPhone ?? '',
      department: dto.department,
      designation: dto.designation,
      workLocation: dto.workLocation,
      employmentType: dto.employmentType,
      joiningDate: dto.joiningDate,
      reportingManagerId: dto.reportingManagerId
        ? new Types.ObjectId(dto.reportingManagerId)
        : null,
      status: 'onboarding' as const,
      deviceUserId: dto.deviceUserId ?? null,
      bankName: dto.bankName ?? '',
      ifsc: dto.ifsc ?? '',
      bankAccountName: dto.bankAccountName ?? '',
      bankAccountNumber: dto.bankAccountNumber ?? '',
    };
  }

  private patchFromDto(dto: UpdateEmployeeDto): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const fields = [
      'fullName',
      'email',
      'phone',
      'address',
      'emergencyContactName',
      'emergencyContactPhone',
      'department',
      'designation',
      'workLocation',
      'employmentType',
      'joiningDate',
      'bankName',
      'ifsc',
      'bankAccountName',
      'bankAccountNumber',
    ] as const;

    for (const field of fields) {
      if (dto[field] !== undefined) patch[field] = dto[field];
    }
    if (dto.dateOfBirth !== undefined) patch.dateOfBirth = dto.dateOfBirth;
    if (dto.deviceUserId !== undefined) patch.deviceUserId = dto.deviceUserId;
    if (dto.reportingManagerId !== undefined) {
      patch.reportingManagerId = dto.reportingManagerId
        ? new Types.ObjectId(dto.reportingManagerId)
        : null;
    }
    return patch;
  }

  private buildFilter(query: EmployeeQueryDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    const search = query.search?.trim();
    if (search) {
      const pattern = new RegExp(this.escapeRegex(search), 'i');
      filter.$or = [
        { fullName: pattern },
        { employeeCode: pattern },
        { department: pattern },
        { email: pattern },
      ];
    }
    return filter;
  }

  private async nextEmployeeCode(): Promise<string> {
    const counter = await this.counterModel
      .findOneAndUpdate(
        { key: 'employee' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return `${EMPLOYEE_CODE_PREFIX}-${String(counter?.seq ?? 1).padStart(4, '0')}`;
  }

  private async managerMap(
    employees: Array<Pick<Employee, 'reportingManagerId'>>,
  ): Promise<Map<string, EmployeeManagerResponse>> {
    const ids = [
      ...new Set(
        employees
          .map((employee) => employee.reportingManagerId?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const map = new Map<string, EmployeeManagerResponse>();
    if (ids.length === 0) return map;

    const rows = await this.employeeModel
      .find({ _id: { $in: ids } })
      .select('employeeCode fullName')
      .exec();

    for (const row of rows) {
      map.set(row._id.toString(), {
        id: row._id.toString(),
        employeeCode: row.employeeCode,
        fullName: row.fullName,
      });
    }
    return map;
  }

  private toListItem(
    employee: EmployeeDocument,
    managers: Map<string, EmployeeManagerResponse>,
  ): EmployeeListItem {
    const managerId = employee.reportingManagerId?.toString() ?? null;
    return {
      id: employee._id.toString(),
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      workLocation: employee.workLocation,
      employmentType: employee.employmentType,
      joiningDate: employee.joiningDate,
      status: employee.status,
      deviceUserId: employee.deviceUserId ?? null,
      reportingManager: managerId ? (managers.get(managerId) ?? null) : null,
    };
  }

  private toDetail(
    employee: EmployeeDocument,
    managers: Map<string, EmployeeManagerResponse>,
  ): EmployeeDetail {
    return {
      ...this.toListItem(employee, managers),
      dateOfBirth: employee.dateOfBirth ?? null,
      address: employee.address ?? '',
      emergencyContactName: employee.emergencyContactName ?? '',
      emergencyContactPhone: employee.emergencyContactPhone ?? '',
      bankName: employee.bankName ?? '',
      ifsc: employee.ifsc ?? '',
      bankAccountName: employee.bankAccountName ?? '',
      bankAccountNumber: employee.bankAccountNumber ?? '',
      photo: this.toFile(employee.photo),
      idProof: this.toFile(employee.idProof),
      pan: this.toFile(employee.pan),
      bankProof: this.toFile(employee.bankProof),
      offerLetter: this.toFile(employee.offerLetter),
      createdAt: employee.createdAt?.toISOString() ?? new Date(0).toISOString(),
      updatedAt: employee.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    };
  }

  private toFile(
    file: EmployeeFile | null | undefined,
  ): EmployeeFileResponse | null {
    if (!file?.url) return null;
    return {
      url: file.url,
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
  }

  private async findDocumentById(id: string): Promise<EmployeeDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Employee not found');
    }
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private async assertManagerExists(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Reporting manager not found');
    }
    const manager = await this.employeeModel.findById(id).exec();
    if (!manager) throw new NotFoundException('Reporting manager not found');
  }

  private parseKind(kind: string): EmployeeDocumentKind {
    if ((EMPLOYEE_DOCUMENT_KINDS as readonly string[]).includes(kind)) {
      return kind as EmployeeDocumentKind;
    }
    throw new BadRequestException('Unknown document');
  }

  private assertFile(
    kind: EmployeeDocumentKind,
    file: Express.Multer.File,
  ): void {
    if (kind === 'photo') {
      if (!IMAGE_MIME.test(file.mimetype)) {
        throw new BadRequestException('Photo must be a JPG or PNG');
      }
      if (file.size > EMPLOYEE_PHOTO_MAX_BYTES) {
        throw new BadRequestException('Photo must be 5 MB or smaller');
      }
      return;
    }

    if (!DOCUMENT_MIME.test(file.mimetype)) {
      throw new BadRequestException('Upload a JPG, PNG, or PDF');
    }
  }

  private async ensureDepartments(): Promise<void> {
    const count = await this.departmentModel.countDocuments().exec();
    if (count > 0) return;
    try {
      await this.departmentModel.insertMany(
        DEFAULT_EMPLOYEE_DEPARTMENTS.map((name) => ({
          name,
          key: name.toLowerCase(),
        })),
      );
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) throw error;
    }
  }

  private async findDepartment(
    id: string,
  ): Promise<EmployeeDepartmentDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Department not found');
    }
    const department = await this.departmentModel.findById(id).exec();
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private async requireDepartment(value: string): Promise<string> {
    await this.ensureDepartments();
    const department = await this.departmentModel
      .findOne({ key: value.trim().toLowerCase() })
      .exec();
    if (!department) {
      throw new BadRequestException('Choose a department from the list');
    }
    return department.name;
  }

  private async requireDesignation(value: string): Promise<string> {
    const designation = await this.designationModel
      .findOne({ key: value.trim().toLowerCase() })
      .exec();
    if (!designation) {
      throw new BadRequestException('Choose a designation from the list');
    }
    return designation.name;
  }

  private assertCalendarDate(label: string, value: string): void {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
  }

  private assertBank(
    bankName: string,
    ifsc: string,
    accountName: string,
    accountNumber: string,
  ): void {
    const filled = [bankName, ifsc, accountName, accountNumber].map(
      (value) => value.trim().length > 0,
    );
    if (filled.some(Boolean) && !filled.every(Boolean)) {
      throw new BadRequestException(
        'Bank name, IFSC, account name, and account number must all be provided',
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private conflictOrRethrow(error: unknown): Error {
    if (!this.isDuplicateKeyError(error)) {
      return error instanceof Error ? error : new Error('Employee save failed');
    }

    const keyPattern =
      typeof error === 'object' && error !== null && 'keyPattern' in error
        ? (error as { keyPattern?: Record<string, unknown> }).keyPattern
        : undefined;

    if (keyPattern?.email) {
      return new ConflictException(
        'An employee with this email already exists',
      );
    }
    if (keyPattern?.deviceUserId) {
      return new ConflictException('This eSSL user id is already assigned');
    }
    if (keyPattern?.key) {
      return new ConflictException('This designation already exists');
    }
    if (keyPattern?.employeeCode) {
      return new ConflictException(
        'Could not assign an employee code. Try again.',
      );
    }
    return new ConflictException(
      'Employee record conflicts with an existing one',
    );
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }

  private async safeDelete(
    publicId: string,
    resourceType: 'image' | 'raw',
  ): Promise<void> {
    try {
      await this.cloudinaryService.deleteAsset(publicId, resourceType);
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary asset ${publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
