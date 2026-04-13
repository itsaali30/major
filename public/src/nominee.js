// Nominee Component
const Nominee = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-10">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center border-0 py-3">
              <h4 class="mb-0 fw-bold"><i class="bi bi-people-fill me-2"></i> Nominee Details</h4>
              <router-link to="/profile" class="btn btn-outline-dark btn-sm rounded-pill px-3">
                <i class="bi bi-arrow-left me-1"></i> Back to Profile
              </router-link>
            </div>
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                  <h5 class="mb-1 fw-bold">Manage Your Nominees</h5>
                  <p class="text-muted mb-0 small text-uppercase fw-semibold letter-spacing-1">Emergency contacts and legal successors</p>
                </div>
                <button v-if="!hasApprovedNominee" class="btn btn-warning fw-bold px-4 rounded-pill shadow-sm" @click="openAddModal">
                  <i class="bi bi-person-plus-fill me-2"></i> Add Nominee
                </button>
              </div>

              <div v-if="loading" class="text-center py-5">
                <div class="spinner-grow text-warning" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted mt-3 fw-medium">Fetching details...</p>
              </div>

              <div v-else-if="nominees.length === 0" class="text-center py-5 bg-light rounded-4 border border-dashed">
                <div class="mb-3">
                  <i class="bi bi-person-bounding-box fs-1 text-warning opacity-50"></i>
                </div>
                <h5 class="text-dark">No nominee added</h5>
                <p class="text-muted mx-auto" style="max-width: 300px;">Add a nominee for emergency situations and secure your account's succession.</p>
                <button class="btn btn-outline-warning btn-sm mt-2 rounded-pill px-3" @click="openAddModal">
                   Click here to add
                </button>
              </div>

              <div v-else class="row g-4">
                <div v-for="nominee in nominees" :key="nominee.NomineeID" class="col-md-6">
                  <div class="card h-100 border shadow-none rounded-4 hover-shadow" :class="{'border-success': nominee.IsApproved}">
                    <div class="card-body p-4">
                      <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center">
                          <div class="bg-warning-subtle text-warning p-3 rounded-circle me-3">
                            <i class="bi bi-person fs-4"></i>
                          </div>
                          <div>
                            <h6 class="mb-0 fw-bold">{{ nominee.NomineeName }}</h6>
                            <span class="badge bg-light text-dark border small fw-normal">{{ nominee.Relation }}</span>
                          </div>
                        </div>
                        <div class="dropdown">
                          <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-three-dots-vertical"></i>
                          </button>
                          <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                            <li><a class="dropdown-item" href="#" @click.prevent="openEditModal(nominee)"><i class="bi bi-pencil me-2"></i> Edit</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteNominee(nominee.NomineeID)"><i class="bi bi-trash me-2"></i> Delete</a></li>
                          </ul>
                        </div>
                      </div>
                      
                      <div class="mt-4">
                        <p class="mb-2 small d-flex align-items-center text-muted">
                          <i class="bi bi-phone me-2"></i> {{ nominee.Phone }}
                        </p>
                        <p v-if="nominee.EmergencyPhone" class="mb-2 small d-flex align-items-center text-muted">
                          <i class="bi bi-telephone-plus me-2 text-danger"></i> {{ nominee.EmergencyPhone }} (Emergency)
                        </p>
                        <p v-if="nominee.DOB" class="mb-2 small d-flex align-items-center text-muted">
                          <i class="bi bi-calendar-event me-2"></i> {{ formatDate(nominee.DOB) }}
                        </p>
                        <p class="mb-0 small d-flex align-items-start text-muted">
                          <i class="bi bi-geo-alt me-2 mt-1"></i> <span class="text-truncate-2">{{ nominee.Address }}</span>
                        </p>
                      </div>

                      <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                         <div class="d-flex align-items-center">
                            <i class="bi" :class="nominee.IsApproved ? 'bi-check-circle-fill text-success' : 'bi-clock-history text-secondary'"></i>
                            <span class="ms-2 small fw-bold" :class="nominee.IsApproved ? 'text-success' : 'text-secondary'">
                               {{ nominee.IsApproved ? 'Approved' : 'Pending Verification' }}
                            </span>
                         </div>
                         <span class="text-muted x-small">Date: {{ formatDate(nominee.CreatedAt) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Admin Approval Section -->
          <div v-if="isAdmin && pendingNominees.length > 0" class="card shadow-sm border-0 mt-5">
            <div class="card-header bg-dark text-white py-3 border-0">
               <h5 class="mb-0 fw-bold"><i class="bi bi-shield-check me-2 text-warning"></i> Pending Admin Approvals</h5>
            </div>
            <div class="card-body p-0">
               <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0">
                     <thead class="bg-light x-small text-uppercase fw-bold text-muted">
                        <tr>
                           <th class="ps-4">User ID</th>
                           <th>Nominee</th>
                           <th>Relation</th>
                           <th>Phone</th>
                           <th class="text-end pe-4">Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="pn in pendingNominees" :key="pn.NomineeID">
                           <td class="ps-4">#{{ pn.UserID }}</td>
                           <td class="fw-medium">{{ pn.NomineeName }}</td>
                           <td><span class="badge bg-light text-secondary border fw-normal">{{ pn.Relation }}</span></td>
                           <td class="small">{{ pn.Phone }}</td>
                           <td class="text-end pe-4">
                              <button class="btn btn-success btn-sm rounded-pill px-3" 
                                      @click="approveNominee(pn.NomineeID)"
                                      :disabled="approving === pn.NomineeID">
                                 <span v-if="approving === pn.NomineeID" class="spinner-border spinner-border-sm me-1"></span>
                                 Approve
                              </button>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nominee Modal -->
      <div v-if="showModal" class="modal-backdrop fade show"></div>
      <div v-if="showModal" class="modal fade show" style="display: block;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <div class="modal-header bg-warning py-3 border-0">
              <h5 class="modal-title fw-bold text-dark"><i class="bi bi-person-fill-add me-2"></i>{{ editMode ? 'Edit' : 'Add' }} Nominee</h5>
              <button type="button" class="btn-close" @click="showModal = false"></button>
            </div>
            <div class="modal-body p-4">
              <div v-if="saveError" class="alert alert-danger small border-0 shadow-sm">{{ saveError }}</div>
              
              <div class="mb-3">
                <label class="form-label x-small text-uppercase fw-bold text-muted">Nominee Name</label>
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0"><i class="bi bi-person text-warning"></i></span>
                  <input type="text" class="form-control border-start-0 ps-0" v-model="form.NomineeName" placeholder="Full Name" required>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6 mb-3">
                  <label class="form-label x-small text-uppercase fw-bold text-muted">Relation</label>
                  <select class="form-select" v-model="form.Relation" required>
                    <option value="" disabled>Select</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label x-small text-uppercase fw-bold text-muted">Date of Birth</label>
                  <input type="date" class="form-control" v-model="form.DOB">
                </div>
              </div>

              <div class="row g-3">
                <div class="col-md-6 mb-3">
                  <label class="form-label x-small text-uppercase fw-bold text-muted">Mobile Number</label>
                  <div class="input-group">
                    <span class="input-group-text bg-white border-end-0 x-small text-muted">+91</span>
                    <input type="tel" class="form-control border-start-0 ps-0" v-model="form.Phone" placeholder="Mobile No" required maxlength="10">
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label x-small text-uppercase fw-bold text-muted">Emergency Contact</label>
                  <input type="tel" class="form-control" v-model="form.EmergencyPhone" placeholder="Alt Mobile No" maxlength="10">
                </div>
              </div>

              <div class="mb-0">
                <label class="form-label x-small text-uppercase fw-bold text-muted">Address</label>
                <textarea class="form-control" v-model="form.Address" rows="2" placeholder="Complete address of nominee"></textarea>
              </div>
            </div>
            <div class="modal-footer border-0 p-4 pt-0">
              <button type="button" class="btn btn-light rounded-pill px-4" @click="showModal = false">Discard</button>
              <button type="button" class="btn btn-warning rounded-pill px-4 fw-bold" @click="saveNominee" :disabled="saving">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ editMode ? 'Update' : 'Confirm & Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      nominees: [],
      pendingNominees: [],
      loading: false,
      showModal: false,
      editMode: false,
      saving: false,
      approving: null,
      saveError: null,
      form: { NomineeID: null, NomineeName: '', Relation: '', DOB: '', Phone: '', EmergencyPhone: '', Address: '' },
      currentUser: JSON.parse(localStorage.getItem('user') || '{}')
    };
  },
  computed: {
    isAdmin() {
      return ['superadmin', 'admin', 'accountmanager'].includes(this.currentUser.Role);
    },
    hasApprovedNominee() {
      return this.nominees.some(n => n.IsApproved);
    }
  },
  mounted() {
    this.fetchNominees();
    if (this.isAdmin) this.fetchPendingNominees();
  },
  methods: {
    async fetchNominees() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query { myNominees { NomineeID NomineeName Relation DOB Phone EmergencyPhone Address IsApproved CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.nominees = data.myNominees;
      } catch (err) {
        console.error('Error fetching nominees:', err);
      } finally {
        this.loading = false;
      }
    },
    async fetchPendingNominees() {
      const token = localStorage.getItem('token');
      const query = `query { pendingNominees { NomineeID UserID NomineeName Relation Phone IsApproved } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingNominees = data.pendingNominees;
      } catch (err) {
        console.error('Error fetching pending nominees:', err);
      }
    },
    openAddModal() {
      this.form = { NomineeID: null, NomineeName: '', Relation: '', DOB: '', Phone: '', EmergencyPhone: '', Address: '' };
      this.editMode = false;
      this.saveError = null;
      this.showModal = true;
    },
    openEditModal(nominee) {
      this.form = { ...nominee };
      if (this.form.DOB) this.form.DOB = this.form.DOB.split('T')[0];
      this.editMode = true;
      this.saveError = null;
      this.showModal = true;
    },
    async saveNominee() {
      if (!this.form.NomineeName || !this.form.Relation || !this.form.Phone) {
        this.saveError = 'Please fill all required fields';
        return;
      }
      
      this.saving = true;
      this.saveError = null;
      const token = localStorage.getItem('token');
      
      let query = '';
      const vars = { ...this.form };
      delete vars.IsApproved;
      delete vars.CreatedAt;

      if (this.editMode) {
        query = `mutation UpdateNominee($NomineeID: Int!, $NomineeName: String, $Relation: String, $DOB: String, $Phone: String, $EmergencyPhone: String, $Address: String) { 
          updateNominee(NomineeID: $NomineeID, NomineeName: $NomineeName, Relation: $Relation, DOB: $DOB, Phone: $Phone, EmergencyPhone: $EmergencyPhone, Address: $Address) { NomineeID } }`;
      } else {
        delete vars.NomineeID;
        query = `mutation AddNominee($NomineeName: String!, $Relation: String!, $DOB: String, $Phone: String, $EmergencyPhone: String, $Address: String) { 
          addNominee(NomineeName: $NomineeName, Relation: $Relation, DOB: $DOB, Phone: $Phone, EmergencyPhone: $EmergencyPhone, Address: $Address) { NomineeID } }`;
      }
      
      try {
        await graphqlRequest(query, vars, token);
        this.showModal = false;
        this.fetchNominees();
      } catch (err) {
        this.saveError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteNominee(nomineeID) {
      if (!confirm('Are you sure you want to delete this nominee?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation { deleteNominee(NomineeID: ${nomineeID}) }`;
      try {
        await graphqlRequest(mutation, {}, token);
        this.fetchNominees();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    },
    async approveNominee(nomineeID) {
      this.approving = nomineeID;
      const token = localStorage.getItem('token');
      const mutation = `mutation { approveNominee(NomineeID: ${nomineeID}) { NomineeID IsApproved } }`;
      try {
        await graphqlRequest(mutation, {}, token);
        this.fetchPendingNominees();
        this.fetchNominees();
      } catch (err) {
        alert('Approval failed: ' + err.message);
      } finally {
        this.approving = null;
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Nominee;
}
