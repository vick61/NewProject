export const EXPECTED_HEADERS = [
  { field: 'familyCode', variations: ['family code', 'familycode', 'family_code'] },
  { field: 'familyName', variations: ['family name', 'familyname', 'family_name'] },
  { field: 'classCode', variations: ['class code', 'classcode', 'class_code'] },
  { field: 'className', variations: ['class name', 'classname', 'class_name'] },
  { field: 'brandCode', variations: ['brand code', 'brandcode', 'brand_code'] },
  { field: 'brandName', variations: ['brand name', 'brandname', 'brand_name'] },
  { field: 'articleCode', variations: ['article code', 'articlecode', 'article_code'] },
  { field: 'articleDescription', variations: ['article description', 'articledescription', 'article_description'] }
] as const

export const CSV_HEADERS = 'Family Code,Family Name,Class Code,Class Name,Brand Code,Brand Name,Article Code,Article Description'

export const REQUIRED_FIELDS = [
  'familyCode',
  'familyName', 
  'classCode',
  'className',
  'brandCode',
  'brandName',
  'articleCode',
  'articleDescription'
] as const

export const FIELD_LABELS = {
  familyCode: 'Family code',
  familyName: 'Family name',
  classCode: 'Class code',
  className: 'Class name',
  brandCode: 'Brand code',
  brandName: 'Brand name',
  articleCode: 'Article code',
  articleDescription: 'Article description'
} as const