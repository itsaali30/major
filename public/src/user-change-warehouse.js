// User Change Warehouse Component
const UserChangeWarehouse = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow-lg border-0">
            <div class="card-header bg-primary text-white p-4">
              <h3 class="mb-0"><i class="bi bi-geo-alt-fill me-2"></i> Request Warehouse Change</h3>
              <p class="mb-0 mt-2 opacity-75">Submit a request to move to a different warehouse location.</p>
            </div>
            <div class="card-body p-4">
              <div v-if="loading" class="text-center my-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Loading available warehouses...</p>
              </div>
              
              <div v-else-if="error" class="alert alert-danger shadow-sm">
                <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
              </div>
              
              <div v-else-if="success" class="alert alert-success shadow-sm">
                <i class="bi bi-check-circle-fill me-2"></i> {{ success }}
                <div class="mt-2">
                  <router-link to="/profile" class="btn btn-success btn-sm">Back to Profile</router-link>
                </div>
              </div>

              <form @submit.prevent="submitRequest" v-else>
                <div class="mb-4">
                  <label class="form-label fw-bold">Current Warehouse</label>
                  <div class="p-3 bg-light rounded border">
                    <i class="bi bi-building me-2"></i> {{ currentWarehouseName || 'Not Assigned' }}
                  </div>
                </div>

                <div class="mb-4">
                  <label class="form-label fw-bold">Select New Warehouse</label>
                  <select class="form-select form-select-lg" v-model="selectedWarehouseID" required>
                    <option value="" disabled>-- Select a Warehouse --</option>
                    <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">
                      {{ w.Name }} - {{ w.Type }}
                    </option>
                  </select>
                </div>

                <div class="mb-4">
                  <label class="form-label fw-bold">Reason for Change</label>
                  <textarea class="form-control" v-model="reason" rows="3" placeholder="Please provide a brief reason for your move request..." required></textarea>
                </div>

                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-primary btn-lg" :disabled="submitting || !selectedWarehouseID">
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                    {{ submitting ? 'Submitting Request...' : 'Submit Request' }}
                  </button>
                  <router-link to="/profile" class="btn btn-outline-secondary">Cancel</router-link>
                </div>
              </form>

              <hr class="my-5">
              
              <h4 class="mb-3">Your Recent Requests</h4>
              <div v-if="requests.length === 0" class="text-muted italic">No recent requests found.</div>
              <div v-else class="list-group">
                <div v-for="req in requests" :key="req.RequestID" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                  <div>
                    <div class="fw-bold">To: {{ getWarehouseName(req.NewLocationID) }}</div>
                    <small class="text-muted">Requested on: {{ formatDate(req.RequestedAt) }}</small>
                  </div>
                  <span class="badge rounded-pill" :class="getStatusClass(req.Status)">
                    {{ req.Status.toUpperCase() }}
                  </span>
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
      warehouses: [], requests: [],
      loading: true, submitting: false, error: null, success: null,
      selectedWarehouseID: '', reason: '',
      currentWarehouseName: 'Loading...',
      userRole: null
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
      this.loading = true;
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) { this.$router.push('/login'); return; }
      this.userRole = user.Role;

      try {
        await Promise.all([
          this.fetchWarehouses(),
          this.fetchMyRequests(),
          this.fetchCurrentWarehouse()
        ]);
      } catch (err) {
        this.error = "Error initializing: " + err.message;
      } finally {
        this.loading = false;
      }
    },
    async fetchWarehouses() {
      const token = localStorage.getItem('token');
      const query = `query { allWarehouses { WarehouseID Name Type } }`;
      const data = await graphqlRequest(query, {}, token);
      this.warehouses = data.allWarehouses;
    },
    async fetchMyRequests() {
      const token = localStorage.getItem('token');
      const query = `query { myLocationChangeRequests { RequestID NewLocationID Type Status RequestedAt Reason } }`;
      const data = await graphqlRequest(query, {}, token);
      this.requests = data.myLocationChangeRequests;
    },
    async fetchCurrentWarehouse() {
      const token = localStorage.getItem('token');
      const query = `query { me { CurrentWarehouseName } }`;
      const data = await graphqlRequest(query, {}, token);
      this.currentWarehouseName = data.me.CurrentWarehouseName;
    },
    async submitRequest() {
      this.submitting = true; this.error = null;
      const token = localStorage.getItem('token');
      const mutation = `mutation RequestLocationChange($NewLocationID: Int!, $Type: String!, $Reason: String) {
        requestLocationChange(NewLocationID: $NewLocationID, Type: $Type, Reason: $Reason) { RequestID Status }
      }`;
      
      try {
        await graphqlRequest(mutation, {
          NewLocationID: parseInt(this.selectedWarehouseID),
          Type: 'warehouse',
          Reason: this.reason
        }, token);
        this.success = "Your warehouse change request has been submitted and is pending approval.";
        this.fetchMyRequests();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.submitting = false;
      }
    },
    getWarehouseName(id) {
      const w = this.warehouses.find(x => x.WarehouseID === id);
      return w ? w.Name : `Warehouse #${id}`;
    },
    getStatusClass(status) {
      return {
        'bg-warning text-dark': status === 'pending',
        'bg-success': status === 'approved',
        'bg-danger': status === 'rejected'
      };
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserChangeWarehouse;
}
