// Admin Approved List Component
const AdminApproved = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card border-0 shadow-lg overflow-hidden">
            <div class="card-header bg-success text-white p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="mb-0"><i class="bi bi-patch-check-fill me-2"></i> Approved Records</h3>
                <router-link to="/admin" class="btn btn-outline-light btn-sm rounded-pill px-3">
                  <i class="bi bi-speedometer2 me-1"></i> Dashboard
                </router-link>
              </div>
              
              <ul class="nav nav-pills nav-fill bg-white bg-opacity-25 rounded-pill p-1">
                <li class="nav-item">
                  <button class="nav-link text-white py-2 rounded-pill" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
                    <i class="bi bi-people-fill me-1"></i> Users
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2 rounded-pill" :class="{ active: activeTab === 'banks' }" @click="activeTab = 'banks'">
                    <i class="bi bi-bank2 me-1"></i> Banks
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2 rounded-pill" :class="{ active: activeTab === 'docs' }" @click="activeTab = 'docs'">
                    <i class="bi bi-file-earmark-medical-fill me-1"></i> Docs
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2 rounded-pill" :class="{ active: activeTab === 'nominees' }" @click="activeTab = 'nominees'">
                    <i class="bi bi-person-heart me-1"></i> Nominees
                  </button>
                </li>
              </ul>
            </div>

            <div class="card-body p-4 bg-light bg-opacity-50">
              <div v-if="loading" class="text-center py-5">
                <div class="spinner-grow text-success" role="status" style="width: 3rem; height: 3rem;"></div>
                <p class="mt-3 text-muted fw-bold">Loading approved records...</p>
              </div>
              <div v-else-if="error" class="alert alert-danger border-0 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
              </div>

              <!-- Users Tab -->
              <div v-show="activeTab === 'users'">
                <div v-if="approvedUsers.length === 0" class="text-center py-5">
                  <i class="bi bi-people text-muted opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No approved users found</h5>
                </div>
                <div v-else class="table-responsive rounded-3 border bg-white">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light">
                      <tr>
                        <th class="ps-4">User Details</th>
                        <th>Contact</th>
                        <th>Role</th>
                        <th>Approved On</th>
                        <th class="pe-4">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="user in approvedUsers" :key="user.UserID">
                        <td class="ps-4">
                          <div class="d-flex align-items-center">
                            <div class="bg-success-subtle text-success p-2 rounded-pill me-3">
                              <i class="bi bi-person-check fs-5"></i>
                            </div>
                            <div>
                                <div class="fw-bold text-dark">{{ user.UserNameFirst }} {{ user.UserNameLast }}</div>
                                <small class="text-muted">UID #{{ user.UserID }}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="small"><i class="bi bi-envelope me-1 text-muted"></i> {{ user.Email }}</div>
                          <div class="small"><i class="bi bi-phone me-1 text-muted"></i> {{ user.Mobile }}</div>
                        </td>
                        <td><span class="badge" :class="getRoleClass(user.Role)">{{ user.Role }}</span></td>
                        <td><small class="fw-bold text-success">{{ formatFullDate(user.ApprovedAt) }}</small></td>
                        <td class="pe-4 text-muted small">Admin ID: {{ user.ApprovedByID || 'System' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Banks Tab -->
              <div v-show="activeTab === 'banks'">
                <div v-if="approvedBanks.length === 0" class="text-center py-5">
                  <i class="bi bi-bank opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No approved bank accounts</h5>
                </div>
                <div v-else class="table-responsive rounded-3 border bg-white">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light">
                      <tr>
                        <th class="ps-4">User ID</th>
                        <th>Bank / IFSC</th>
                        <th>Account No</th>
                        <th>Approved On</th>
                        <th class="pe-4">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="bank in approvedBanks" :key="bank.BankID">
                        <td class="ps-4 text-muted fw-bold">#{{ bank.UserID }}</td>
                        <td>
                          <div class="fw-bold text-dark">{{ bank.BankName }}</div>
                          <small class="text-muted">{{ bank.IFSC }}</small>
                        </td>
                        <td class="font-monospace">{{ bank.AccountNo }}</td>
                        <td><small class="fw-bold text-success">{{ formatFullDate(bank.ApprovedAt) }}</small></td>
                        <td class="pe-4 text-muted small">Admin ID: {{ bank.ApprovedByID }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Documents Tab -->
              <div v-show="activeTab === 'docs'">
                <div v-if="approvedDocs.length === 0" class="text-center py-5">
                  <i class="bi bi-file-earmark-text opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No approved documents</h5>
                </div>
                <div v-else class="table-responsive rounded-3 border bg-white">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light">
                      <tr>
                        <th class="ps-4">Doc Type</th>
                        <th>Number</th>
                        <th>User ID</th>
                        <th>Approved On</th>
                        <th class="pe-4">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="doc in approvedDocs" :key="doc.DocID">
                        <td class="ps-4">
                           <span class="badge bg-secondary-subtle text-dark border text-uppercase px-3">{{ doc.Type }}</span>
                        </td>
                        <td class="fw-bold">{{ doc.Number || 'N/A' }}</td>
                        <td class="text-muted">#{{ doc.UserID }}</td>
                        <td><small class="fw-bold text-success">{{ formatFullDate(doc.ApprovedAt) }}</small></td>
                        <td class="pe-4 text-muted small">Admin ID: {{ doc.ApprovedByID }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Nominees Tab -->
              <div v-show="activeTab === 'nominees'">
                <div v-if="approvedNominees.length === 0" class="text-center py-5">
                  <i class="bi bi-person-heart opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No approved nominees</h5>
                </div>
                <div v-else class="table-responsive rounded-3 border bg-white">
                  <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light">
                      <tr>
                        <th class="ps-4">Nominee Name</th>
                        <th>Relation</th>
                        <th>User ID</th>
                        <th>Approved On</th>
                        <th class="pe-4">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="nom in approvedNominees" :key="nom.NomineeID">
                        <td class="ps-4 fw-bold text-dark">{{ nom.NomineeName }}</td>
                        <td><span class="badge bg-light text-dark border fw-normal">{{ nom.Relation }}</span></td>
                        <td class="text-muted">#{{ nom.UserID }}</td>
                        <td><small class="fw-bold text-success">{{ formatFullDate(nom.ApprovedAt) }}</small></td>
                        <td class="pe-4 text-muted small">Admin ID: {{ nom.ApprovedByID }}</td>
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
    return {
      activeTab: 'users',
      approvedUsers: [],
      approvedBanks: [],
      approvedDocs: [],
      approvedNominees: [],
      loading: true,
      error: null,
      currentUser: JSON.parse(localStorage.getItem('user') || '{}')
    };
  },
  mounted() {
    this.fetchAllApproved();
  },
  methods: {
    async fetchAllApproved() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query {
        approvedUsers { UserID UserNameFirst UserNameLast Email Mobile Role ApprovedAt ApprovedByID }
        approvedBankAccounts { BankID UserID BankName AccountNo IFSC ApprovedAt ApprovedByID }
        approvedDocuments { DocID UserID Type Number ApprovedAt ApprovedByID }
        approvedNominees { NomineeID UserID NomineeName Relation ApprovedAt ApprovedByID }
      }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.approvedUsers = data.approvedUsers;
        this.approvedBanks = data.approvedBankAccounts;
        this.approvedDocs = data.approvedDocuments;
        this.approvedNominees = data.approvedNominees;
      } catch (err) {
        this.error = 'Failed to load records: ' + err.message;
      } finally {
        this.loading = false;
      }
    },
    formatFullDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
      });
    },
    getRoleClass(role) {
      const classes = {
        'superadmin': 'bg-dark', 'admin': 'bg-danger', 'manager': 'bg-info text-dark',
        'incharge': 'bg-warning text-dark', 'putter': 'bg-secondary', 'picker': 'bg-secondary',
        'accountmanager': 'bg-dark bg-gradient', 'accountant': 'bg-info', 'audit': 'bg-warning text-dark',
        'purchase': 'bg-primary', 'cluster': 'bg-dark', 'feltmanager': 'bg-info',
        'rider': 'bg-success', 'coach': 'bg-primary bg-gradient', 'user': 'bg-primary'
      };
      return classes[role] || 'bg-secondary';
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminApproved;
}
