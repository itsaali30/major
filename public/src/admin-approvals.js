// Admin Approvals Component
const AdminApprovals = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card border-0 shadow-lg">
            <div class="card-header bg-dark text-white p-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="mb-0"><i class="bi bi-shield-check me-2"></i> {{ $root.roleLabel }} Approvals</h3>
                <router-link to="/admin" class="btn btn-outline-light btn-sm"><i class="bi bi-speedometer2 me-1"></i> Dashboard</router-link>
              </div>
              
              <ul class="nav nav-pills nav-fill bg-secondary bg-opacity-25 rounded p-1">
                <li class="nav-item">
                  <button class="nav-link text-white py-2" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
                    <i class="bi bi-people-fill me-1"></i> User Accounts
                    <span v-if="pendingAdmins.length > 0" class="badge bg-danger ms-2">{{ pendingAdmins.length }}</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2" :class="{ active: activeTab === 'banks' }" @click="activeTab = 'banks'">
                    <i class="bi bi-bank2 me-1"></i> Bank Accounts
                    <span v-if="pendingBanks.length > 0" class="badge bg-danger ms-2">{{ pendingBanks.length }}</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2" :class="{ active: activeTab === 'docs' }" @click="activeTab = 'docs'">
                    <i class="bi bi-file-earmark-medical-fill me-1"></i> User Documents
                    <span v-if="pendingDocs.length > 0" class="badge bg-danger ms-2">{{ pendingDocs.length }}</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2" :class="{ active: activeTab === 'nominees' }" @click="activeTab = 'nominees'">
                    <i class="bi bi-person-heart me-1"></i> Nominees
                    <span v-if="pendingNominees.length > 0" class="badge bg-danger ms-2">{{ pendingNominees.length }}</span>
                  </button>
                </li>
                <li class="nav-item">
                  <button class="nav-link text-white py-2" :class="{ active: activeTab === 'locations' }" @click="activeTab = 'locations'">
                    <i class="bi bi-geo-alt-fill me-1"></i> Location Changes
                    <span v-if="locationRequests.length > 0" class="badge bg-danger ms-2">{{ locationRequests.length }}</span>
                  </button>
                </li>
              </ul>
            </div>

            <div class="card-body p-4">
              <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div>
                <p class="mt-3 text-muted">Fetching pending items...</p>
              </div>
              <div v-else-if="error" class="alert alert-danger border-0 shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
              </div>

              <!-- Users Tab -->
              <div v-show="activeTab === 'users'">
                <div v-if="pendingAdmins.length === 0" class="text-center py-5">
                  <i class="bi bi-check-circle-fill text-success opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No pending user approvals</h5>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>ID</th>
                        <th>User Name</th>
                        <th>Email / Mobile</th>
                        <th>Requested Role</th>
                        <th>Applied On</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="admin in pendingAdmins" :key="admin.UserID">
                        <td><small class="text-muted">#{{ admin.UserID }}</small></td>
                        <td>
                          <div class="fw-bold">{{ admin.UserNameFirst }} {{ admin.UserNameLast }}</div>
                          <small class="text-muted text-capitalize">{{ admin.Gender }}</small>
                        </td>
                        <td>
                          <div><i class="bi bi-envelope small"></i> {{ admin.Email }}</div>
                          <div><i class="bi bi-phone small"></i> {{ admin.Mobile }}</div>
                        </td>
                        <td><span class="badge" :class="getRoleClass(admin.Role)">{{ admin.Role }}</span></td>
                        <td><small>{{ formatDate(admin.CreatedAt) }}</small></td>
                        <td class="text-end">
                          <div class="btn-group btn-group-sm shadow-sm">
                            <button class="btn btn-success px-3" @click="approveAdmin(admin.UserID)">Approve</button>
                            <button class="btn btn-danger px-3" @click="rejectAdmin(admin.UserID)">Reject</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Banks Tab -->
              <div v-show="activeTab === 'banks'">
                <div v-if="pendingBanks.length === 0" class="text-center py-5">
                  <i class="bi bi-bank opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No pending bank approvals</h5>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Bank Details</th>
                        <th>Account Info</th>
                        <th>Proof File</th>
                        <th>Created</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="bank in pendingBanks" :key="bank.BankID">
                        <td><small class="text-muted">#{{ bank.BankID }}</small></td>
                        <td>
                          <div class="fw-bold text-uppercase">{{ bank.BankName || 'N/A' }}</div>
                          <span v-if="bank.IsPrimary" class="badge bg-info text-dark x-small">PRIMARY</span>
                        </td>
                        <td>
                          <div><small class="text-muted">No:</small> {{ bank.AccountNo }}</div>
                          <div><small class="text-muted">IFSC:</small> {{ bank.IFSC }}</div>
                        </td>
                        <td>
                          <a v-if="bank.BankImageUrl" :href="bank.BankImageUrl" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-image me-1"></i> View Proof
                          </a>
                          <span v-else class="text-muted small">No file</span>
                        </td>
                        <td><small>{{ formatDate(bank.CreatedAt) }}</small></td>
                        <td class="text-end">
                          <button class="btn btn-sm btn-success px-4" 
                                  @click="approveBank(bank.BankID)" 
                                  :disabled="bankApproving === bank.BankID">
                            <span v-if="bankApproving === bank.BankID" class="spinner-border spinner-border-sm me-1"></span>
                            Approve
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Documents Tab Content -->
              <div v-show="activeTab === 'docs'">
                <div v-if="pendingDocs.length === 0" class="text-center py-5">
                  <i class="bi bi-file-earmark-text opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No pending document approvals</h5>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Doc Type</th>
                        <th>Reference No.</th>
                        <th>User ID</th>
                        <th>File Preview</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="doc in pendingDocs" :key="doc.DocID">
                        <td><small class="text-muted">#{{ doc.DocID }}</small></td>
                        <td><span class="badge bg-secondary text-uppercase">{{ doc.Type }}</span></td>
                        <td>{{ doc.Number || 'N/A' }}</td>
                        <td><small class="text-muted">User:</small> {{ doc.UserID }}</td>
                        <td>
                          <a v-if="doc.ImageURL" :href="doc.ImageURL" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-eye me-1"></i> View
                          </a>
                        </td>
                        <td class="text-end">
                          <button class="btn btn-sm btn-success px-4" 
                                  @click="approveDoc(doc.DocID)"
                                  :disabled="docApproving === doc.DocID">
                             <span v-if="docApproving === doc.DocID" class="spinner-border spinner-border-sm me-1"></span>
                             Approve
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Nominees Tab -->
              <div v-show="activeTab === 'nominees'">
                <div v-if="pendingNominees.length === 0" class="text-center py-5">
                  <i class="bi bi-person-heart opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No pending nominee approvals</h5>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Nominee Name</th>
                        <th>Relation</th>
                        <th>Contact</th>
                        <th>User ID</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="nom in pendingNominees" :key="nom.NomineeID">
                        <td><small class="text-muted">#{{ nom.NomineeID }}</small></td>
                        <td><div class="fw-bold">{{ nom.NomineeName }}</div></td>
                        <td><span class="badge bg-info text-dark">{{ nom.Relation }}</span></td>
                        <td>
                          <div class="small"><i class="bi bi-phone"></i> {{ nom.Phone || 'N/A' }}</div>
                        </td>
                        <td><small class="text-muted">UID #{{ nom.UserID }}</small></td>
                        <td class="text-end">
                          <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" @click="approveNominee(nom.NomineeID)" :disabled="nomineeAction === nom.NomineeID">Approve</button>
                            <button class="btn btn-danger" @click="rejectNominee(nom.NomineeID)" :disabled="nomineeAction === nom.NomineeID">Reject</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Location Changes Tab -->
              <div v-show="activeTab === 'locations'">
                <div v-if="locationRequests.length === 0" class="text-center py-5">
                  <i class="bi bi-geo-alt opacity-25 display-1"></i>
                  <h5 class="mt-3 text-muted">No pending location change requests</h5>
                </div>
                <div v-else class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>Requester</th>
                        <th>Type</th>
                        <th>Old Location</th>
                        <th>New Location</th>
                        <th>Reason</th>
                        <th class="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="req in locationRequests" :key="req.RequestID">
                        <td>
                          <div class="fw-bold">{{ req.User.UserNameFirst }} {{ req.User.UserNameLast }}</div>
                          <span class="badge" :class="getRoleClass(req.User.Role)">{{ req.User.Role }}</span>
                        </td>
                        <td><span class="badge bg-secondary text-capitalize">{{ req.Type }}</span></td>
                        <td><small class="text-muted">#{{ req.OldLocationID || 'N/A' }}</small></td>
                        <td><div class="fw-bold text-primary">#{{ req.NewLocationID }}</div></td>
                        <td><small class="text-muted">{{ req.Reason }}</small></td>
                        <td class="text-end">
                          <div class="btn-group btn-group-sm">
                            <button class="btn btn-success" @click="approveLocation(req.RequestID)" :disabled="locationAction === req.RequestID">Approve</button>
                            <button class="btn btn-danger" @click="rejectLocation(req.RequestID)" :disabled="locationAction === req.RequestID">Reject</button>
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
    return {
      activeTab: 'users',
      pendingAdmins: [],
      pendingBanks: [],
      pendingDocs: [],
      pendingNominees: [],
      locationRequests: [],
      loading: true,
      error: null,
      bankApproving: null,
      docApproving: null,
      nomineeAction: null,
      locationAction: null
    };
  },
  mounted() {
    this.fetchAllPending();
  },
  methods: {
    async fetchAllPending() {
      this.loading = true;
      await Promise.all([
        this.fetchPendingUsers(),
        this.fetchPendingBanks(),
        this.fetchPendingDocs(),
        this.fetchPendingNominees(),
        this.fetchLocationRequests()
      ]);
      this.loading = false;
    },
    async fetchPendingUsers() {
      const token = localStorage.getItem('token');
      const query = `query { pendingUsers { UserID UserNameFirst UserNameLast Email Mobile Role Gender CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingAdmins = data.pendingUsers;
      } catch (err) { this.error = err.message; }
    },
    async fetchPendingBanks() {
      const token = localStorage.getItem('token');
      const query = `query { pendingBankAccounts { BankID UserID BankName AccountNo IFSC IsPrimary BankImageUrl CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingBanks = data.pendingBankAccounts;
      } catch (err) { console.error(err); }
    },
    async fetchPendingDocs() {
      const token = localStorage.getItem('token');
      const query = `query { pendingDocuments { DocID UserID Type Number ImageURL CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingDocs = data.pendingDocuments;
      } catch (err) { console.error(err); }
    },
    async fetchPendingNominees() {
      const token = localStorage.getItem('token');
      const query = `query { pendingNominees { NomineeID UserID NomineeName Relation Phone } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingNominees = data.pendingNominees;
      } catch (err) { console.error(err); }
    },
    async fetchLocationRequests() {
      const token = localStorage.getItem('token');
      const query = `query { pendingLocationChangeRequests { RequestID UserID NewLocationID OldLocationID Type Status Reason User { UserNameFirst UserNameLast Role } } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.locationRequests = data.pendingLocationChangeRequests;
      } catch (err) { console.error(err); }
    },
    async approveAdmin(UserID) {
      if (!confirm('Approve this user account?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveUser($UserID: Int!) { approveUser(UserID: $UserID) { UserID } }`;
      try {
        await graphqlRequest(mutation, { UserID }, token);
        this.fetchPendingUsers();
      } catch (err) { alert(err.message); }
    },
    async rejectAdmin(UserID) {
      if (!confirm('Reject and delete this user?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation RejectUser($UserID: Int!) { rejectUser(UserID: $UserID) }`;
      try {
        await graphqlRequest(mutation, { UserID }, token);
        this.fetchPendingUsers();
      } catch (err) { alert(err.message); }
    },
    async approveBank(BankID) {
      this.bankApproving = BankID;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveBank($BankID: Int!) { approveBankAccount(BankID: $BankID) { BankID } }`;
      try {
        await graphqlRequest(mutation, { BankID }, token);
        await this.fetchPendingBanks();
      } catch (err) { alert(err.message); }
      finally { this.bankApproving = null; }
    },
    async approveDoc(DocID) {
      this.docApproving = DocID;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveDoc($DocID: Int!) { approveDocument(DocID: $DocID) { DocID } }`;
      try {
        await graphqlRequest(mutation, { DocID }, token);
        await this.fetchPendingDocs();
      } catch (err) { alert(err.message); }
      finally { this.docApproving = null; }
    },
    async approveNominee(NomineeID) {
      if (!confirm('Approve this nominee?')) return;
      this.nomineeAction = NomineeID;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveNom($NomineeID: Int!) { approveNominee(NomineeID: $NomineeID) { NomineeID } }`;
      try {
        await graphqlRequest(mutation, { NomineeID }, token);
        await this.fetchPendingNominees();
      } catch (err) { alert(err.message); }
      finally { this.nomineeAction = null; }
    },
    async rejectNominee(NomineeID) {
      if (!confirm('Reject and delete this nominee?')) return;
      this.nomineeAction = NomineeID;
      const token = localStorage.getItem('token');
      const mutation = `mutation RejectNom($NomineeID: Int!) { rejectNominee(NomineeID: $NomineeID) }`;
      try {
        await graphqlRequest(mutation, { NomineeID }, token);
        await this.fetchPendingNominees();
      } catch (err) { alert(err.message); }
      finally { this.nomineeAction = null; }
    },
    async approveLocation(RequestID) {
      if (!confirm('Approve this location change?')) return;
      this.locationAction = RequestID;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveLoc($RequestID: Int!) { approveLocationChange(RequestID: $RequestID) { RequestID } }`;
      try {
        await graphqlRequest(mutation, { RequestID }, token);
        this.fetchLocationRequests();
      } catch (err) { alert(err.message); }
      finally { this.locationAction = null; }
    },
    async rejectLocation(RequestID) {
      if (!confirm('Reject this location change request?')) return;
      this.locationAction = RequestID;
      const token = localStorage.getItem('token');
      const mutation = `mutation RejectLoc($RequestID: Int!) { rejectLocationChange(RequestID: $RequestID) }`;
      try {
        await graphqlRequest(mutation, { RequestID }, token);
        this.fetchLocationRequests();
      } catch (err) { alert(err.message); }
      finally { this.locationAction = null; }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const num = Number(dateString);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
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

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminApprovals;
}
