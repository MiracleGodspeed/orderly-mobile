/**
 * Canonical list of staff permission strings — mirror of
 * `orderly-api/orderly.domain/Helpers/StaffPermissions.cs`. Adding a new
 * permission requires updating both files AND any backend service that
 * should gate behind it.
 */
export const STAFF_PERMISSIONS = {
  ORDERS_VIEW: 'orders.view',
  ORDERS_CONFIRM: 'orders.confirm',
  ORDERS_REJECT: 'orders.reject',
  ORDERS_UPDATE_STATUS: 'orders.update_status',
  CATALOG_VIEW: 'catalog.view',
  CATALOG_CREATE: 'catalog.create',
  CATALOG_EDIT: 'catalog.edit',
  CATALOG_DELETE: 'catalog.delete',
  CUSTOMERS_VIEW: 'customers.view',
  ANALYTICS_VIEW: 'analytics.view',
} as const;

export type StaffPermission =
  (typeof STAFF_PERMISSIONS)[keyof typeof STAFF_PERMISSIONS];

export interface PermissionGroup {
  label: string;
  permissions: { key: StaffPermission; label: string; description: string }[];
}

/**
 * Grouped permission catalogue — drives the "edit permissions" sheet.
 * The grouping is by domain so the UI renders sections without
 * hardcoding the layout.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Orders',
    permissions: [
      { key: 'orders.view', label: 'View orders', description: 'See all incoming orders.' },
      { key: 'orders.confirm', label: 'Confirm payment', description: 'Mark manual bank-transfer orders as paid.' },
      { key: 'orders.reject', label: 'Reject payment', description: 'Refuse a manual transfer when funds didn’t arrive.' },
      { key: 'orders.update_status', label: 'Update status', description: 'Mark orders as shipped / delivered.' },
    ],
  },
  {
    label: 'Catalog',
    permissions: [
      { key: 'catalog.view', label: 'View products', description: 'Browse the product catalog.' },
      { key: 'catalog.create', label: 'Add products', description: 'Create new catalog items.' },
      { key: 'catalog.edit', label: 'Edit products', description: 'Update prices, photos, and stock.' },
      { key: 'catalog.delete', label: 'Delete products', description: 'Permanently remove items from the catalog.' },
    ],
  },
  {
    label: 'Insights',
    permissions: [
      { key: 'customers.view', label: 'View customers', description: 'See the customer list and contact details.' },
      { key: 'analytics.view', label: 'View analytics', description: 'Access store performance reports.' },
    ],
  },
];

export interface PermissionPreset {
  id: string;
  label: string;
  description: string;
  permissions: StaffPermission[];
}

export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'cashier',
    label: 'Cashier',
    description: 'Confirms orders, updates fulfilment status. No catalog access.',
    permissions: [
      'orders.view',
      'orders.confirm',
      'orders.update_status',
    ],
  },
  {
    id: 'stockkeeper',
    label: 'Stockkeeper',
    description: 'Manages the catalog. No order access.',
    permissions: [
      'catalog.view',
      'catalog.create',
      'catalog.edit',
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Full access except billing, payouts, and managing other staff.',
    permissions: [
      'orders.view',
      'orders.confirm',
      'orders.reject',
      'orders.update_status',
      'catalog.view',
      'catalog.create',
      'catalog.edit',
      'catalog.delete',
      'customers.view',
      'analytics.view',
    ],
  },
];
