// Admin Shelves Component
const AdminShelves = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-stack"></i> Manage Shelves for Store #{{ $route.params.StoreID }}</h4>
              <div>
                <button v-if="!$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Add Shelf</button>
                <button v-if="$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Create Shelf</button>
                <router-link to="/admin/stores" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back</router-link>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else-if="shelves.length === 0" class="alert alert-info">
                No shelves found for this store.
              </div>
              <div v-else class="table-responsive">
                <table class="table table-striped table-hover">
                  <thead class="table-dark">
                    <tr>
                      <th>Shelf ID</th>
                      <th>Shelf Code</th>
                      <th>Level</th>
                      <th>Position</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in shelves" :key="s.ShelfID">
                      <td>{{ s.ShelfID }}</td>
                      <td><strong>{{ s.ShelfCode }}</strong></td>
                      <td>Level {{ s.Level }}</td>
                      <td>Pos {{ s.Position }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-warning" @click="printQRCode(s)" title="Print QR"><i class="bi bi-qr-code"></i></button>
                          <button v-if="!$root.isIncharge" class="btn btn-info" @click="editShelf(s)" title="Edit"><i class="bi bi-pencil"></i></button>
                          <button v-if="!$root.isIncharge" class="btn btn-danger" @click="deleteShelf(s.ShelfID)" title="Delete"><i class="bi bi-trash"></i></button>
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
      <div class="modal fade" id="shelfModal" tabindex="-1" ref="shelfModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title"><i class="bi" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i> {{ isEditing ? 'Edit Shelf' : 'Add Shelf' }}</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>
              <form @submit.prevent="saveShelf">
                <div class="mb-3">
                  <label class="form-label">Shelf Code *</label>
                  <input type="text" class="form-control" v-model="formData.ShelfCode" required placeholder="e.g. S1-L1-P1">
                </div>
                <div class="row">
                  <div class="col-6 mb-3">
                    <label class="form-label">Level</label>
                    <input type="number" class="form-control" v-model.number="formData.Level">
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Position</label>
                    <input type="number" class="form-control" v-model.number="formData.Position">
                  </div>
                </div>
                <div class="text-end mt-3">
                  <button type="button" class="btn btn-secondary me-2" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-success" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ saving ? 'Saving...' : 'Save Shelf' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden QR Generator Container -->
      <div id="qr-code-print" style="display: none;"></div>
    </div>
  `,
  data() {
    return {
      shelves: [],
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
    this.fetchShelves();
    this.modalInstance = new bootstrap.Modal(this.$refs.shelfModal, { backdrop: 'static' });
  },
  methods: {
    getEmptyForm() {
      return { ShelfID: null, StoreID: parseInt(this.$route.params.StoreID), ShelfCode: '', Level: 0, Position: 0 };
    },
    async fetchShelves() {
      this.loading = true;
      const StoreID = parseInt(this.$route.params.StoreID);
      const token = localStorage.getItem('token');
      const query = `query { shelvesByStore(StoreID: ${StoreID}) { ShelfID StoreID ShelfCode Level Position } }`;
      
      try {
        const data = await graphqlRequest(query, {}, token);
        this.shelves = data.shelvesByStore;
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
    editShelf(shelf) {
      this.isEditing = true;
      this.formData = { ...shelf };
      this.modalError = null;
      this.modalInstance.show();
    },
    closeModal() {
      this.modalInstance.hide();
    },
    async saveShelf() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');
      
      try {
        let mutation, vars;
        if (this.isEditing) {
          mutation = `mutation UpdateShelf($ShelfID: Int!, $ShelfCode: String, $Level: Int, $Position: Int) { 
            updateShelf(ShelfID: $ShelfID, ShelfCode: $ShelfCode, Level: $Level, Position: $Position) { ShelfID } 
          }`;
          vars = { ...this.formData };
        } else {
          mutation = `mutation CreateShelf($StoreID: Int!, $ShelfCode: String, $Level: Int, $Position: Int) { 
            createShelf(StoreID: $StoreID, ShelfCode: $ShelfCode, Level: $Level, Position: $Position) { ShelfID } 
          }`;
          vars = { ...this.formData };
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        this.fetchShelves();
      } catch (err) {
        this.modalError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteShelf(ShelfID) {
      if (!confirm('Are you sure you want to delete this shelf?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteShelf($ShelfID: Int!) { deleteShelf(ShelfID: $ShelfID) }`;
      
      try {
        await graphqlRequest(mutation, { ShelfID }, token);
        this.fetchShelves();
      } catch (err) {
        alert(err.message);
      }
    },
    printQRCode(shelf) {
      const qrContainer = document.getElementById('qr-code-print');
      qrContainer.innerHTML = ''; // Clear previous
      
      const qrData = JSON.stringify({
        type: 'SHELF',
        id: shelf.ShelfID,
        code: shelf.ShelfCode,
        store: shelf.StoreID
      });

      new QRCode(qrContainer, {
        text: qrData,
        width: 256,
        height: 256
      });

      // Wait for QR to be generated
      setTimeout(() => {
        const qrImage = qrContainer.querySelector('img').src;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Shelf QR Code - ${shelf.ShelfCode}</title>
              <style>
                body { text-align: center; font-family: sans-serif; padding-top: 50px; }
                .qr-container { border: 2px solid #000; display: inline-block; padding: 20px; }
                h1 { margin-bottom: 5px; }
                h2 { margin-top: 0; color: #666; }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <h1>SHELF: ${shelf.ShelfCode}</h1>
                <h2>Store ID: ${shelf.StoreID} | Shelf ID: ${shelf.ShelfID}</h2>
                <img src="${qrImage}" width="300" />
                <p>Scan to identity shelf in inventory management</p>
              </div>
              <script>
                window.onload = function() { window.print(); window.close(); };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }, 500);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminShelves;
}
