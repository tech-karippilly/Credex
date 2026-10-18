import { mapLegacyPermissionCodes } from './legacy-permission-map';

describe('legacy permission map', () => {
  it('turns an administrator role into dashboard module permissions', () => {
    expect(
      mapLegacyPermissionCodes([
        'USER_VIEW',
        'JOB_VIEW',
        'APPLICATION_VIEW',
        'CMS_VIEW',
        'ROLE_VIEW',
        'SYSTEM_SETTINGS_VIEW',
        'FILE_UPLOAD',
      ]),
    ).toEqual([
      'applications.read',
      'careers.read',
      'roles.read',
      'services.read',
      'site_contact.read',
      'users.read',
    ]);
  });

  it('ignores codes that have no current module', () => {
    expect(mapLegacyPermissionCodes(['AUDIT_LOG_VIEW', 'FILE_DELETE'])).toEqual(
      [],
    );
  });
});
