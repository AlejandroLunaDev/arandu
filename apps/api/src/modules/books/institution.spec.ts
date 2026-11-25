import { type InstitutionRow, toInstitution } from './books.repository.js';

const row: InstitutionRow = {
  institution: 'Universidade de São Paulo',
  short_name: 'USP',
  kind: 'public',
  logo_url: 'https://x/logo.png',
  logo_license: 'CC0',
  logo_source_url: 'https://x/logo',
  photo_url: 'https://x/photo.jpg',
  photo_credit: 'Ana',
  photo_license: 'CC BY 4.0',
  photo_source_url: 'https://x/photo',
};

describe('toInstitution', () => {
  it('builds logo and photo when every credit field is present', () => {
    expect(toInstitution(row)).toEqual({
      name: 'Universidade de São Paulo',
      shortName: 'USP',
      kind: 'public',
      logo: {
        url: 'https://x/logo.png',
        license: 'CC0',
        sourceUrl: 'https://x/logo',
      },
      photo: {
        url: 'https://x/photo.jpg',
        credit: 'Ana',
        license: 'CC BY 4.0',
        sourceUrl: 'https://x/photo',
      },
    });
  });

  it.each([
    'logo_license',
    'logo_source_url',
    'photo_credit',
    'photo_license',
  ] as const)('drops the image when %s is null', (field) => {
    const out = toInstitution({ ...row, [field]: null });
    expect(field.startsWith('logo') ? out.logo : out.photo).toBeNull();
    expect(field.startsWith('logo') ? out.photo : out.logo).not.toBeNull();
  });
});
