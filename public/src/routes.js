// Routes Configuration
const routes = [
  { path: '/', component: Home, meta: { title: 'Home' } },
  { path: '/signup', component: Signup, meta: { title: 'Sign Up' } },
  { path: '/login', component: Login, meta: { title: 'Login' } },
  { path: '/forgot-password', component: ForgotPassword, meta: { title: 'Forgot Password' } },
  { path: '/reset-password', component: ResetPassword, meta: { title: 'Reset Password' } },
  { path: '/profile', component: Profile, meta: { title: 'My Profile' } },
  { path: '/profile/bank', component: Bank, meta: { title: 'Bank Accounts' } },
  { path: '/profile/doc', component: Doc, meta: { title: 'My Documents' } },
  { path: '/profile/nominee', component: Nominee, meta: { title: 'Nominee Details' } },
  { path: '/profile/change-location', component: UserChangeWarehouse, meta: { title: 'Request Location Change' } },
  { path: '/admin', component: AdminDashboard, meta: { title: 'Admin Dashboard' } },
  { path: '/admin/users', component: AdminUsers, meta: { title: 'All Users' } },
  { path: '/admin/warehouses', component: AdminWarehouses, meta: { title: 'Manage Warehouses' } },
  { path: '/admin/stores', component: AdminStores, meta: { title: 'Manage Stores' } },
  { path: '/admin/shelves/:StoreID', component: AdminShelves, meta: { title: 'Manage Shelves' } },
  { path: '/admin/admins', component: ManageAdmins, meta: { title: 'Manage Admins' } },
  { path: '/admin/approvals', component: AdminApprovals, meta: { title: 'Approve Admins' } },
  { path: '/admin/approved', component: AdminApproved, meta: { title: 'Approved Records' } },
  { path: '/admin/merchants', component: AdminMerchants, meta: { title: 'Manage Merchants' } },
  { path: '/admin/merchants/:MerchantID', component: AdminMerchantDashboard, meta: { title: 'Merchant Dashboard' } },
  { path: '/admin/merchants/:MerchantID/contacts', component: AdminMerchantContacts, meta: { title: 'Merchant Contacts' } },
  { path: '/admin/catalog', component: AdminCatalog, meta: { title: 'Product Catalog' } },
  { path: '/admin/inventory', component: AdminInventory, meta: { title: 'Stock Management' } },
  { path: '/admin/purchase/:section?', component: AdminPurchase, meta: { title: 'Purchase Management' } }
];

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = routes;
}
