// Admin Shelves Component
const AdminShelves = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0">
                <i class="bi bi-stack"></i> 
                Manage Shelves for {{ store ? store.StoreName : 'Store #' + $route.params.StoreID }}
                <small v-if="store && store.Warehouse" class="fs-6 opacity-75">({{ store.Warehouse.Name }})</small>
              </h4>
              <div>
                <button v-if="!$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Add Shelf</button>
                <button v-if="$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Create Shelf</button>
                <router-link to="/admin/stores" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back</router-link>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center py-4"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else-if="shelves.length === 0" class="alert alert-info">
                No shelves found for this store. Click "Add Shelf" to create one.
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
                      <td>Level {{ s.Level ?? 1 }}</td>
                      <td>Pos {{ s.Position ?? 1 }}</td>
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
                  <input type="text" class="form-control" v-model="formData.ShelfCode" required placeholder="e.g. S1-L1-P1 or FL01">
                </div>
                <div class="row">
                  <div class="col-6 mb-3">
                    <label class="form-label">Level</label>
                    <input type="number" class="form-control" v-model.number="formData.Level" min="1" placeholder="1">
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Position</label>
                    <input type="number" class="form-control" v-model.number="formData.Position" min="1" placeholder="1">
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
      store: null,
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
    if (this.$refs.shelfModal && window.bootstrap) {
      this.modalInstance = new bootstrap.Modal(this.$refs.shelfModal, { backdrop: 'static' });
    }
  },
  methods: {
    getEmptyForm() {
      return { ShelfID: null, StoreID: parseInt(this.$route.params.StoreID), ShelfCode: '', Level: 1, Position: 1 };
    },
    async fetchShelves() {
      this.loading = true;
      this.error = null;
      const StoreID = parseInt(this.$route.params.StoreID);
      const token = localStorage.getItem('token');
      const query = `query { 
        shelvesByStore(StoreID: ${StoreID}) { ShelfID StoreID ShelfCode Level Position }
        store(StoreID: ${StoreID}) { StoreID StoreName Type Warehouse { WarehouseID Name } }
      }`;
      
      try {
        const data = await graphqlRequest(query, {}, token);
        this.shelves = data.shelvesByStore || [];
        this.store = data.store || null;
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
      if (this.modalInstance) this.modalInstance.show();
    },
    editShelf(shelf) {
      this.isEditing = true;
      this.formData = {
        ShelfID: shelf.ShelfID,
        StoreID: shelf.StoreID,
        ShelfCode: shelf.ShelfCode || '',
        Level: shelf.Level ?? 1,
        Position: shelf.Position ?? 1
      };
      this.modalError = null;
      if (this.modalInstance) this.modalInstance.show();
    },
    closeModal() {
      if (this.modalInstance) this.modalInstance.hide();
    },
    async saveShelf() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');
      
      try {
        const StoreID = parseInt(this.$route.params.StoreID);
        const ShelfCode = (this.formData.ShelfCode || '').trim();
        if (!ShelfCode) {
          throw new Error('Shelf Code is required');
        }

        const Level = (this.formData.Level !== '' && this.formData.Level !== null && !isNaN(this.formData.Level)) 
          ? parseInt(this.formData.Level) : 1;
        const Position = (this.formData.Position !== '' && this.formData.Position !== null && !isNaN(this.formData.Position)) 
          ? parseInt(this.formData.Position) : 1;

        let mutation, vars;
        if (this.isEditing) {
          mutation = `mutation UpdateShelf($ShelfID: Int!, $ShelfCode: String, $Level: Int, $Position: Int) { 
            updateShelf(ShelfID: $ShelfID, ShelfCode: $ShelfCode, Level: $Level, Position: $Position) { ShelfID } 
          }`;
          vars = {
            ShelfID: parseInt(this.formData.ShelfID),
            ShelfCode,
            Level,
            Position
          };
        } else {
          mutation = `mutation CreateShelf($StoreID: Int!, $ShelfCode: String, $Level: Int, $Position: Int) { 
            createShelf(StoreID: $StoreID, ShelfCode: $ShelfCode, Level: $Level, Position: $Position) { ShelfID } 
          }`;
          vars = {
            StoreID,
            ShelfCode,
            Level,
            Position
          };
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        await this.fetchShelves();
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
        await graphqlRequest(mutation, { ShelfID: parseInt(ShelfID) }, token);
        await this.fetchShelves();
      } catch (err) {
        alert(err.message);
      }
    },
    printQRCode(shelf) {
      const qrContainer = document.getElementById('qr-code-print');
      if (!qrContainer) return;
      qrContainer.innerHTML = '';
      
      const qrData = JSON.stringify({
        type: 'SHELF',
        id: shelf.ShelfID,
        code: shelf.ShelfCode,
        store: shelf.StoreID
      });

      if (typeof QRCode === 'undefined') {
        alert('QR Code generator library not loaded.');
        return;
      }

      new QRCode(qrContainer, {
        text: qrData,
        width: 256,
        height: 256
      });

      setTimeout(() => {
        const imgEl = qrContainer.querySelector('img');
        const canvasEl = qrContainer.querySelector('canvas');
        const qrImage = (imgEl && imgEl.src) ? imgEl.src : (canvasEl ? canvasEl.toDataURL() : '');
        
        if (!qrImage) {
          alert('Failed to generate QR code.');
          return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Popup blocked. Please allow popups to print QR code.');
          return;
        }

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
                <p>Scan to identify shelf in inventory management</p>
              </div>
              <script>
                window.onload = function() { window.print(); window.close(); };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }, 300);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminShelves;
}
