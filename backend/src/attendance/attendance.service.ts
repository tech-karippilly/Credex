import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { ATTENDANCE_REGISTER_STATUSES } from './constants/attendance.constants';
import { AttendanceDayQueryDto } from './dto/attendance-day-query.dto';
import { SaveAttendanceDayDto } from './dto/save-attendance-day.dto';
import {
  AttendanceDayResult,
  AttendanceDayRow,
} from './interfaces/attendance-response.interface';
import {
  AttendanceRecord,
  AttendanceRecordDocument,
} from './schemas/attendance-record.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceModel: Model<AttendanceRecordDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async getDay(query: AttendanceDayQueryDto): Promise<AttendanceDayResult> {
    const employees = await this.findRegisterEmployees(query);
    const records = await this.attendanceModel
      .find({
        date: query.date,
        employeeId: { $in: employees.map((employee) => employee._id) },
      })
      .exec();
    const byEmployee = new Map(
      records.map((record) => [record.employeeId.toString(), record]),
    );

    return {
      date: query.date,
      rows: employees.map((employee) =>
        this.toRow(employee, byEmployee.get(employee._id.toString())),
      ),
    };
  }

  async saveDay(
    dto: SaveAttendanceDayDto,
    markedByUserId: string,
  ): Promise<AttendanceDayResult> {
    if (!isValidObjectId(markedByUserId)) {
      throw new BadRequestException('Invalid user');
    }

    const uniqueIds = new Set(dto.entries.map((entry) => entry.employeeId));
    if (uniqueIds.size !== dto.entries.length) {
      throw new BadRequestException('Duplicate employee in attendance entries');
    }

    const employees = await this.employeeModel
      .find({
        _id: { $in: [...uniqueIds] },
        status: { $in: [...ATTENDANCE_REGISTER_STATUSES] },
      })
      .exec();
    const employeeById = new Map(
      employees.map((employee) => [employee._id.toString(), employee]),
    );

    for (const entry of dto.entries) {
      const employee = employeeById.get(entry.employeeId);
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
      if (dto.date < employee.joiningDate) {
        throw new BadRequestException(
          `Attendance cannot be recorded before ${employee.fullName}'s joining date`,
        );
      }
    }

    await Promise.all(
      dto.entries.map((entry) =>
        this.attendanceModel
          .findOneAndUpdate(
            {
              employeeId: employeeById.get(entry.employeeId)!._id,
              date: dto.date,
            },
            {
              $set: {
                status: entry.status,
                checkIn: entry.checkIn ?? null,
                checkOut: entry.checkOut ?? null,
                note: entry.note?.trim() ?? '',
                source: 'manual',
                markedByUserId,
              },
            },
            { upsert: true, new: true, runValidators: true },
          )
          .exec(),
      ),
    );

    return this.getDay({ date: dto.date });
  }

  private async findRegisterEmployees(
    query: Pick<AttendanceDayQueryDto, 'department' | 'search'>,
  ): Promise<EmployeeDocument[]> {
    const filter: FilterQuery<EmployeeDocument> = {
      status: { $in: [...ATTENDANCE_REGISTER_STATUSES] },
    };

    if (query.department?.trim()) {
      filter.department = query.department.trim();
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { fullName: regex },
        { employeeCode: regex },
        { email: regex },
      ];
    }

    return this.employeeModel
      .find(filter)
      .select(
        'employeeCode fullName department designation deviceUserId joiningDate status',
      )
      .sort({ fullName: 1 })
      .exec();
  }

  private toRow(
    employee: EmployeeDocument,
    record?: AttendanceRecordDocument,
  ): AttendanceDayRow {
    return {
      employeeId: employee._id.toString(),
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      deviceUserId: employee.deviceUserId ?? null,
      joiningDate: employee.joiningDate,
      status: record?.status ?? null,
      checkIn: record?.checkIn ?? null,
      checkOut: record?.checkOut ?? null,
      note: record?.note ?? '',
      source: record?.source ?? null,
      markedAt: record?.updatedAt?.toISOString() ?? null,
    };
  }
}
