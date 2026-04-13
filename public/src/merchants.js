// Merchant Management Component
const AdminMerchants = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-gradient-primary text-white d-flex justify-content-between align-items-center py-3">
              <h4 class="mb-0"><i class="bi bi-shop me-2"></i> Manage Merchants</h4>
              <div>
                <button class="btn btn-light btn-sm me-2 fw-bold" @click="openCreateModal">
                  <i class="bi bi-plus-circle me-1"></i> Add Merchant
                </button>
                <router-link to="/admin" class="btn btn-outline-light btn-sm fw-bold">
                  <i class="bi bi-arrow-left me-1"></i> Back
                </router-link>
              </div>
            </div>
            <div class="card-body p-4">
              <!-- Search Bar -->
              <div class="row mb-3">
                <div class="col-md-6 col-lg-4">
                  <div class="input-group shadow-sm">
                    <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                    <input type="text" class="form-control border-start-0" v-model="searchQuery" placeholder="Search merchants...">
                  </div>
                </div>
              </div>

              <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Loading merchants...</p>
              </div>
              <div v-else-if="error" class="alert alert-danger shadow-sm border-0">{{ error }}</div>
              <div v-else-if="filteredMerchants.length === 0" class="text-center py-5">
                <i class="bi bi-inbox text-muted display-1"></i>
                <p class="mt-3 fs-5 text-muted">No merchants found. Click "Add Merchant" to get started.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th class="ps-3">ID</th>
                      <th>Name</th>
                      <th>GSTIN</th>
                      <th>Contact</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th class="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in filteredMerchants" :key="m.MerchantID">
                      <td class="ps-3"><span class="badge bg-light text-dark border">{{ m.MerchantID }}</span></td>
                      <td><strong>{{ m.Name }}</strong></td>
                      <td><code>{{ m.GSTIN || 'N/A' }}</code></td>
                      <td>{{ m.Contact || 'N/A' }}</td>
                      <td><span class="badge bg-soft-info text-info">{{ m.Category || 'General' }}</span></td>
                      <td>
                        <span class="badge" :class="m.Status === 'Active' ? 'bg-success' : 'bg-warning text-dark'">
                          {{ m.Status || 'Active' }}
                        </span>
                      </td>
                      <td class="text-end pe-3">
                        <div class="btn-group btn-group-sm">
                          <router-link :to="'/admin/merchants/' + m.MerchantID" class="btn btn-outline-info" title="Manage Merchant Dashboard">
                            <i class="bi bi-grid-1x2"></i> Manage
                          </router-link>
                          <button class="btn btn-outline-primary" @click="editMerchant(m)" title="Edit">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-outline-danger" @click="deleteMerchant(m.MerchantID)" title="Delete">
                            <i class="bi bi-trash"></i>
                          </button>
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

      <!-- Create/Edit Modal -->
      <div class="modal fade" id="merchantModal" tabindex="-1" ref="merchantModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-gradient-primary text-white py-3">
              <h5 class="modal-title">
                <i class="bi me-2" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i>
                {{ isEditing ? 'Edit Merchant' : 'Add New Merchant' }}
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger border-0 shadow-sm">{{ modalError }}</div>
              <form @submit.prevent="saveMerchant">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Merchant Name *</label>
                    <input type="text" class="form-control" v-model="formData.Name" placeholder="Enter company name" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">GSTIN</label>
                    <input type="text" class="form-control" v-model="formData.GSTIN" placeholder="GST Number">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Contact Number</label>
                    <input type="text" class="form-control" v-model="formData.Contact" placeholder="Phone or Email">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Category</label>
                    <select class="form-select" v-model="formData.Category">
                      <option value="FMCG">FMCG</option>
                      <option value="Fresh">Fresh Produce</option>
                      <option value="Electronics">Electronics</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-bold small text-uppercase">Full Address</label>
                    <textarea class="form-control" v-model="formData.Address" rows="2" placeholder="Warehouse or Office address"></textarea>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Status</label>
                    <select class="form-select" v-model="formData.Status">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div class="text-end mt-4">
                  <button type="button" class="btn btn-light me-2 fw-bold" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-primary px-4 fw-bold" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    {{ saving ? 'Saving...' : (isEditing ? 'Update Merchant' : 'Save Merchant') }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      merchants: [],
      searchQuery: '',
      loading: true,
      error: null,
      modalInstance: null,
      isEditing: false,
      saving: false,
      modalError: null,
      formData: this.getEmptyForm()
    };
  },
  computed: {
    filteredMerchants() {
      if (!this.searchQuery) return this.merchants;
      const query = this.searchQuery.toLowerCase();
      return this.merchants.filter(m => 
        (m.Name && m.Name.toLowerCase().includes(query)) ||
        (m.GSTIN && m.GSTIN.toLowerCase().includes(query)) ||
        (m.Contact && m.Contact.toLowerCase().includes(query)) ||
        (m.Category && m.Category.toLowerCase().includes(query))
      );
    }
  },
  mounted() {
    this.fetchMerchants();
    this.modalInstance = new bootstrap.Modal(this.$refs.merchantModal, { backdrop: 'static' });
  },
  methods: {
    getEmptyForm() {
      return { MerchantID: null, Name: '', GSTIN: '', Contact: '', Category: 'General', Status: 'Active', Address: '' };
    },
    async fetchMerchants() {
      this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      const query = `query { allMerchants { MerchantID Name GSTIN Contact Category Status Address } }`;
      
      try {
        const data = await graphqlRequest(query, {}, token);
        this.merchants = data.allMerchants;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    openCreateModal() {
      this.isEditing = false;
      this.formData = this.getEmptyForm();
      this.modalError = null;
      this.modalInstance.show();
    },
    editMerchant(merchant) {
      this.isEditing = true;
      this.formData = { ...merchant };
      this.modalError = null;
      this.modalInstance.show();
    },
    closeModal() {
      this.modalInstance.hide();
    },
    async saveMerchant() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');
      
      try {
        let mutation, vars;
        
        if (this.isEditing) {
          mutation = `mutation UpdateMerchant($MerchantID: Int!, $Name: String, $Address: String, $GSTIN: String, $Contact: String, $Category: String, $Status: String) { 
            updateMerchant(MerchantID: $MerchantID, Name: $Name, Address: $Address, GSTIN: $GSTIN, Contact: $Contact, Category: $Category, Status: $Status) { MerchantID } 
          }`;
          vars = { ...this.formData };
        } else {
          mutation = `mutation CreateMerchant($Name: String!, $Address: String, $GSTIN: String, $Contact: String, $Category: String, $Status: String) { 
            createMerchant(Name: $Name, Address: $Address, GSTIN: $GSTIN, Contact: $Contact, Category: $Category, Status: $Status) { MerchantID } 
          }`;
          vars = { 
            Name: this.formData.Name, Address: this.formData.Address, GSTIN: this.formData.GSTIN,
            Contact: this.formData.Contact, Category: this.formData.Category, Status: this.formData.Status 
          };
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        this.fetchMerchants();
      } catch (err) {
        this.modalError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteMerchant(MerchantID) {
      if (!confirm('Are you sure you want to delete this merchant?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteMerchant($MerchantID: Int!) { deleteMerchant(MerchantID: $MerchantID) }`;
      
      try {
        await graphqlRequest(mutation, { MerchantID }, token);
        this.fetchMerchants();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminMerchants;
}
