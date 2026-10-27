// Admin Users Component
const AdminUsers = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-people"></i> All Users</h4>
              <div class="d-flex align-items-center gap-2">
                <select class="form-select form-select-sm border-0" v-model="selectedWarehouse" style="width: auto; min-width: 150px;">
                  <option value="all">All Warehouses</option>
                  <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                </select>
                <router-link to="/admin" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back to Dashboard</router-link>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else>
                <div class="row mb-3">
                  <div class="col-md-3">
                    <div class="card bg-success text-white">
                      <div class="card-body text-center">
                        <h5><span class="online-indicator online"></span>Online: {{ onlineCount }}</h5>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="card bg-secondary text-white">
                      <div class="card-body text-center">
                        <h5><span class="online-indicator offline"></span>Offline: {{ offlineCount }}</h5>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <input type="text" class="form-control" v-model="searchTerm" placeholder="Search users...">
                  </div>
                </div>
                <div class="table-responsive">
                  <table class="table table-striped table-hover">
                    <thead class="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Warehouse</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Role</th>
                        <th>Active</th>
                        <th>Online</th>
                        <th>Last Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="user in filteredUsers" :key="user.UserID">
                        <td>{{ user.UserID }}</td>
                        <td>{{ user.UserNameFirst }} {{ user.UserNameLast }}</td>
                        <td><span class="badge bg-light text-dark shadow-sm border">{{ user.WarehouseName || 'N/A' }}</span></td>
                        <td>{{ user.Email }}</td>
                        <td>{{ user.Mobile || 'N/A' }}</td>
                        <td><span class="badge" :class="getRoleClass(user.Role)">{{ user.Role }}</span></td>
                        <td><span class="badge" :class="user.IsActive ? 'bg-success' : 'bg-warning text-dark'">{{ user.IsActive ? 'Yes' : 'No' }}</span></td>
                        <td><span class="online-indicator" :class="user.IsOnline ? 'online' : 'offline'"></span>{{ user.IsOnline ? 'Online' : 'Offline' }}</td>
                        <td>{{ formatDateTime(user.LastActiveAt) }}</td>
                        <td>
                          <div class="btn-group btn-group-sm">
                            <button class="btn btn-info" @click="editUser(user)" title="Edit"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-warning" @click="deactivateUser(user.UserID)" v-if="user.IsActive" title="Deactivate"><i class="bi bi-pause-circle"></i></button>
                            <button class="btn btn-success" @click="reactivateUser(user.UserID)" v-if="!user.IsActive" title="Reactivate"><i class="bi bi-play-circle"></i></button>
                            <button class="btn btn-danger" @click="deleteUser(user.UserID)" title="Delete" v-if="$root.isSuperadmin || user.Role !== 'superadmin'"><i class="bi bi-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit User Modal -->
      <div class="modal fade" id="editUserModal" tabindex="-1" ref="editModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title"><i class="bi bi-pencil-square"></i> Edit User</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeEditModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="editError" class="alert alert-danger">{{ editError }}</div>
              <div v-if="editSuccess" class="alert alert-success">{{ editSuccess }}</div>
              <form v-if="editingUser">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">First Name</label>
                    <input type="text" class="form-control" v-model="editingUser.UserNameFirst">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Last Name</label>
                    <input type="text" class="form-control" v-model="editingUser.UserNameLast">
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" v-model="editingUser.Email">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Mobile</label>
                    <input type="tel" class="form-control" v-model="editingUser.Mobile">
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" class="form-control" v-model="editingUser.DOB">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Gender</label>
                    <select class="form-select" v-model="editingUser.Gender">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Role</label>
                    <select class="form-select" v-model="editingUser.Role">
                      <option value="superadmin" v-if="$root.isSuperadmin">Superadmin</option>
                      <option value="admin">Admin</option>
                      <optgroup label="Operations">
                        <option value="manager">Manager</option>
                        <option value="incharge">Incharge</option>
                        <option value="putter">Putter</option>
                        <option value="picker">Picker</option>
                      </optgroup>
                      <optgroup label="Accounts">
                        <option value="accountmanager">Account Manager</option>
                        <option value="accountant">Accountant</option>
                        <option value="audit">Audit</option>
                        <option value="purchase">Purchase</option>
                      </optgroup>
                      <optgroup label="Logistics">
                        <option value="cluster">Cluster Manager</option>
                        <option value="feltmanager">Felt Manager</option>
                        <option value="rider">Rider</option>
                        <option value="coach">Coach</option>
                      </optgroup>
                      <option value="user">User</option>
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Active</label>
                    <select class="form-select" v-model="editingUser.IsActive">
                      <option :value="true">Yes</option>
                      <option :value="false">No</option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 mb-3">
                    <label class="form-label">Assigned Warehouse</label>
                    <select class="form-select" v-model="editingUser.WarehouseID">
                      <option :value="null">-- Not Assigned --</option>
                      <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">
                        {{ w.Name }}
                      </option>
                    </select>
                    <div class="form-text text-muted">Changing this will update the user's primary working location.</div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeEditModal">Cancel</button>
              <button type="button" class="btn btn-primary" @click="saveUser" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      users: [], loading: true, error: null, searchTerm: '',
      warehouses: [], selectedWarehouse: 'all',
      editingUser: null, editError: null, editSuccess: null, saving: false,
      modalInstance: null, refreshInterval: null
    };
  },
  computed: {
    filteredUsers() {
      // Filter out superadmins for regular admins, show all for superadmin
      let filtered = this.users;
      if (!this.$root.isSuperadmin) {
        filtered = this.users.filter(u => u.Role !== 'superadmin');
      }

      if (this.selectedWarehouse !== 'all') {
        filtered = filtered.filter(u => u.WarehouseID === parseInt(this.selectedWarehouse));
      }
      
      if (!this.searchTerm) return filtered;
      const term = this.searchTerm.toLowerCase();
      return filtered.filter(u => u.UserNameFirst.toLowerCase().includes(term) || u.UserNameLast.toLowerCase().includes(term) || u.Email.toLowerCase().includes(term) || (u.Mobile && u.Mobile.includes(term)));
    },
    onlineCount() { 
      let filtered = this.users;
      if (!this.$root.isSuperadmin) {
        filtered = this.users.filter(u => u.Role !== 'superadmin');
      }
      return filtered.filter(u => u.IsOnline).length; 
    },
    offlineCount() { 
      let filtered = this.users;
      if (!this.$root.isSuperadmin) {
        filtered = this.users.filter(u => u.Role !== 'superadmin');
      }
      return filtered.filter(u => !u.IsOnline).length; 
    }
  },
  mounted() {
    this.fetchUsers();
    this.fetchWarehouses();
    this.modalInstance = new bootstrap.Modal(this.$refs.editModal);
  },
  methods: {
    async fetchUsers(showLoading = true) {
      if (showLoading) this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) { this.$router.push('/login'); return; }
      const query = `query { allUsers { UserID UserNameFirst UserNameLast Email Mobile Gender Role IsActive IsOnline LastActiveAt CreatedAt WarehouseID WarehouseName } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.users = data.allUsers;
      } catch (err) {
        this.error = err.message;
        if (err.message.includes('authenticated') || err.message.includes('authorized')) this.$router.push('/');
      } finally { if (showLoading) this.loading = false; }
    },
    async fetchWarehouses() {
      const token = localStorage.getItem('token');
      const query = `query { allWarehouses { WarehouseID Name } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.warehouses = data.allWarehouses;
      } catch (err) { console.error(err); }
    },
    formatDateTime(value) {
      if (!value) return 'N/A';
      const num = Number(value);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(value);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    },
    getRoleClass(role) {
      const classes = {
        'superadmin': 'bg-dark',
        'admin': 'bg-danger',
        'manager': 'bg-info text-dark',
        'incharge': 'bg-warning text-dark',
        'putter': 'bg-secondary',
        'picker': 'bg-secondary',
        'accountmanager': 'bg-dark bg-gradient',
        'accountant': 'bg-info',
        'audit': 'bg-warning text-dark',
        'purchase': 'bg-primary',
        'cluster': 'bg-dark',
        'feltmanager': 'bg-info',
        'rider': 'bg-success',
        'coach': 'bg-primary bg-gradient',
        'user': 'bg-primary'
      };
      return classes[role] || 'bg-secondary';
    },
    editUser(user) {
      this.editingUser = { ...user, DOB: user.DOB ? user.DOB.split('T')[0] : '' };
      this.editError = null; this.editSuccess = null;
      this.modalInstance.show();
    },
    closeEditModal() { this.modalInstance.hide(); this.editingUser = null; },
    async saveUser() {
      this.saving = true; this.editError = null; this.editSuccess = null;
      const token = localStorage.getItem('token');
      const mutation = `mutation UpdateUser($UserID: Int!, $UserNameFirst: String, $UserNameLast: String, $Email: String, $Mobile: String, $DOB: String, $Gender: String, $Role: String, $IsActive: Boolean, $WarehouseID: Int) { updateUser(UserID: $UserID, UserNameFirst: $UserNameFirst, UserNameLast: $UserNameLast, Email: $Email, Mobile: $Mobile, DOB: $DOB, Gender: $Gender, Role: $Role, IsActive: $IsActive, WarehouseID: $WarehouseID) { UserID UserNameFirst UserNameLast Email Mobile Gender Role IsActive WarehouseID WarehouseName } }`;
      try {
        const variables = {
          ...this.editingUser,
          WarehouseID: this.editingUser.WarehouseID ? parseInt(this.editingUser.WarehouseID) : null
        };
        await graphqlRequest(mutation, variables, token);
        this.editSuccess = 'User updated successfully!';
        this.fetchUsers(); setTimeout(() => this.closeEditModal(), 1000);
      } catch (err) { this.editError = err.message; }
      finally { this.saving = false; }
    },
    async deactivateUser(UserID) { if (!confirm('Deactivate this user?')) return; const token = localStorage.getItem('token'); const mutation = `mutation DeactivateUser($UserID: Int!) { deactivateUser(UserID: $UserID) { UserID IsActive } }`; try { await graphqlRequest(mutation, { UserID }, token); this.fetchUsers(); } catch (err) { alert(err.message); } },
    async reactivateUser(UserID) { const token = localStorage.getItem('token'); const mutation = `mutation ReactivateUser($UserID: Int!) { reactivateUser(UserID: $UserID) { UserID IsActive } }`; try { await graphqlRequest(mutation, { UserID }, token); this.fetchUsers(); } catch (err) { alert(err.message); } },
    async deleteUser(UserID) { if (!confirm('Permanently delete this user?')) return; const token = localStorage.getItem('token'); const mutation = `mutation DeleteUser($UserID: Int!) { deleteUser(UserID: $UserID) }`; try { await graphqlRequest(mutation, { UserID }, token); this.fetchUsers(); } catch (err) { alert(err.message); } }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminUsers;
}
