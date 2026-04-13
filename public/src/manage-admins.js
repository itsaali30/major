// Manage Admins Component (Superadmin only)
const ManageAdmins = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-person-badge"></i> Manage Admins</h4>
              <router-link to="/admin" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back to Dashboard</router-link>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else>
                <h5 class="mb-3">Current Admins & Superadmins</h5>
                <div class="table-responsive">
                  <table class="table table-striped table-hover">
                    <thead class="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="user in adminUsers" :key="user.UserID">
                        <td>{{ user.UserID }}</td>
                        <td>{{ user.UserNameFirst }} {{ user.UserNameLast }}</td>
                        <td>{{ user.Email }}</td>
                        <td><span class="badge" :class="getRoleClass(user.Role)">{{ user.Role }}</span></td>
                        <td><span class="badge" :class="user.IsActive ? 'bg-success' : 'bg-warning text-dark'">{{ user.IsActive ? 'Yes' : 'No' }}</span></td>
                        <td>
                          <div class="btn-group btn-group-sm" v-if="user.Role !== 'superadmin'">
                            <button class="btn btn-warning" @click="demoteToUser(user.UserID)" title="Demote to User"><i class="bi bi-arrow-down-circle"></i> Demote</button>
                          </div>
                          <span v-else class="text-muted">Superadmin</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <hr>
                <h5 class="mb-3">Regular Users (Can be promoted)</h5>
                <div class="table-responsive">
                  <table class="table table-striped table-hover">
                    <thead class="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="user in regularUsers" :key="user.UserID">
                        <td>{{ user.UserID }}</td>
                        <td>{{ user.UserNameFirst }} {{ user.UserNameLast }}</td>
                        <td>{{ user.Email }}</td>
                        <td><span class="badge bg-primary">{{ user.Role }}</span></td>
                        <td><span class="badge" :class="user.IsActive ? 'bg-success' : 'bg-warning text-dark'">{{ user.IsActive ? 'Yes' : 'No' }}</span></td>
                        <td>
                          <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" @click="promoteToAdmin(user.UserID)" title="Promote to Admin"><i class="bi bi-arrow-up-circle"></i> Promote</button>
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
    </div>
  `,
  data() {
    return { users: [], loading: true, error: null };
  },
  computed: {
    adminUsers() { return this.users.filter(u => u.Role === 'admin' || u.Role === 'superadmin'); },
    regularUsers() { return this.users.filter(u => u.Role === 'user'); }
  },
  mounted() { this.fetchUsers(); },
  methods: {
    async fetchUsers() {
      const token = localStorage.getItem('token');
      if (!token) { this.$router.push('/login'); return; }
      const query = `query { allUsers { UserID UserNameFirst UserNameLast Email Role IsActive } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.users = data.allUsers;
      } catch (err) {
        this.error = err.message;
        if (err.message.includes('authorized')) this.$router.push('/');
      } finally { this.loading = false; }
    },
    getRoleClass(role) {
      return { 'superadmin': 'bg-dark', 'admin': 'bg-danger', 'user': 'bg-primary' }[role] || 'bg-secondary';
    },
    async promoteToAdmin(UserID) {
      if (!confirm('Promote this user to Admin?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation PromoteToAdmin($UserID: Int!) { promoteToAdmin(UserID: $UserID) { UserID Role } }`;
      try { await graphqlRequest(mutation, { UserID }, token); this.fetchUsers(); } catch (err) { alert(err.message); }
    },
    async demoteToUser(UserID) {
      if (!confirm('Demote this admin to regular User?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DemoteToUser($UserID: Int!) { demoteToUser(UserID: $UserID) { UserID Role } }`;
      try { await graphqlRequest(mutation, { UserID }, token); this.fetchUsers(); } catch (err) { alert(err.message); }
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManageAdmins;
}
