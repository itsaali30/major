// Admin Stores Component
const AdminStores = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-shop"></i> Manage Stores</h4>
              <div>
                <button v-if="!$root.isManager && !$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Add Store</button>
                
                <!-- Warehouse Selector (Admins Only) -->
                <div class="d-inline-block me-2" v-if="warehouses.length > 0 && ($root.isSuperadmin || $root.isAdmin)">
                  <select class="form-select form-select-sm" v-model="selectedWarehouseID" @change="fetchStores" style="width: auto; display: inline-block;">
                    <option :value="null">All Warehouses</option>
                    <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                  </select>
                </div>

                <!-- Status Cycle Button (Beside Back) -->
                <button v-if="selectedWarehouseID && ($root.isManager || $root.isAdmin || $root.isSuperadmin || ($root.currentUser && ['accountmanager', 'cluster'].includes($root.currentUser.Role)))" 
                  class="btn btn-sm me-2 shadow-sm border text-white btn-success" 
                  @click="cycleSelectedWarehouseStatus"
                  :disabled="cycling">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  {{ getSelectedWarehouseStatus() }}
                </button>

                <router-link to="/admin" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back</router-link>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else-if="stores.length === 0" class="alert alert-info">
                No stores found.
              </div>
              <div v-else class="table-responsive">
                <table class="table table-striped table-hover">
                  <thead class="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Store Name</th>
                      <th>Warehouse</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in stores" :key="s.StoreID" @click="goToShelves(s.StoreID)" style="cursor: pointer;">
                    <td>{{ s.StoreID }}</td>
                      <td><strong>{{ s.StoreName }}</strong></td>
                      <td>{{ s.Warehouse ? s.Warehouse.Name : 'N/A' }}</td>
                      <td><span class="badge bg-secondary">{{ s.Type || 'Standard' }}</span></td>
                      <td>
                        <span class="badge" :class="s.Status === 'Active' ? 'bg-success' : (s.Status === 'Maintenance' ? 'bg-info' : 'bg-warning text-dark')">
                          {{ s.Status || 'Active' }}
                        </span>
                      </td>
                      <td>{{ cutText(s.Address, 30) }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <router-link :to="'/admin/shelves/' + s.StoreID" class="btn btn-dark" title="Shelves"><i class="bi bi-stack"></i></router-link>
                          <button v-if="!$root.isIncharge" class="btn btn-info" @click.stop="editStore(s)" title="Edit"><i class="bi bi-pencil"></i></button>
                          <button v-if="!$root.isManager && !$root.isIncharge" class="btn btn-danger" @click.stop="deleteStore(s.StoreID)" title="Delete"><i class="bi bi-trash"></i></button>
                        </div>
                        <span v-if="$root.isIncharge" class="text-muted small ms-2">View Only</span>
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
      <div class="modal fade" id="storeModal" tabindex="-1" ref="storeModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title"><i class="bi" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i> {{ isEditing ? 'Edit Store' : 'Add Store' }}</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>
              <form @submit.prevent="saveStore">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Store Name *</label>
                    <input type="text" class="form-control" v-model="formData.StoreName" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Warehouse *</label>
                    <select class="form-select" v-model="formData.WarehouseID" required>
                      <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Type</label>
                    <select class="form-select" v-model="formData.Type">
                      <option value="Mini">Mini Store (10-min)</option>
                      <option value="Standard">Standard Store</option>
                      <option value="Hub">Distribution Hub</option>
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Status</label>
                    <select class="form-select" v-model="formData.Status">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Full Address</label>
                  <textarea class="form-control" v-model="formData.Address" rows="2"></textarea>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Latitude</label>
                    <input type="number" step="any" class="form-control" v-model="formData.Lat">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Longitude</label>
                    <input type="number" step="any" class="form-control" v-model="formData.Long">
                  </div>
                </div>
                <div class="text-end mt-3">
                  <button type="button" class="btn btn-secondary me-2" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-info text-white" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ saving ? 'Saving...' : 'Save Store' }}
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
      stores: [],
      warehouses: [],
      selectedWarehouseID: null,
      loading: true,
      error: null,
      modalInstance: null,
      isEditing: false,
      saving: false,
      cycling: false,
      modalError: null,
      formData: this.getEmptyForm()
    };
  },
  async mounted() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = ['superadmin', 'admin'].includes(user.Role);

    if (this.$route.query.warehouseID) {
      this.selectedWarehouseID = parseInt(this.$route.query.warehouseID);
    } else if (!isAdmin) {
      // Fetch user's warehouse if not admin
      try {
        const token = localStorage.getItem('token');
        const query = `query { me { WarehouseID } }`;
        const data = await graphqlRequest(query, {}, token);
        if (data.me && data.me.WarehouseID) {
          this.selectedWarehouseID = data.me.WarehouseID;
        }
      } catch (err) { console.error("Error fetching user warehouse:", err); }
    }

    this.fetchStores();
    this.fetchWarehouses();
    this.modalInstance = new bootstrap.Modal(this.$refs.storeModal, { backdrop: 'static' });
  },
  methods: {
    goToShelves(StoreID) {
      this.$router.push('/admin/shelves/' + StoreID);
    },
    getEmptyForm() {
      return { StoreID: null, WarehouseID: '', StoreName: '', Address: '', Lat: '', Long: '', Type: 'Mini', Status: 'Active' };
    },
    cutText(text, length) {
      if (!text) return 'N/A';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },
    async fetchStores() {
      this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      let query;
      if (this.selectedWarehouseID) {
        query = `query { storesByWarehouse(WarehouseID: ${this.selectedWarehouseID}) { StoreID WarehouseID StoreName Address Lat Long Type Status Warehouse { Name Status } } }`;
      } else {
        query = `query { allStores { StoreID WarehouseID StoreName Address Lat Long Type Status Warehouse { Name Status } } }`;
      }

      try {
        const data = await graphqlRequest(query, {}, token);
        this.stores = this.selectedWarehouseID ? data.storesByWarehouse : data.allStores;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchWarehouses() {
      const token = localStorage.getItem('token');
      const query = `query { allWarehouses { WarehouseID Name Status } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.warehouses = data.allWarehouses;
      } catch (err) { }
    },
    openCreateModal() {
      this.isEditing = false;
      this.formData = this.getEmptyForm();
      this.modalError = null;
      this.modalInstance.show();
    },
    editStore(store) {
      this.isEditing = true;
      this.formData = { ...store };
      this.modalError = null;
      this.modalInstance.show();
    },
    closeModal() {
      this.modalInstance.hide();
    },
    async saveStore() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');

      try {
        let mutation, vars;
        const Lat = this.formData.Lat ? parseFloat(this.formData.Lat) : null;
        const Long = this.formData.Long ? parseFloat(this.formData.Long) : null;
        const WarehouseID = parseInt(this.formData.WarehouseID);

        if (this.isEditing) {
          mutation = `mutation UpdateStore($StoreID: Int!, $WarehouseID: Int, $StoreName: String, $Address: String, $Lat: Float, $Long: Float, $Type: String, $Status: String) { 
            updateStore(StoreID: $StoreID, WarehouseID: $WarehouseID, StoreName: $StoreName, Address: $Address, Lat: $Lat, Long: $Long, Type: $Type, Status: $Status) { StoreID } 
          }`;
          vars = { ...this.formData, Lat, Long, WarehouseID };
        } else {
          mutation = `mutation CreateStore($WarehouseID: Int!, $StoreName: String, $Address: String, $Lat: Float, $Long: Float, $Type: String, $Status: String) { 
            createStore(WarehouseID: $WarehouseID, StoreName: $StoreName, Address: $Address, Lat: $Lat, Long: $Long, Type: $Type, Status: $Status) { StoreID } 
          }`;
          vars = {
            WarehouseID, StoreName: this.formData.StoreName, Address: this.formData.Address,
            Lat, Long, Type: this.formData.Type, Status: this.formData.Status
          };
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        this.fetchStores();
      } catch (err) {
        this.modalError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteStore(StoreID) {
      if (!confirm('Are you sure you want to delete this store?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteStore($StoreID: Int!) { deleteStore(StoreID: $StoreID) }`;

      try {
        await graphqlRequest(mutation, { StoreID }, token);
        this.fetchStores();
      } catch (err) {
        alert(err.message);
      }
    },
    async cycleStatus(store, newStatus) {
      const token = localStorage.getItem('token');
      const mutation = `mutation UpdateStore($StoreID: Int!, $Status: String) { 
        updateStore(StoreID: $StoreID, Status: $Status) { StoreID Status } 
      }`;

      try {
        const oldStatus = store.Status;
        store.Status = newStatus; // Optimistic update
        await graphqlRequest(mutation, { StoreID: store.StoreID, Status: newStatus }, token);
      } catch (err) {
        alert('Failed to update status: ' + err.message);
        this.fetchStores(); // Reload on error
      }
    },
    async cycleWarehouseStatus() {
      if (this.stores.length === 0) return;
      this.cycling = true;
      const store = this.stores[0];
      const statuses = ['Active', 'Maintenance', 'Closed'];
      let nextIndex = (statuses.indexOf(store.Status || 'Active') + 1) % statuses.length;
      const newStatus = statuses[nextIndex];

      try {
        await this.cycleStatus(store, newStatus);
      } finally {
        this.cycling = false;
      }
    },
    async cycleSelectedWarehouseStatus() {
      if (!this.selectedWarehouseID) return;
      this.cycling = true;
      const warehouse = this.warehouses.find(w => w.WarehouseID === this.selectedWarehouseID);
      if (!warehouse) return;

      const statuses = ['Active', 'Maintenance', 'Closed'];
      let nextIndex = (statuses.indexOf(warehouse.Status || 'Active') + 1) % statuses.length;
      const newStatus = statuses[nextIndex];

      const token = localStorage.getItem('token');
      const mutation = `mutation UpdateWarehouse($WarehouseID: Int!, $Status: String) { 
        updateWarehouse(WarehouseID: $WarehouseID, Status: $Status) { WarehouseID Status } 
      }`;

      try {
        const oldStatus = warehouse.Status;
        warehouse.Status = newStatus; // Optimistic update
        await graphqlRequest(mutation, { WarehouseID: warehouse.WarehouseID, Status: newStatus }, token);

        // Also update all stores in this warehouse to match the status
        const bulkMutation = `mutation UpdateStoresStatus($WarehouseID: Int!, $Status: String!) {
          updateStoresStatusByWarehouse(WarehouseID: $WarehouseID, Status: $Status)
        }`;
        await graphqlRequest(bulkMutation, { WarehouseID: warehouse.WarehouseID, Status: newStatus }, token);

        this.fetchStores();
      } catch (err) {
        alert('Failed to update warehouse status: ' + err.message);
        this.fetchWarehouses();
      } finally {
        this.cycling = false;
      }
    },
    getSelectedWarehouseStatus() {
      if (!this.selectedWarehouseID) return 'N/A';
      const w = this.warehouses.find(wh => wh.WarehouseID === this.selectedWarehouseID);
      return w ? (w.Status || 'Active') : 'Active';
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminStores;
}
