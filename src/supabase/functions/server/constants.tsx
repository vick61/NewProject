// Default zone-state mapping
export const DEFAULT_ZONE_STATE_MAPPING = {
  'North1': ['Delhi', 'UP East', 'UP West', 'Uttarakhand'],
  'North2': ['Punjab', 'Haryana', 'Himachal Pradesh', 'Chandigarh', 'Jammu & Kashmir', 'Rajasthan'],
  'South': ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Puducherry'],
  'East': ['West Bengal', 'Odisha', 'Jharkhand', 'Bihar', 'Sikkim', 'Assam'],
  'West': ['Maharashtra', 'Gujarat', 'Goa', 'Madhya Pradesh', 'Chhattisgarh']
}

// Default category data
export const DEFAULT_CATEGORY_DATA = {
  families: ['Television', 'Refrigerator', 'AC'],
  brands: ['BPL', 'Kelvinator'],
  classes: ['32 inch', '43 inch', '55 inch', 'Double Door', 'Single Door', 'Split AC', 'Window AC'],
  familyBrandMapping: {
    'Television': ['BPL'],
    'Refrigerator': ['BPL', 'Kelvinator'],
    'AC': ['BPL', 'Kelvinator']
  },
  familyClassMapping: {
    'Television': ['32 inch', '43 inch', '55 inch'],
    'Refrigerator': ['Single Door', 'Double Door'],
    'AC': ['Window AC', 'Split AC']
  },
  classBrandMapping: {
    '32 inch': ['BPL'],
    '43 inch': ['BPL'],
    '55 inch': ['BPL'],
    'Single Door': ['BPL', 'Kelvinator'],
    'Double Door': ['BPL', 'Kelvinator'],
    'Window AC': ['BPL', 'Kelvinator'],
    'Split AC': ['BPL', 'Kelvinator']
  },
  articleMappings: {
    'ART123456': {
      familyName: 'Television',
      className: '55 inch',
      brandName: 'BPL',
      familyCode: 'TV001',
      classCode: '55I001',
      brandCode: 'BPL001',
      articleDescription: '55 Inch Smart LED TV'
    },
    'ART123457': {
      familyName: 'Television',
      className: '43 inch',
      brandName: 'BPL',
      familyCode: 'TV001',
      classCode: '43I001',
      brandCode: 'BPL001',
      articleDescription: '43 Inch Smart LED TV'
    }
  }
}

// Sample distributors data
export const SAMPLE_DISTRIBUTORS = [
  {
    id: 'DIST001',
    name: 'ABC Electronics Delhi',
    code: 'DIST001',
    type: 'P1',
    zone: 'North1',
    state: 'Delhi',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST002',
    name: 'XYZ Appliances Mumbai',
    code: 'DIST002',
    type: 'P2',
    zone: 'West',
    state: 'Maharashtra',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST003',
    name: 'PQR Electronics Bangalore',
    code: 'DIST003',
    type: 'P3',
    zone: 'South',
    state: 'Karnataka',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST004',
    name: 'Tech World Kolkata',
    code: 'DIST004',
    type: 'P4',
    zone: 'East',
    state: 'West Bengal',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST005',
    name: 'UP East Electronics',
    code: 'DIST005',
    type: 'P1',
    zone: 'North1',
    state: 'UP East',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST006',
    name: 'Punjab Appliances',
    code: 'DIST006',
    type: 'P2',
    zone: 'North2',
    state: 'Punjab',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST007',
    name: 'Rajasthan Electronics',
    code: 'DIST007',
    type: 'P3',
    zone: 'North2',
    state: 'Rajasthan',
    status: 'active',
    onboardedAt: new Date().toISOString()
  },
  {
    id: 'DIST008',
    name: 'Assam Tech Hub',
    code: 'DIST008',
    type: 'P2',
    zone: 'East',
    state: 'Assam',
    status: 'active',
    onboardedAt: new Date().toISOString()
  }
]

// Valid zones and distributor types
export const VALID_ZONES = ['East', 'West', 'North1', 'North2', 'South']
export const VALID_DISTRIBUTOR_TYPES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'PD', 'PC']

// Storage bucket name
export const STORAGE_BUCKET_NAME = 'make-ce8ebc43-sales-data'