import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { RolePermissionsService } from './role-permissions.service';

describe('RolePermissionsService permission replacement', () => {
  const roleId = new Types.ObjectId();

  function setup(legacyCodes: string[]) {
    const permissions = new Map<string, { _id: Types.ObjectId; key: string }>();
    for (const key of [
      'expenses.read',
      'expenses.create',
      'expense_categories.read',
      'expense_categories.create',
      'vouchers.read',
    ]) {
      permissions.set(key, { _id: new Types.ObjectId(), key });
    }

    const links: Array<{
      roleId: Types.ObjectId;
      permissionId: Types.ObjectId;
    }> = [];
    let storedCodes: string[] | undefined = [...legacyCodes];

    const rolePermissionModel = {
      find: jest.fn((query: { roleId?: { $in?: unknown[] } }) => ({
        select: () => ({
          exec: async () => {
            const ids = new Set((query.roleId?.$in ?? []).map(String));
            return links
              .filter((link) => ids.has(String(link.roleId)))
              .map((link) => ({ permissionId: link.permissionId }));
          },
        }),
      })),
      findOne: jest.fn(
        (query: { roleId: unknown; permissionId: unknown }) => ({
          exec: async () =>
            links.find(
              (link) =>
                String(link.roleId) === String(query.roleId) &&
                String(link.permissionId) === String(query.permissionId),
            ) ?? null,
        }),
      ),
      create: jest.fn(
        async (doc: { roleId: Types.ObjectId; permissionId: Types.ObjectId }) => {
          links.push({
            roleId: doc.roleId,
            permissionId: doc.permissionId,
          });
          return doc;
        },
      ),
      findOneAndDelete: jest.fn(
        (query: { roleId: unknown; permissionId: unknown }) => ({
          exec: async () => {
            const index = links.findIndex(
              (link) =>
                String(link.roleId) === String(query.roleId) &&
                String(link.permissionId) === String(query.permissionId),
            );
            if (index < 0) {
              return null;
            }
            const [removed] = links.splice(index, 1);
            return removed;
          },
        }),
      ),
      db: {
        collection: () => ({
          findOne: async () => ({ permissions: storedCodes }),
          updateOne: async (
            _filter: unknown,
            update: { $unset?: { permissions?: string } },
          ) => {
            if (update.$unset && 'permissions' in update.$unset) {
              storedCodes = undefined;
            }
            return { acknowledged: true };
          },
        }),
      },
    };

    const permissionModel = {
      find: jest.fn(
        (query: { key?: { $in?: string[] }; _id?: { $in?: unknown[] } }) => ({
          select: () => ({
            exec: async () => {
              if (query.key?.$in) {
                return query.key.$in
                  .map((key) => permissions.get(key))
                  .filter((permission) => permission !== undefined);
              }

              const ids = new Set((query._id?.$in ?? []).map(String));
              return [...permissions.values()].filter((permission) =>
                ids.has(String(permission._id)),
              );
            },
          }),
        }),
      ),
      findOne: jest.fn((query: { key: string }) => ({
        exec: async () => permissions.get(query.key) ?? null,
      })),
    };

    const rolesService = {
      findById: jest.fn(async () => ({
        _id: roleId,
        name: 'Accountant',
        key: 'accountant',
        description: 'Accounting operations',
        systemManaged: false,
      })),
    };

    return {
      service: new RolePermissionsService(
        rolePermissionModel as never,
        permissionModel as never,
        rolesService as never,
      ),
      links,
      rolePermissionModel,
      getCodes: () => storedCodes,
    };
  }

  it('stores a legacy role selection as permission keys without revoking missing joins', async () => {
    const { service, links, rolePermissionModel, getCodes } = setup([
      'ACCOUNT_VIEW',
    ]);

    const result = await service.replace(roleId.toString(), ['expenses.read']);

    expect(result).toEqual({
      added: [],
      removed: ['expense_categories.read'],
    });
    expect(rolePermissionModel.findOneAndDelete).not.toHaveBeenCalled();
    expect(links).toHaveLength(1);
    expect(await service.listKeys(roleId.toString())).toEqual(['expenses.read']);
    expect(getCodes()).toBeUndefined();
  });

  it('adds expense_categories.read when that catalogue key exists', async () => {
    const { service, links } = setup(['ACCOUNT_CREATE']);

    const result = await service.replace(roleId.toString(), [
      'expenses.create',
      'expense_categories.create',
      'expense_categories.read',
    ]);

    expect(result.added).toEqual(['expense_categories.read']);
    expect(result.removed).toEqual([]);
    expect(links).toHaveLength(3);
    expect(await service.listKeys(roleId.toString())).toEqual([
      'expense_categories.create',
      'expense_categories.read',
      'expenses.create',
    ]);
  });

  it('updates an existing join-backed role and returns the saved keys', async () => {
    const { service, links, rolePermissionModel } = setup([]);

    await service.replace(roleId.toString(), ['expenses.read']);
    const result = await service.replace(roleId.toString(), [
      'expenses.read',
      'expense_categories.read',
    ]);

    expect(result).toEqual({
      added: ['expense_categories.read'],
      removed: [],
    });
    expect(rolePermissionModel.findOneAndDelete).not.toHaveBeenCalled();
    expect(links).toHaveLength(2);
    expect(await service.listKeys(roleId.toString())).toEqual([
      'expense_categories.read',
      'expenses.read',
    ]);

    await service.replace(roleId.toString(), ['expense_categories.read']);
    expect(await service.listKeys(roleId.toString())).toEqual([
      'expense_categories.read',
    ]);
    expect(links).toHaveLength(1);
  });

  it('rejects an unknown permission without changing stored assignments', async () => {
    const { service, links, getCodes } = setup(['ACCOUNT_VIEW']);

    await expect(
      service.replace(roleId.toString(), ['missing.permission']),
    ).rejects.toThrow('Unknown permission: missing.permission');
    await expect(
      service.replace(roleId.toString(), ['missing.permission']),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(links).toHaveLength(0);
    expect(getCodes()).toEqual(['ACCOUNT_VIEW']);
    expect(await service.listKeys(roleId.toString())).toEqual([
      'expense_categories.read',
      'expenses.read',
    ]);
  });

  it('reports a missing role-permission join from a direct revoke', async () => {
    const { service } = setup([]);

    await expect(
      service.revoke(roleId.toString(), 'expenses.read'),
    ).rejects.toThrow('Role permission not found');
    await expect(
      service.revoke(roleId.toString(), 'expenses.read'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not write permission joins for an unknown role id', async () => {
    const { service, links, getCodes } = setup(['ACCOUNT_VIEW']);

    await expect(
      service.replace('not-a-role', ['expenses.read']),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(links).toHaveLength(0);
    expect(getCodes()).toEqual(['ACCOUNT_VIEW']);
  });
});
