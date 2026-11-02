// Admin Staff Payout Records Component (Superadmin & Manager Separate Views)
const AdminPayouts = {
  template: `
    <div class="container-fluid my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 class="mb-0 text-dark font-weight-bold">
            <i class="bi bi-wallet2 text-success"></i> Staff Payout Management
          </h3>
          <p class="text-muted small mb-0">
            Superadmin & Manager view with separate role-based tabs for Picker Payouts, Manager Payouts, and Staff Payouts.
          </p>
        </div>
        <div>
          <router-link to="/admin" class="btn btn-outline-secondary btn-sm me-2">
            <i class="bi bi-arrow-left"></i> Back to Dashboard
          </router-link>
          <button @click="openCreatePayoutModal" class="btn btn-success btn-sm me-2">
            <i class="bi bi-plus-circle"></i> Create Payout
          </button>
          <button @click="fetchPayouts" class="btn btn-primary btn-sm">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Financial Metric Cards (Separate for Superadmin) -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card bg-dark text-white shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-white-50 text-uppercase font-weight-bold">Total Payout Budget</small>
                <h4 class="mb-0 font-weight-bold text-white">₹{{ stats.grandTotal?.toLocaleString() || 0 }}</h4>
              </div>
              <i class="bi bi-cash-stack text-warning fs-2"></i>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-warning shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Picker Total Payouts</small>
                <h4 class="mb-0 text-warning font-weight-bold">₹{{ stats.pickerTotal?.toLocaleString() || 0 }}</h4>
              </div>
              <i class="bi bi-hand-index-thumb text-warning fs-2"></i>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-danger shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Manager Total Payouts</small>
                <h4 class="mb-0 text-danger font-weight-bold">₹{{ stats.managerTotal?.toLocaleString() || 0 }}</h4>
              </div>
              <i class="bi bi-person-badge text-danger fs-2"></i>
            </div>
          </div>
        </div>

        <div class="col-md-3">
          <div class="card border-success shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Pending Disbursements</small>
                <h4 class="mb-0 text-success font-weight-bold">{{ stats.pendingCount || 0 }} Records</h4>
              </div>
              <i class="bi bi-clock text-success fs-2"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Role Separation Tabs -->
      <ul class="nav nav-pills mb-3 bg-white p-2 rounded shadow-sm border">
        <li class="nav-item">
          <button class="nav-link font-weight-bold" :class="{'active bg-warning text-dark': activeRoleTab === 'picker'}" @click="setTab('picker')">
            <i class="bi bi-hand-index-thumb"></i> 🎯 Picker Payouts (Orders & Shifts)
          </button>
        </li>
        <li class="nav-item ms-2">
          <button class="nav-link font-weight-bold" :class="{'active bg-danger text-white': activeRoleTab === 'manager'}" @click="setTab('manager')">
            <i class="bi bi-shield-lock"></i> 🧑‍💼 Manager Payouts (Supervisor Salary)
          </button>
        </li>
        <li class="nav-item ms-2">
          <button class="nav-link font-weight-bold" :class="{'active bg-primary text-white': activeRoleTab === 'all'}" @click="setTab('all')">
            <i class="bi bi-people"></i> All Warehouse Staff Payouts
          </button>
        </li>
      </ul>

      <!-- Payouts Table -->
      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Completed Shifts</th>
                  <th>Total Hours</th>
                  <th>Base Pay (₹)</th>
                  <th>Incentives / Bonus (₹)</th>
                  <th>Total Payout (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="9" class="text-center py-4 text-muted">
                    <div class="spinner-border spinner-border-sm me-2"></div> Loading payouts...
                  </td>
                </tr>
                <tr v-else-if="filteredPayouts.length === 0">
                  <td colspan="9" class="text-center py-4 text-muted">
                    No payout records found in this category.
                  </td>
                </tr>
                <tr v-for="p in filteredPayouts" :key="p.payoutId">
                  <td>
                    <div class="font-weight-bold">{{ p.employeeName }}</div>
                    <small class="text-muted font-monospace">{{ p.employeeMobile }}</small>
                  </td>
                  <td>
                    <span class="badge" :class="p.role === 'manager' ? 'bg-danger' : (p.role === 'picker' ? 'bg-warning text-dark' : 'bg-primary')">
                      {{ p.role }}
                    </span>
                  </td>
                  <td>
                    <span class="badge bg-light text-dark border">{{ p.totalShifts }} Shifts</span>
                  </td>
                  <td class="font-monospace text-muted">{{ p.totalHours }} hrs</td>
                  <td class="font-monospace">₹{{ p.basePay?.toLocaleString() }}</td>
                  <td class="font-monospace text-success font-weight-bold">+₹{{ p.incentive?.toLocaleString() }}</td>
                  <td>
                    <div class="fs-6 font-weight-bold text-dark font-monospace">
                      ₹{{ p.totalAmount?.toLocaleString() }}
                    </div>
                  </td>
                  <td>
                    <span class="badge" :class="p.status === 'PAID' ? 'bg-success text-white' : 'bg-warning text-dark'">
                      {{ p.status }}
                    </span>
                    <div v-if="p.paymentRef" class="small text-muted font-monospace" style="font-size: 11px;">
                      {{ p.paymentRef }}
                    </div>
                  </td>
                  <td>
                    <button v-if="p.status !== 'PAID'" @click="openPayModal(p)" class="btn btn-sm btn-outline-success font-weight-bold">
                      <i class="bi bi-check2-circle"></i> Mark Paid
                    </button>
                    <span v-else class="text-success small font-weight-bold">
                      <i class="bi bi-patch-check-fill"></i> Paid on {{ formatDate(p.paidAt) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Mark as Paid Modal -->
      <div class="modal fade" id="payModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title"><i class="bi bi-wallet2"></i> Process Staff Payment</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" v-if="selectedPayout">
              <p>
                Marking payout of <strong class="fs-5 text-success">₹{{ selectedPayout.totalAmount?.toLocaleString() }}</strong> for <strong>{{ selectedPayout.employeeName }}</strong> ({{ selectedPayout.role }}).
              </p>
              <div class="mb-3">
                <label class="form-label small font-weight-bold text-uppercase">Payment Method:</label>
                <select v-model="payForm.paymentMethod" class="form-select form-select-sm">
                  <option value="BANK_TRANSFER">Bank NEFT / IMPS Transfer</option>
                  <option value="UPI">UPI Direct (GPay / PhonePe)</option>
                  <option value="CASH">Cash in Hand (Store Petty Cash)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label small font-weight-bold text-uppercase">Transaction / UTR Reference #:</label>
                <input v-model="payForm.paymentRef" class="form-control form-control-sm font-monospace" placeholder="e.g. UTR-9988224411">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button @click="submitMarkPaid" class="btn btn-success btn-sm font-weight-bold">
                Confirm Payment & Update Record
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Custom Payout Modal -->
      <div class="modal fade" id="createPayoutModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Create Staff Payout Entry</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2">
                <label class="form-label small font-weight-bold">Staff Role:</label>
                <select v-model="newPayout.role" class="form-select form-select-sm">
                  <option value="picker">Picker</option>
                  <option value="manager">Manager</option>
                  <option value="packer">Packer</option>
                  <option value="putter">Put-away Associate</option>
                </select>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="form-label small font-weight-bold">Base Pay (₹):</label>
                  <input v-model="newPayout.basePay" type="number" class="form-control form-control-sm" placeholder="18000">
                </div>
                <div class="col-6">
                  <label class="form-label small font-weight-bold">Incentive / Bonus (₹):</label>
                  <input v-model="newPayout.incentive" type="number" class="form-control form-control-sm" placeholder="3000">
                </div>
              </div>
              <div class="row g-2 mb-2">
                <div class="col-6">
                  <label class="form-label small font-weight-bold">Total Shifts:</label>
                  <input v-model="newPayout.totalShifts" type="number" class="form-control form-control-sm" placeholder="24">
                </div>
                <div class="col-6">
                  <label class="form-label small font-weight-bold">Total Hours:</label>
                  <input v-model="newPayout.totalHours" type="number" class="form-control form-control-sm" placeholder="192">
                </div>
              </div>
              <div class="mb-2">
                <label class="form-label small font-weight-bold">Notes / Reason:</label>
                <input v-model="newPayout.notes" class="form-control form-control-sm" placeholder="e.g. Monthly Attendance & Picking Incentive">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button @click="submitCreatePayout" class="btn btn-primary btn-sm font-weight-bold">Create Payout</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      payouts: [],
      stats: {},
      activeRoleTab: 'picker',
      loading: false,
      selectedPayout: null,
      payForm: { paymentMethod: 'BANK_TRANSFER', paymentRef: '' },
      newPayout: { role: 'picker', basePay: 18000, incentive: 3500, totalShifts: 24, totalHours: 192, notes: '' },
      payModalInstance: null,
      createModalInstance: null
    };
  },
  computed: {
    filteredPayouts() {
      if (this.activeRoleTab === 'all') return this.payouts;
      return this.payouts.filter(p => p.role.toLowerCase() === this.activeRoleTab.toLowerCase());
    }
  },
  mounted() {
    this.fetchPayouts();
    const payEl = document.getElementById('payModal');
    if (payEl && window.bootstrap) this.payModalInstance = new bootstrap.Modal(payEl);
    const crEl = document.getElementById('createPayoutModal');
    if (crEl && window.bootstrap) this.createModalInstance = new bootstrap.Modal(crEl);
  },
  methods: {
    setTab(tab) {
      this.activeRoleTab = tab;
    },
    async fetchPayouts() {
      this.loading = true;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/admin/payouts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          this.payouts = res.data.payouts;
          this.stats = res.data.stats;
        }
      } catch (err) {
        console.error('Error fetching payouts:', err);
      } finally {
        this.loading = false;
      }
    },
    openPayModal(payout) {
      this.selectedPayout = payout;
      this.payForm.paymentRef = `TXN-${Date.now().toString().slice(-8)}`;
      if (this.payModalInstance) this.payModalInstance.show();
    },
    async submitMarkPaid() {
      if (!this.selectedPayout) return;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/payout-pay', {
          payoutId: this.selectedPayout.payoutId,
          paymentMethod: this.payForm.paymentMethod,
          paymentRef: this.payForm.paymentRef
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          alert('✅ Payment marked as PAID successfully.');
          if (this.payModalInstance) this.payModalInstance.hide();
          this.fetchPayouts();
        }
      } catch (err) {
        alert('Error updating payment: ' + (err.response?.data?.error || err.message));
      }
    },
    openCreatePayoutModal() {
      if (this.createModalInstance) this.createModalInstance.show();
    },
    async submitCreatePayout() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/payout-create', {
          userId: 1,
          ...this.newPayout
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          alert('✅ Payout record created.');
          if (this.createModalInstance) this.createModalInstance.hide();
          this.fetchPayouts();
        }
      } catch (err) {
        alert('Error creating payout: ' + (err.response?.data?.error || err.message));
      }
    },
    formatDate(d) {
      if (!d) return '';
      return new Date(d).toLocaleDateString();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminPayouts;
}
