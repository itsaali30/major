// Admin Warehouses Component
const AdminWarehouses = {
  template: `
    <div class="container my-5">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-building"></i> {{ ($root.isManager || $root.isIncharge) ? 'Warehouse Monitor' : 'Manage Warehouses' }}</h4>
              <div>
                <button v-if="!$root.isManager && !$root.isIncharge" class="btn btn-success btn-sm me-2" @click="openCreateModal"><i class="bi bi-plus-circle"></i> Add Warehouse</button>
                
                <!-- Status Cycle Button (Beside Back) -->
                <button v-if="warehouses.length > 0 && ($root.isManager || $root.isAdmin || $root.isSuperadmin || ($root.currentUser && ['accountmanager', 'cluster'].includes($root.currentUser.Role)))" 
                  class="btn btn-sm me-2 shadow-sm border text-white btn-success" 
                  @click="cycleGlobalStatus"
                  :disabled="cycling">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  {{ warehouses[0].Status || 'Active' }}
                </button>

                <router-link to="/admin" class="btn btn-light btn-sm"><i class="bi bi-arrow-left"></i> Back</router-link>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else-if="warehouses.length === 0" class="alert alert-info">
                No warehouses found. {{ $root.isManager ? '' : 'Click "Add Warehouse" to create one.' }}
              </div>
              <div v-else class="table-responsive">
                <table class="table table-striped table-hover">
                  <thead class="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Contact</th>
                      <th>Status (Quick Toggle)</th>
                      <th>Address</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="w in warehouses" :key="w.WarehouseID" @click="goToStores(w.WarehouseID)" style="cursor: pointer;">
                      <td>{{ w.WarehouseID }}</td>
                      <td><strong>{{ w.Name }}</strong></td>
                      <td><span class="badge bg-secondary">{{ w.Type || 'Standard' }}</span></td>
                      <td>{{ w.Contact || 'N/A' }}</td>
                      <td>
                        <span class="badge" :class="w.Status === 'Active' ? 'bg-success' : (w.Status === 'Maintenance' ? 'bg-info' : 'bg-warning text-dark')">
                          {{ w.Status || 'Active' }}
                        </span>
                      </td>
                      <td>{{ cutText(w.Address, 30) }}</td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-info" @click.stop="editWarehouse(w)" :title="($root.isManager || $root.isIncharge) ? 'Edit Status' : 'Edit'"><i class="bi bi-pencil"></i></button>
                          <button v-if="!$root.isManager && !$root.isIncharge" class="btn btn-danger" @click.stop="deleteWarehouse(w.WarehouseID)" title="Delete"><i class="bi bi-trash"></i></button>
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
      <div class="modal fade" id="warehouseModal" tabindex="-1" ref="warehouseModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title"><i class="bi" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i> {{ isEditing ? (($root.isManager || $root.isIncharge) ? 'Edit Status' : 'Edit Warehouse') : 'Add Warehouse' }}</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>
              <form @submit.prevent="saveWarehouse">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Warehouse Name *</label>
                    <input type="text" class="form-control" v-model="formData.Name" :disabled="$root.isManager || $root.isIncharge" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Contact Number</label>
                    <input type="text" class="form-control" v-model="formData.Contact" :disabled="$root.isManager || $root.isIncharge">
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Type</label>
                    <select class="form-select" v-model="formData.Type" :disabled="$root.isManager || $root.isIncharge">
                      <option value="Main">Main Hub</option>
                      <option value="Standard">Standard</option>
                      <option value="Cold">Cold Storage</option>
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
                  <textarea class="form-control" v-model="formData.Address" rows="2" :disabled="$root.isManager || $root.isIncharge"></textarea>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Latitude</label>
                    <input type="number" step="any" class="form-control" v-model="formData.Lat" :disabled="$root.isManager || $root.isIncharge">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Longitude</label>
                    <input type="number" step="any" class="form-control" v-model="formData.Long" :disabled="$root.isManager || $root.isIncharge">
                  </div>
                </div>
                <div class="text-end mt-3">
                  <button type="button" class="btn btn-secondary me-2" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-primary" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ saving ? 'Saving...' : 'Save Changes' }}
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
      warehouses: [],
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
  mounted() {
    // Restrict access to admin and superadmin only
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.Role !== 'admin' && user.Role !== 'superadmin') {
      this.$router.push('/admin');
      return;
    }
    this.fetchWarehouses();
    this.modalInstance = new bootstrap.Modal(this.$refs.warehouseModal, { backdrop: 'static' });
  },
  methods: {
    async quickToggle(warehouse, newStatus) {
      const oldStatus = warehouse.Status;
      const token = localStorage.getItem('token');
      const mutation = `mutation UpdateWarehouse($WarehouseID: Int!, $Status: String) { 
        updateWarehouse(WarehouseID: $WarehouseID, Status: $Status) { WarehouseID Status } 
      }`;
      
      try {
        warehouse.Status = newStatus; // Optimistic update
        await graphqlRequest(mutation, { WarehouseID: warehouse.WarehouseID, Status: newStatus }, token);
      } catch (err) {
        warehouse.Status = oldStatus; // Rollback
        alert('Failed to update status: ' + err.message);
      }
    },
    async cycleGlobalStatus() {
      if (this.warehouses.length === 0) return;
      this.cycling = true;
      const warehouse = this.warehouses[0];
      const statuses = ['Active', 'Maintenance', 'Closed'];
      let nextIndex = (statuses.indexOf(warehouse.Status || 'Active') + 1) % statuses.length;
      const newStatus = statuses[nextIndex];
      
      try {
        await this.quickToggle(warehouse, newStatus);
      } finally {
        this.cycling = false;
      }
    },
    goToStores(WarehouseID) {
      this.$router.push({ path: '/admin/stores', query: { warehouseID: WarehouseID } });
    },
    getEmptyForm() {
      return { WarehouseID: null, Name: '', Contact: '', Type: 'Standard', Status: 'Active', Address: '', Lat: '', Long: '' };
    },
    cutText(text, length) {
      if (!text) return 'N/A';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },
    async fetchWarehouses() {
      this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      const query = `query { allWarehouses { WarehouseID Name Type Contact Status Address Lat Long CreatedAt } }`;
      
      try {
        const data = await graphqlRequest(query, {}, token);
        this.warehouses = data.allWarehouses;
      } catch (err) {
        this.error = err.message;
        if (err.message.includes('authorized')) this.$router.push('/');
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
    editWarehouse(warehouse) {
      this.isEditing = true;
      this.formData = { ...warehouse };
      this.modalError = null;
      this.modalInstance.show();
    },
    closeModal() {
      this.modalInstance.hide();
    },
    async saveWarehouse() {
      this.saving = true;
      this.modalError = null;
      const token = localStorage.getItem('token');
      
      try {
        let mutation, vars;
        
        // Parse floats if provided
        const Lat = this.formData.Lat ? parseFloat(this.formData.Lat) : null;
        const Long = this.formData.Long ? parseFloat(this.formData.Long) : null;

        if (this.isEditing) {
          mutation = `mutation UpdateWarehouse($WarehouseID: Int!, $Name: String, $Address: String, $Lat: Float, $Long: Float, $Contact: String, $Type: String, $Status: String) { 
            updateWarehouse(WarehouseID: $WarehouseID, Name: $Name, Address: $Address, Lat: $Lat, Long: $Long, Contact: $Contact, Type: $Type, Status: $Status) { WarehouseID } 
          }`;
          vars = { ...this.formData, Lat, Long };
        } else {
          mutation = `mutation CreateWarehouse($Name: String, $Address: String, $Lat: Float, $Long: Float, $Contact: String, $Type: String, $Status: String) { 
            createWarehouse(Name: $Name, Address: $Address, Lat: $Lat, Long: $Long, Contact: $Contact, Type: $Type, Status: $Status) { WarehouseID } 
          }`;
          vars = { 
            Name: this.formData.Name, Address: this.formData.Address,
            Lat, Long, Contact: this.formData.Contact, 
            Type: this.formData.Type, Status: this.formData.Status 
          };
        }

        await graphqlRequest(mutation, vars, token);
        this.closeModal();
        this.fetchWarehouses();
      } catch (err) {
        this.modalError = err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteWarehouse(WarehouseID) {
      if (!confirm('Are you sure you want to delete this warehouse?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteWarehouse($WarehouseID: Int!) { deleteWarehouse(WarehouseID: $WarehouseID) }`;
      
      try {
        await graphqlRequest(mutation, { WarehouseID }, token);
        this.fetchWarehouses();
      } catch (err) {
        alert(err.message);
      }
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminWarehouses;
}
