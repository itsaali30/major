// Admin Dashboard Component
const AdminDashboard = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header" :class="$root.isSuperadmin ? 'bg-dark' : ($root.isAdmin ? 'bg-danger' : 'bg-primary')" style="color: white;">
              <h4 class="mb-0"><i class="bi bi-shield-lock"></i> {{ $root.roleLabel }} Dashboard</h4>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin">
                  <router-link to="/admin/users" class="card admin-dashboard-btn btn btn-outline-primary text-decoration-none">
                    <i class="bi bi-people"></i>
                    <h5>All Users</h5>
                    <p class="text-muted">Manage user accounts</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin">
                  <router-link to="/admin/warehouses" class="card admin-dashboard-btn btn btn-outline-info text-decoration-none">
                    <i class="bi bi-building"></i>
                    <h5>Warehouses</h5>
                    <p class="text-muted">Manage warehouses</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="!$root.isAccountant && !$root.isAccountManager && !$root.isFeltManager && !$root.isCluster">
                  <router-link to="/admin/stores" class="card admin-dashboard-btn btn btn-outline-success text-decoration-none">
                    <i class="bi bi-shop"></i>
                    <h5>Stores</h5>
                    <p class="text-muted">Manage dark stores</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin">
                  <router-link to="/admin/admins" class="card admin-dashboard-btn btn btn-outline-warning text-decoration-none">
                    <i class="bi bi-person-badge"></i>
                    <h5>Manage Admins</h5>
                    <p class="text-muted">Promote/demote admins</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin || $root.isManager || $root.isAccountManager || $root.isCluster || $root.isIncharge || $root.isAccountant || $root.isFeltManager">
                  <router-link to="/admin/approvals" class="card admin-dashboard-btn btn btn-outline-success text-decoration-none">
                    <i class="bi bi-person-check"></i>
                    <h5>Pending Approvals</h5>
                    <p class="text-muted">Review pending requests</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin || $root.isAccountManager || $root.isAccountant">
                  <router-link to="/admin/approved" class="card admin-dashboard-btn btn btn-outline-primary text-decoration-none">
                    <i class="bi bi-patch-check"></i>
                    <h5>Approved Records</h5>
                    <p class="text-muted">View approval history</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin || $root.isManager || $root.isAccountManager || $root.isCluster || $root.isIncharge || $root.isAccountant || $root.isFeltManager">
                  <router-link to="/admin/merchants" class="card admin-dashboard-btn btn btn-outline-secondary text-decoration-none">
                    <i class="bi bi-shop"></i>
                    <h5>Merchants</h5>
                    <p class="text-muted">Manage merchants & suppliers</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin || $root.isManager || $root.isPUTTER || $root.isPICKER">
                  <router-link to="/admin/catalog" class="card admin-dashboard-btn btn btn-outline-dark text-decoration-none">
                    <i class="bi bi-box-seam"></i>
                    <h5>Product Catalog</h5>
                    <p class="text-muted">Manage Categories, Products & Variants</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin || $root.isManager || $root.isIncharge">
                  <router-link to="/admin/inventory" class="card admin-dashboard-btn btn btn-outline-primary text-decoration-none">
                    <i class="bi bi-stack"></i>
                    <h5>Stock Management</h5>
                    <p class="text-muted">Monitor and update inventory levels</p>
                  </router-link>
                </div>
                <div class="col-md-6 mb-4" v-if="$root.isSuperadmin || $root.isAdmin">
                  <router-link to="/admin/purchase" class="card admin-dashboard-btn btn btn-outline-success text-decoration-none">
                    <i class="bi bi-cart-check"></i>
                    <h5>Purchase Orders</h5>
                    <p class="text-muted">Procure stock from merchants</p>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminDashboard;
}
