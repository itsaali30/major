const AdminMerchantContacts = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm border-0">
            <div class="card-header bg-gradient-info text-white d-flex justify-content-between align-items-center py-3" style="background: linear-gradient(135deg, #17a2b8, #0056b3);">
              <h4 class="mb-0"><i class="bi bi-people me-2"></i> Merchant Contacts</h4>
              <div>
                <button class="btn btn-light btn-sm me-2 fw-bold" @click="openCreateModal">
                  <i class="bi bi-plus-circle me-1"></i> Add Contact
                </button>
                <router-link to="/admin/merchants" class="btn btn-outline-light btn-sm fw-bold">
                  <i class="bi bi-arrow-left me-1"></i> Back to Merchants
                </router-link>
              </div>
            </div>
            <div class="card-body p-4">
              <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-info" role="status"></div>
                <p class="mt-2 text-muted">Loading contacts...</p>
              </div>
              <div v-else-if="error" class="alert alert-danger shadow-sm border-0">{{ error }}</div>
              <div v-else-if="contacts.length === 0" class="text-center py-5">
                <i class="bi bi-person-lines-fill text-muted display-1"></i>
                <p class="mt-3 fs-5 text-muted">No contacts found for this merchant. Click "Add Contact" to start.</p>
              </div>
              <div v-else class="table-responsive">
                <table class="table table-hover align-middle">
                  <thead class="table-light">
                    <tr>
                      <th class="ps-3">Name</th>
                      <th>Phone</th>
                      <th>Phone 2</th>
                      <th>WhatsApp</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th class="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in contacts" :key="c.ContactID">
                      <td class="ps-3"><strong>{{ c.Name || 'N/A' }}</strong></td>
                      <td>{{ c.Phone || 'N/A' }}</td>
                      <td>{{ c.phone2 || 'N/A' }}</td>
                      <td>{{ c.whatsapp || 'N/A' }}</td>
                      <td>{{ c.Email || 'N/A' }}</td>
                      <td><span class="badge bg-secondary">{{ c.Role || 'N/A' }}</span></td>
                      <td class="text-end pe-3">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-primary" @click="editContact(c)" title="Edit">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="btn btn-outline-danger" @click="deleteContact(c.ContactID)" title="Delete">
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
      <div class="modal fade" id="contactModal" tabindex="-1" ref="contactModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header text-white py-3" style="background: linear-gradient(135deg, #17a2b8, #0056b3);">
              <h5 class="modal-title">
                <i class="bi me-2" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i>
                {{ isEditing ? 'Edit Contact' : 'Add New Contact' }}
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger border-0 shadow-sm">{{ modalError }}</div>
              <form @submit.prevent="saveContact">
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label fw-bold small text-uppercase">Name</label>
                    <input type="text" class="form-control" v-model="formData.Name" placeholder="Contact Person Name">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Phone</label>
                    <input type="text" class="form-control" v-model="formData.Phone" placeholder="Phone">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Phone 2</label>
                    <input type="text" class="form-control" v-model="formData.phone2" placeholder="Secondary Phone">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">WhatsApp</label>
                    <input type="text" class="form-control" v-model="formData.whatsapp" placeholder="WhatsApp Number">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold small text-uppercase">Email</label>
                    <input type="email" class="form-control" v-model="formData.Email" placeholder="Email Address">
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-bold small text-uppercase">Role</label>
                    <input type="text" class="form-control" v-model="formData.Role" placeholder="Role (e.g., Manager, Sales)">
                  </div>
                </div>
                <div class="text-end mt-4">
                  <button type="button" class="btn btn-light me-2 fw-bold" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-info text-white px-4 fw-bold" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    {{ saving ? 'Saving...' : (isEditing ? 'Update Contact' : 'Save Contact') }}
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
      MerchantID: this.$route.params.MerchantID,
      contacts: [],
      loading: true,
      error: null,
      modalInstance: null,
      isEditing: false,
      saving: false,
      modalError: null,
      formData: this.getEmptyForm()
    };
  },
  mounted() {
    this.fetchContacts();
    this.modalInstance = new bootstrap.Modal(this.$refs.contactModal, { backdrop: 'static' });
  },
  methods: {
    getEmptyForm() {
      return { ContactID: null, Name: '', Phone: '', phone2: '', whatsapp: '', Email: '', Role: '' };
    },
    async fetchContacts() {
      this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      const query = `query GetContacts($MerchantID: Int!) { merchantContacts(MerchantID: $MerchantID) { ContactID Name Phone phone2 whatsapp Email Role } }`;
      
      try {
        const data = await graphqlRequest(query, { MerchantID: parseInt(this.MerchantID) }, token);
        this.contacts = data.merchantContacts || [];
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
    editContact(contact) {
      this.isEditing = true;
      this.formData = { ...contact };
      this.modalError = null;
      this.modalInstance.show();
    },
    closeModal() {
      this.modalInstance.hide();
    },
    async saveContact() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');
      
      try {
        let mutation, vars;
        
        if (this.isEditing) {
          mutation = `mutation UpdateContact($ContactID: Int!, $Name: String, $Phone: String, $phone2: String, $whatsapp: String, $Email: String, $Role: String) { 
            updateMerchantContact(ContactID: $ContactID, Name: $Name, Phone: $Phone, phone2: $phone2, whatsapp: $whatsapp, Email: $Email, Role: $Role) { ContactID } 
          }`;
          vars = { ...this.formData, ContactID: parseInt(this.formData.ContactID) };
        } else {
          mutation = `mutation CreateContact($MerchantID: Int!, $Name: String, $Phone: String, $phone2: String, $whatsapp: String, $Email: String, $Role: String) { 
            createMerchantContact(MerchantID: $MerchantID, Name: $Name, Phone: $Phone, phone2: $phone2, whatsapp: $whatsapp, Email: $Email, Role: $Role) { ContactID } 
          }`;
          vars = { 
            ...this.formData,
            MerchantID: parseInt(this.MerchantID)
          };
          delete vars.ContactID;
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        this.fetchContacts();
      } catch (err) {
        this.modalError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteContact(ContactID) {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteContact($ContactID: Int!) { deleteMerchantContact(ContactID: $ContactID) }`;
      
      try {
        await graphqlRequest(mutation, { ContactID: parseInt(ContactID) }, token);
        this.fetchContacts();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminMerchantContacts;
}
