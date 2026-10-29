import { namesFromGoogle } from './google-token';

describe('namesFromGoogle', () => {
  it('uses given and family names when both are present', () => {
    expect(
      namesFromGoogle({
        given_name: 'Abebe',
        family_name: 'Kebede',
        email: 'abebe@gmail.com',
      }),
    ).toEqual({ firstName: 'Abebe', lastName: 'Kebede' });
  });

  it('splits a full name when given/family are missing', () => {
    expect(
      namesFromGoogle({
        name: 'Abebe Bekele Kebede',
        email: 'abebe@gmail.com',
      }),
    ).toEqual({ firstName: 'Abebe', lastName: 'Bekele Kebede' });
  });

  it('falls back to the email local part', () => {
    expect(namesFromGoogle({ email: 'progress.user@gmail.com' })).toEqual({
      firstName: 'progress.user',
      lastName: 'User',
    });
  });
});
