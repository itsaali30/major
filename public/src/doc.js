// Documents Component
const Doc = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-10">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-file-earmark-text"></i> My Documents</h4>
              <router-link to="/profile" class="btn btn-outline-light btn-sm">
                <i class="bi bi-arrow-left"></i> Back to Profile
              </router-link>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-4">
                <p class="text-muted mb-0">Manage your essential documents for verification.</p>
                <button class="btn btn-primary" @click="openAddModal">
                  <i class="bi bi-plus-lg"></i> Add Document
                </button>
              </div>

              <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-primary"></div>
              </div>

              <div v-else-if="documents.length === 0" class="text-center py-5 bg-light rounded border">
                <i class="bi bi-files fs-1 text-muted"></i>
                <p class="text-muted mt-2">No documents uploaded yet.</p>
              </div>

              <div v-else class="table-responsive">
                <table class="table table-hover align-middle border">
                  <thead class="table-light">
                    <tr>
                      <th>Document Type</th>
                      <th>Number</th>
                      <th class="text-center">Status</th>
                      <th>Upload Date</th>
                      <th class="text-center">Preview</th>
                      <th class="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="doc in documents" :key="doc.DocID">
                      <td>
                        <span class="badge bg-info text-dark font-monospace text-uppercase">{{ doc.Type }}</span>
                      </td>
                      <td>{{ doc.Number || 'N/A' }}</td>
                      <td class="text-center">
                        <span class="badge" :class="getStatusClass(doc.IsApproved)">
                          {{ doc.IsApproved ? 'Approved' : 'Pending' }}
                        </span>
                      </td>
                      <td class="small">{{ formatDate(doc.CreatedAt) }}</td>
                      <td class="text-center">
                        <a v-if="doc.ImageURL" :href="doc.ImageURL" target="_blank" class="btn btn-sm btn-outline-secondary">
                          <i class="bi bi-eye"></i> View
                        </a>
                        <span v-else class="text-muted small">No file</span>
                      </td>
                      <td class="text-end">
                        <button v-if="!doc.IsApproved || isAdmin" class="btn btn-sm btn-outline-danger" @click="deleteDoc(doc.DocID)">
                          <i class="bi bi-trash"></i>
                        </button>
                        <span v-else class="text-muted small"><i class="bi bi-lock-fill"></i> Locked</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Document Modal -->
      <div v-if="showModal" class="modal-backdrop fade show"></div>
      <div v-if="showModal" class="modal fade show" style="display: block;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-primary text-white border-0">
              <h5 class="modal-title"><i class="bi bi-plus-circle me-2"></i>New Document</h5>
              <button type="button" class="btn-close btn-close-white" @click="showModal = false"></button>
            </div>
            <div class="modal-body p-4">
              <div v-if="saveError" class="alert alert-danger small">{{ saveError }}</div>
              
              <div class="mb-3">
                <label class="form-label fw-bold small">Document Type</label>
                <select class="form-select" v-model="form.Type" required>
                  <option value="" disabled>Select Document Type</option>
                  <option v-for="type in docTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold small">Document Number (Optional)</label>
                <input type="text" class="form-control" v-model="form.Number" placeholder="Enter ID number if applicable">
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold small">Document File (Photo/PDF)</label>
                <div v-if="form.ImageURL" class="mb-2 position-relative d-inline-block">
                    <img :src="form.ImageURL" class="img-thumbnail" style="max-height: 100px;">
                    <button class="btn btn-danger btn-xs position-absolute top-0 end-0 m-1 rounded-circle" @click="form.ImageURL = ''">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="input-group">
                    <input type="file" ref="docFileInput" class="form-control" accept="image/*,application/pdf" @change="handleFileUpload">
                    <span v-if="uploading" class="input-group-text bg-white">
                        <span class="spinner-border spinner-border-sm text-primary"></span>
                    </span>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0">
              <button type="button" class="btn btn-light" @click="showModal = false">Cancel</button>
              <button type="button" class="btn btn-primary px-4" @click="saveDocument" :disabled="saving || uploading">
                <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                Add Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      documents: [],
      loading: false,
      showModal: false,
      saving: false,
      uploading: false,
      saveError: null,
      form: { Type: '', Number: '', ImageURL: '' },
      docTypes: [
        'adhaarcard', 'bankpassbook', 'pancard', 'voterid', 
        'driving-license', 'vehicle-RC', 'memo', 'resume'
      ]
    };
  },
  computed: {
    isAdmin() {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return false;
      const user = JSON.parse(storedUser);
      return ['superadmin', 'admin', 'accountmanager'].includes(user.Role);
    }
  },
  mounted() {
    this.fetchDocuments();
  },
  methods: {
    async fetchDocuments() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query { myDocuments { DocID Type Number ImageURL IsApproved CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.documents = data.myDocuments;
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        this.loading = false;
      }
    },
    openAddModal() {
      this.form = { Type: '', Number: '', ImageURL: '' };
      this.saveError = null;
      this.showModal = true;
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.uploading = true;
      this.saveError = null;
      
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('token');
      try {
        const response = await axios.post('/upload-doc-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.data.success) {
          this.form.ImageURL = response.data.imageUrl;
        }
      } catch (err) {
        this.saveError = 'Upload failed: ' + (err.response?.data?.details || err.message);
      } finally {
        this.uploading = false;
        event.target.value = '';
      }
    },
    async saveDocument() {
      if (!this.form.Type) { this.saveError = 'Please select a document type'; return; }
      
      this.saving = true;
      this.saveError = null;
      const token = localStorage.getItem('token');
      
      const mutation = `mutation AddDocument($Type: String!, $Number: String, $ImageURL: String) { 
        addDocument(Type: $Type, Number: $Number, ImageURL: $ImageURL) { DocID } }`;
      
      try {
        await graphqlRequest(mutation, this.form, token);
        this.showModal = false;
        this.fetchDocuments();
      } catch (err) {
        this.saveError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteDoc(docID) {
      if (!confirm('Are you sure you want to delete this document?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteDocument($DocID: Int!) { deleteDocument(DocID: $DocID) }`;
      try {
        await graphqlRequest(mutation, { DocID: docID }, token);
        this.fetchDocuments();
      } catch (err) {
        alert('Error deleting document: ' + err.message);
      }
    },
    formatDate(dateString) {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    },
    getStatusClass(isApproved) {
      return isApproved ? 'bg-success' : 'bg-warning text-dark';
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Doc;
}
