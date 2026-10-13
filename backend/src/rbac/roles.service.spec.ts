import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RolesService } from './roles.service';

function serviceWith(model: {
  findById: jest.Mock;
  exists: jest.Mock;
  findByIdAndUpdate: jest.Mock;
}) {
  return new RolesService(model as never);
}

describe('RolesService role updates', () => {
  const roleId = new Types.ObjectId();

  function role(overrides: Record<string, unknown> = {}) {
    return {
      _id: roleId,
      name: 'Accountant',
      description: 'Accounting operations',
      key: 'accountant',
      systemManaged: false,
      ...overrides,
    };
  }

  it('updates name and description without replacing an existing key', async () => {
    const updated = role({
      name: 'Senior Accountant',
      description: 'Updated accounting',
    });
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });
    const service = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(role()),
      }),
      exists: jest.fn(),
      findByIdAndUpdate,
    });

    const result = await service.update(roleId.toString(), {
      name: ' Senior Accountant ',
      description: ' Updated accounting ',
    });

    expect(result.key).toBe('accountant');
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      roleId,
      {
        $set: {
          name: 'Senior Accountant',
          description: 'Updated accounting',
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('assigns a missing key once from the stored name', async () => {
    const findById = jest
      .fn()
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(role({ key: undefined })),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(role({ key: 'accountant' })),
      });
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(role()),
    });
    const exists = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const service = serviceWith({ findById, exists, findByIdAndUpdate });

    await service.update(roleId.toString(), {
      name: 'Senior Accountant',
      description: 'Updated accounting',
    });
    await service.update(roleId.toString(), {
      name: 'Finance',
      description: 'Updated accounting',
    });

    expect(exists).toHaveBeenCalledTimes(1);
    expect(findByIdAndUpdate).toHaveBeenNthCalledWith(
      1,
      roleId,
      {
        $set: {
          name: 'Senior Accountant',
          description: 'Updated accounting',
          key: 'accountant',
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
    expect(findByIdAndUpdate).toHaveBeenNthCalledWith(
      2,
      roleId,
      {
        $set: {
          name: 'Finance',
          description: 'Updated accounting',
        },
      },
      { returnDocument: 'after', runValidators: true },
    );
  });

  it('rejects a backfilled key that another role already uses', async () => {
    const service = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(role({ key: '' })),
      }),
      exists: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      }),
      findByIdAndUpdate: jest.fn(),
    });

    await expect(
      service.update(roleId.toString(), {
        name: 'Accountant',
        description: 'Accounting operations',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('turns a duplicate-key write error into a conflict', async () => {
    const service = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(role({ key: undefined })),
      }),
      exists: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      }),
    });

    await expect(
      service.update(roleId.toString(), {
        name: 'Accountant',
        description: 'Accounting operations',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 for a missing role and 400 for blank details', async () => {
    const findByIdAndUpdate = jest.fn();
    const service = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      exists: jest.fn(),
      findByIdAndUpdate,
    });

    await expect(
      service.update(new Types.ObjectId().toString(), {
        name: 'Missing',
        description: 'Missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const existing = serviceWith({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(role()),
      }),
      exists: jest.fn(),
      findByIdAndUpdate,
    });
    await expect(
      existing.update(roleId.toString(), {
        name: '   ',
        description: 'Still required',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
