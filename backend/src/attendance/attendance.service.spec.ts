import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SaveAttendanceDayDto } from './dto/save-attendance-day.dto';
import { AttendanceService } from './attendance.service';

const employeeId = new Types.ObjectId();
const actorId = new Types.ObjectId().toString();

const employee = {
  _id: employeeId,
  employeeCode: 'NF-0001',
  fullName: 'Ada Lovelace',
  department: 'Support',
  designation: 'Engineer',
  deviceUserId: '101',
  joiningDate: '2026-01-01',
  status: 'active',
};

describe('AttendanceService', () => {
  function serviceWith(options?: {
    employees?: unknown[];
    records?: unknown[];
    findEmployees?: unknown[];
    update?: jest.Mock;
  }) {
    const attendanceModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(options?.records ?? []),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };
    if (options?.update) {
      attendanceModel.findOneAndUpdate = options.update;
    }

    const employeeModel = {
      find: jest.fn().mockImplementation((filter: { _id?: { $in: unknown[] } }) => {
        if (filter._id?.$in) {
          return {
            exec: jest.fn().mockResolvedValue(options?.findEmployees ?? [employee]),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(options?.employees ?? [employee]),
            }),
          }),
        };
      }),
    };

    return new AttendanceService(
      attendanceModel as never,
      employeeModel as never,
    );
  }

  it('returns register rows merged with saved attendance', async () => {
    const service = serviceWith({
      records: [
        {
          employeeId,
          date: '2026-11-02',
          status: 'present',
          checkIn: '09:30',
          checkOut: '18:00',
          note: '',
          source: 'manual',
          updatedAt: new Date('2026-11-02T10:00:00.000Z'),
        },
      ],
    });

    const result = await service.getDay({ date: '2026-11-02' });
    expect(result.date).toBe('2026-11-02');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      employeeId: employeeId.toString(),
      status: 'present',
      checkIn: '09:30',
      checkOut: '18:00',
    });
  });

  it('rejects attendance before joining date', async () => {
    const service = serviceWith();
    const dto: SaveAttendanceDayDto = {
      date: '2025-12-31',
      entries: [{ employeeId: employeeId.toString(), status: 'present' }],
    };

    await expect(service.saveDay(dto, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown employees', async () => {
    const service = serviceWith({ findEmployees: [] });
    const dto: SaveAttendanceDayDto = {
      date: '2026-11-02',
      entries: [{ employeeId: employeeId.toString(), status: 'absent' }],
    };

    await expect(service.saveDay(dto, actorId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upserts manual attendance for each entry', async () => {
    const update = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    const service = serviceWith({ update });

    await service.saveDay(
      {
        date: '2026-11-02',
        entries: [
          {
            employeeId: employeeId.toString(),
            status: 'wfh',
            note: 'Client demo',
          },
        ],
      },
      actorId,
    );

    expect(update).toHaveBeenCalledWith(
      { employeeId, date: '2026-11-02' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'wfh',
          note: 'Client demo',
          source: 'manual',
          markedByUserId: actorId,
        }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });
});
