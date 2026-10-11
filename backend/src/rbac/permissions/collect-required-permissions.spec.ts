import { collectRequiredPermissions } from './collect-required-permissions';

describe('collectRequiredPermissions', () => {
  it('requires every listed permission and adds status only when that field is sent', () => {
    expect(
      collectRequiredPermissions(
        ['vouchers.update'],
        [{ field: 'status', permissions: ['vouchers.status.update'] }],
        { title: 'Rent' },
      ),
    ).toEqual(['vouchers.update']);

    expect(
      collectRequiredPermissions(
        ['vouchers.update'],
        [{ field: 'status', permissions: ['vouchers.status.update'] }],
        { status: 'CANCELLED' },
      ),
    ).toEqual(['vouchers.update', 'vouchers.status.update']);
  });

  it('does not treat a missing body as a status change', () => {
    expect(
      collectRequiredPermissions(
        ['careers.update'],
        [{ field: 'isVisible', permissions: ['careers.status.update'] }],
        undefined,
      ),
    ).toEqual(['careers.update']);
  });
});
