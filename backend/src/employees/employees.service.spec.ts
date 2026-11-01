import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeesService } from './employees.service';
import { EmployeeDocument } from './schemas/employee.schema';

const input: CreateEmployeeDto = {
  fullName: 'Ada Lovelace',
  email: 'ada@neuraforge.ai',
  phone: '9876543210',
  department: 'Marketing',
  designation: 'Engineer',
  workLocation: 'Irinjalakuda',
  employmentType: 'full_time',
  joiningDate: '2026-10-01',
};

function savedEmployee(seq = 1): EmployeeDocument {
  const id = new Types.ObjectId();
  return {
    _id: id,
    employeeCode: `NF-${String(seq).padStart(4, '0')}`,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    dateOfBirth: null,
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    department: input.department,
    designation: input.designation,
    workLocation: input.workLocation,
    employmentType: 'full_time',
    joiningDate: input.joiningDate,
    reportingManagerId: null,
    status: 'onboarding',
    deviceUserId: null,
    bankName: '',
    ifsc: '',
    bankAccountName: '',
    bankAccountNumber: '',
    photo: null,
    idProof: null,
    pan: null,
    bankProof: null,
    offerLetter: null,
    createdAt: new Date('2026-10-31T00:00:00.000Z'),
    updatedAt: new Date('2026-10-31T00:00:00.000Z'),
  } as EmployeeDocument;
}

describe('EmployeesService', () => {
  function serviceWith(options?: {
    seq?: number;
    create?: jest.Mock;
    findById?: jest.Mock;
    findByIdAndUpdate?: jest.Mock;
  }) {
    const created = savedEmployee(options?.seq ?? 1);
    const employeeModel = {
      create: options?.create ?? jest.fn().mockResolvedValue(created),
      findById:
        options?.findById ??
        jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(created) }),
      findByIdAndUpdate: options?.findByIdAndUpdate ?? jest.fn(),
      find: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
      countDocuments: jest.fn(),
    };
    const designationModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ name: 'Engineer', key: 'engineer' }),
      }),
    };
    const departmentModel = {
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(3),
      }),
      findOne: jest.fn().mockImplementation((query: { key?: string }) => ({
        exec: jest
          .fn()
          .mockResolvedValue(
            query.key === 'marketing'
              ? { name: 'Marketing', key: 'marketing' }
              : null,
          ),
      })),
    };
    const counterModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ seq: options?.seq ?? 1 }),
      }),
    };
    const cloudinary = {
      uploadImage: jest.fn(),
      uploadDocument: jest.fn(),
      deleteAsset: jest.fn(),
    };
    return {
      service: new EmployeesService(
        employeeModel as never,
        designationModel as never,
        departmentModel as never,
        counterModel as never,
        cloudinary as never,
      ),
      employeeModel,
      created,
    };
  }

  it('assigns the next Neuraforge employee code and starts onboarding', async () => {
    const { service, employeeModel } = serviceWith({ seq: 12 });

    const saved = await service.create(input);

    expect(employeeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeCode: 'NF-0012',
        status: 'onboarding',
        email: 'ada@neuraforge.ai',
        deviceUserId: null,
      }),
    );
    expect(saved.employeeCode).toBe('NF-0012');
    expect(saved.status).toBe('onboarding');
    expect(saved.bankName).toBe('');
    expect(saved.ifsc).toBe('');
    expect(saved.bankAccountNumber).toBe('');
  });

  it('stores bank name and IFSC with the account details', async () => {
    const { service, employeeModel } = serviceWith();

    await service.create({
      ...input,
      bankName: 'HDFC Bank',
      ifsc: 'HDFC0001234',
      bankAccountName: 'Ada Lovelace',
      bankAccountNumber: '123456789012',
    });

    expect(employeeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        bankName: 'HDFC Bank',
        ifsc: 'HDFC0001234',
        bankAccountName: 'Ada Lovelace',
        bankAccountNumber: '123456789012',
      }),
    );
  });

  it('rejects bank details when only some fields are filled', async () => {
    const { service, employeeModel } = serviceWith();

    await expect(
      service.create({
        ...input,
        bankName: 'HDFC Bank',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(employeeModel.create).not.toHaveBeenCalled();
  });

  it('rejects a department outside Marketing, Support, and QA', async () => {
    const { service } = serviceWith();

    await expect(
      service.create({
        ...input,
        department: 'Engineering',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate email', async () => {
    const { service } = serviceWith({
      create: jest
        .fn()
        .mockRejectedValue({ code: 11000, keyPattern: { email: 1 } }),
    });

    await expect(service.create(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects a reporting manager who is the same employee', async () => {
    const current = savedEmployee();
    const { service, employeeModel } = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(current),
      }),
    });

    await expect(
      service.update(current._id.toString(), {
        reportingManagerId: current._id.toString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(employeeModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a missing reporting manager before saving', async () => {
    const current = savedEmployee();
    const missingId = new Types.ObjectId().toString();
    const findById = jest.fn().mockImplementation((id: string) => ({
      exec: jest
        .fn()
        .mockResolvedValue(id === current._id.toString() ? current : null),
    }));
    const { service, employeeModel } = serviceWith({ findById });

    await expect(
      service.update(current._id.toString(), { reportingManagerId: missingId }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(employeeModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
