import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';
import { EnquiryDocument } from './schemas/enquiry.schema';

function serviceWith(model: {
  create: jest.Mock;
  find: jest.Mock;
  deleteOne: jest.Mock;
}) {
  return new EnquiriesService(model as never);
}

const input: CreateEnquiryDto = {
  name: 'Ada Lovelace',
  email: 'Ada@Example.com',
  phone: '+919999999999',
  service: 'Other / Not sure yet',
  message: 'Hello there from the form',
};

describe('EnquiriesService', () => {
  it('stores a trimmed enquiry and returns the saved record', async () => {
    const id = new Types.ObjectId();
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const create = jest.fn().mockResolvedValue({
      _id: id,
      name: input.name,
      company: null,
      email: 'ada@example.com',
      phone: input.phone,
      service: input.service,
      message: input.message,
      createdAt,
    } as EnquiryDocument);
    const service = serviceWith({
      create,
      find: jest.fn(),
      deleteOne: jest.fn(),
    });

    const saved = await service.create(input);

    expect(create).toHaveBeenCalledWith({
      name: input.name,
      company: null,
      email: 'ada@example.com',
      phone: input.phone,
      service: input.service,
      message: input.message,
    });
    expect(saved).toEqual({
      id: id.toString(),
      name: input.name,
      company: null,
      email: 'ada@example.com',
      phone: input.phone,
      service: input.service,
      message: input.message,
      createdAt: createdAt.toISOString(),
    });
  });

  it('lists enquiries newest first', async () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const exec = jest.fn().mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        name: 'Ada',
        company: 'Analytical Engines',
        email: 'ada@example.com',
        phone: '+919999999999',
        service: 'Other',
        message: 'Hello there',
        createdAt,
      },
    ]);
    const sort = jest.fn().mockReturnValue({ exec });
    const find = jest.fn().mockReturnValue({ sort });
    const service = serviceWith({
      create: jest.fn(),
      find,
      deleteOne: jest.fn(),
    });

    const rows = await service.list();

    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.company).toBe('Analytical Engines');
    expect(rows[0]?.createdAt).toBe(createdAt.toISOString());
  });

  it('does not delete when the id is not a stored enquiry', async () => {
    const deleteOne = jest.fn();
    const service = serviceWith({
      create: jest.fn(),
      find: jest.fn(),
      deleteOne,
    });

    await expect(service.remove('not-an-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('reports a missing enquiry instead of a successful delete', async () => {
    const deleteOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    });
    const service = serviceWith({
      create: jest.fn(),
      find: jest.fn(),
      deleteOne,
    });

    await expect(
      service.remove('507f1f77bcf86cd799439011'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets a database failure reject the save', async () => {
    const service = serviceWith({
      create: jest.fn().mockRejectedValue(new Error('connection failed')),
      find: jest.fn(),
      deleteOne: jest.fn(),
    });

    await expect(service.create(input)).rejects.toThrow('connection failed');
  });
});
