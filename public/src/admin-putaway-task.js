// Admin Putaway Tasks Component
const AdminPutawayTask = {
  template: `
    <div class="container my-4">
      <!-- Breadcrumb / Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb mb-1">
              <li class="breadcrumb-item"><router-link to="/admin">Dashboard</router-link></li>
              <li class="breadcrumb-item active" aria-current="page">Putaway Tasks</li>
            </ol>
          </nav>
          <h3 class="fw-bold mb-0 text-dark">
            <i class="bi bi-box-arrow-in-down text-primary me-2"></i> Putaway Tasks Log
          </h3>
          <p class="text-muted small mb-0">Floor se Shelf pe rakhe gaye stock ka complete audit log (Row-wise details)</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm fw-bold shadow-sm" @click="fetchTasks" :disabled="loading">
            <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
          </button>
          <router-link to="/admin" class="btn btn-secondary btn-sm">
            <i class="bi bi-arrow-left me-1"></i> Back
          </router-link>
        </div>
      </div>

      <!-- Stats Summary Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 bg-light">
            <small class="text-muted fw-bold text-uppercase">Total Putaways</small>
            <h4 class="fw-bold text-primary mb-0">{{ tasks.length }}</h4>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 bg-light">
            <small class="text-muted fw-bold text-uppercase">Total Units Moved</small>
            <h4 class="fw-bold text-success mb-0">{{ totalUnitsMoved }}</h4>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 bg-light">
            <small class="text-muted fw-bold text-uppercase">Active Putters</small>
            <h4 class="fw-bold text-info mb-0">{{ uniquePickersCount }}</h4>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm p-3 bg-light">
            <small class="text-muted fw-bold text-uppercase">Floor Out-Shelves</small>
            <h4 class="fw-bold text-warning mb-0">{{ uniqueOutShelvesCount }}</h4>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-3">
          <div class="row g-2 align-items-center">
            <div class="col-md-6">
              <div class="input-group input-group-sm">
                <span class="input-group-text bg-white"><i class="bi bi-search text-muted"></i></span>
                <input v-model="searchQuery" class="form-control" placeholder="Search by Item Name, SKU, Picker ID, In-Shelf or Out-Shelf...">
              </div>
            </div>
            <div class="col-md-3">
              <select v-model="filterOutShelf" class="form-select form-select-sm">
                <option value="">All Out-Shelves</option>
                <option v-for="s in outShelvesList" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="col-md-3 text-end">
              <span class="badge bg-secondary-subtle text-secondary border px-3 py-2 small">
                Showing {{ filteredTasks.length }} of {{ tasks.length }} rows
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks Log Table (Row Vise Display) -->
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-2.5">
          <h6 class="mb-0 fw-bold"><i class="bi bi-list-columns-reverse me-2"></i> Putaway Movements (Floor to Shelf)</h6>
          <span class="badge bg-success">Live Sync Active</span>
        </div>
        <div class="card-body p-0">
          <div v-if="loading && tasks.length === 0" class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2 small">Loading putaway tasks...</p>
          </div>

          <div v-else-if="filteredTasks.length === 0" class="text-center py-5 text-muted">
            <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
            <h6 class="fw-bold">No Putaway Tasks Found</h6>
            <p class="small mb-0">WMS me se Floor items ko dark store shelves par putaway karein.</p>
          </div>

          <div v-else class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light small">
                <tr>
                  <th class="ps-3" style="width: 50px;">#</th>
                  <th>Picker : ID</th>
                  <th>Time</th>
                  <th>Out-Shelf</th>
                  <th>In-Shelf</th>
                  <th>Item-ID</th>
                  <th>Item-Name</th>
                  <th class="text-center pe-3">Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, idx) in filteredTasks" :key="t.movementId || idx">
                  <!-- Row Number -->
                  <td class="ps-3 text-muted small">{{ idx + 1 }}</td>

                  <!-- Picker ID / Staff -->
                  <td>
                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1.5 fw-bold font-monospace">
                      <i class="bi bi-person-fill me-1"></i> ID #{{ t.pickerId }}
                    </span>
                    <div class="x-small text-muted mt-0.5" v-if="t.staffName">{{ t.staffName }}</div>
                  </td>

                  <!-- Time -->
                  <td class="small text-nowrap">
                    <div class="fw-bold text-dark">{{ formatDate(t.time) }}</div>
                    <div class="x-small text-muted">{{ formatTime(t.time) }}</div>
                  </td>

                  <!-- Out-Shelf (Floor) -->
                  <td>
                    <span class="badge bg-warning-subtle text-warning-emphasis border border-warning px-2.5 py-1.5 fw-bold font-monospace">
                      <i class="bi bi-box-arrow-up-right me-1"></i> {{ t.outShelf || 'FL01' }}
                    </span>
                  </td>

                  <!-- In-Shelf (Target Shelf) -->
                  <td>
                    <span class="badge bg-success-subtle text-success-emphasis border border-success px-2.5 py-1.5 fw-bold font-monospace">
                      <i class="bi bi-geo-alt-fill me-1"></i> {{ t.inShelf || 'N/A' }}
                    </span>
                  </td>

                  <!-- Item ID -->
                  <td>
                    <span class="badge bg-light text-dark border px-2 py-1 font-monospace">
                      #{{ t.itemId }}
                    </span>
                  </td>

                  <!-- Item Name -->
                  <td>
                    <div class="fw-bold text-dark small">{{ t.itemName }}</div>
                    <div class="x-small text-muted font-monospace" v-if="t.sku">SKU: {{ t.sku }}</div>
                  </td>

                  <!-- Qty -->
                  <td class="text-center pe-3">
                    <span class="badge bg-success fs-6 fw-bold px-3 py-1.5">
                      {{ t.qty }} {{ t.unit || 'Units' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      tasks: [],
      loading: false,
      searchQuery: '',
      filterOutShelf: '',
      pollInterval: null
    };
  },
  computed: {
    totalUnitsMoved() {
      return this.tasks.reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
    },
    uniquePickersCount() {
      const set = new Set(this.tasks.map(t => t.pickerId).filter(Boolean));
      return set.size;
    },
    uniqueOutShelvesCount() {
      const set = new Set(this.tasks.map(t => t.outShelf).filter(Boolean));
      return set.size;
    },
    outShelvesList() {
      const set = new Set(this.tasks.map(t => t.outShelf).filter(Boolean));
      return Array.from(set);
    },
    filteredTasks() {
      let list = this.tasks;
      if (this.filterOutShelf) {
        list = list.filter(t => t.outShelf === this.filterOutShelf);
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase().trim();
        list = list.filter(t => {
          return (
            String(t.pickerId).toLowerCase().includes(q) ||
            String(t.itemId).toLowerCase().includes(q) ||
            (t.itemName || '').toLowerCase().includes(q) ||
            (t.sku || '').toLowerCase().includes(q) ||
            (t.outShelf || '').toLowerCase().includes(q) ||
            (t.inShelf || '').toLowerCase().includes(q) ||
            (t.staffName || '').toLowerCase().includes(q)
          );
        });
      }
      return list;
    }
  },
  async mounted() {
    await this.fetchTasks();
    // Auto refresh every 8 seconds for real-time monitoring
    this.pollInterval = setInterval(() => {
      this.fetchTasks(true);
    }, 8000);
  },
  beforeUnmount() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  },
  methods: {
    async fetchTasks(isSilent = false) {
      if (!isSilent) this.loading = true;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/putaway-tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          this.tasks = data.tasks;
        }
      } catch (err) {
        console.warn('Failed to fetch putaway tasks:', err);
      } finally {
        if (!isSilent) this.loading = false;
      }
    },
    formatDate(d) {
      if (!d) return 'N/A';
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatTime(d) {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminPutawayTask;
}
