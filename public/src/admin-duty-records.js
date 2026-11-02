// Admin Duty Records & Manager Punch-In Approval Component
const AdminDutyRecords = {
  template: `
    <div class="container-fluid my-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 class="mb-0 text-dark font-weight-bold">
            <i class="bi bi-clock-history text-primary"></i> Staff Duty Records & Manager Punch Approval
          </h3>
          <p class="text-muted small mb-0">
            Manager approves staff punch-in and issues a 4-digit security code. Employee enters this code in WMS to activate duty.
          </p>
        </div>
        <div>
          <router-link to="/admin" class="btn btn-outline-secondary btn-sm me-2">
            <i class="bi bi-arrow-left"></i> Back to Dashboard
          </router-link>
          <button @click="fetchDutyRecords" class="btn btn-primary btn-sm">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      <!-- Quick Metrics Counters -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-warning shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Pending Approvals</small>
                <h4 class="mb-0 text-warning font-weight-bold">{{ counts.pending }}</h4>
              </div>
              <i class="bi bi-hourglass-split text-warning fs-2"></i>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-info shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Awaiting WMS PIN</small>
                <h4 class="mb-0 text-info font-weight-bold">{{ counts.approved }}</h4>
              </div>
              <i class="bi bi-shield-lock text-info fs-2"></i>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-success shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Currently on Duty</small>
                <h4 class="mb-0 text-success font-weight-bold">{{ counts.active }}</h4>
              </div>
              <i class="bi bi-person-check text-success fs-2"></i>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-secondary shadow-sm">
            <div class="card-body py-2 px-3 d-flex justify-content-between align-items-center">
              <div>
                <small class="text-muted text-uppercase font-weight-bold">Completed Shifts</small>
                <h4 class="mb-0 text-secondary font-weight-bold">{{ counts.completed }}</h4>
              </div>
              <i class="bi bi-check-all text-secondary fs-2"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="row g-2 align-items-center">
            <div class="col-auto">
              <span class="small font-weight-bold text-muted">Filter Role:</span>
            </div>
            <div class="col-auto">
              <select v-model="selectedRole" @change="fetchDutyRecords" class="form-select form-select-sm">
                <option value="all">All Roles</option>
                <option value="picker">Picker</option>
                <option value="putter">Put-away / Loader</option>
                <option value="inward">Inward Associate</option>
                <option value="packer">Packer & Sorter</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div class="col-auto">
              <span class="small font-weight-bold text-muted">Status:</span>
            </div>
            <div class="col-auto">
              <select v-model="selectedStatus" @change="fetchDutyRecords" class="form-select form-select-sm">
                <option value="all">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved (Awaiting PIN Entry)</option>
                <option value="ACTIVE">Active (Duty ON)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Records Table -->
      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Shift Slot</th>
                  <th>Selfie / Biometric</th>
                  <th>Punch-In Time</th>
                  <th>Approval Status</th>
                  <th>4-Digit Approval Code</th>
                  <th>Manager Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="text-center py-4 text-muted">
                    <div class="spinner-border spinner-border-sm me-2"></div> Loading duty records...
                  </td>
                </tr>
                <tr v-else-if="records.length === 0">
                  <td colspan="8" class="text-center py-4 text-muted">
                    No duty records found for the selected filter.
                  </td>
                </tr>
                <tr v-for="rec in records" :key="rec.dutyId" :class="{'table-warning': rec.approvalStatus === 'PENDING_APPROVAL'}">
                  <td>
                    <div class="font-weight-bold">{{ rec.employeeName }}</div>
                    <small class="text-muted font-monospace">{{ rec.employeeMobile }}</small>
                  </td>
                  <td>
                    <span class="badge" :class="getRoleBadge(rec.employeeRole)">
                      {{ rec.employeeRole }}
                    </span>
                  </td>
                  <td>
                    <span class="badge bg-light text-dark border">
                      <i class="bi bi-sun"></i> {{ rec.shiftSlot }}
                    </span>
                  </td>
                  <td>
                    <div v-if="rec.selfieUrl">
                      <a :href="rec.selfieUrl" target="_blank">
                        <img :src="rec.selfieUrl" class="rounded-circle border" style="width: 38px; height: 38px; object-fit: cover;">
                      </a>
                    </div>
                    <div v-else class="text-muted small">
                      <i class="bi bi-person-bounding-box"></i> No Selfie
                    </div>
                  </td>
                  <td>
                    <div class="small font-monospace">{{ rec.punchInTime || 'Pending' }}</div>
                    <small class="text-muted">{{ formatDate(rec.date) }}</small>
                  </td>
                  <td>
                    <span class="badge" :class="getStatusBadge(rec.approvalStatus)">
                      {{ rec.approvalStatus }}
                    </span>
                    <div v-if="rec.approvedByName" class="small text-muted" style="font-size: 11px;">
                      By: {{ rec.approvedByName }}
                    </div>
                  </td>
                  <td>
                    <div v-if="rec.approvalCode" class="d-inline-flex align-items-center gap-1 bg-dark text-warning px-2.5 py-1 rounded font-monospace fw-bold fs-6 border border-warning shadow-sm">
                      <i class="bi bi-key-fill text-warning"></i> {{ rec.approvalCode }}
                    </div>
                    <span v-else class="text-muted small">Not Generated</span>
                  </td>
                  <td>
                    <!-- If Pending Approval, Show Approve Button -->
                    <div v-if="rec.approvalStatus === 'PENDING_APPROVAL'">
                      <button @click="openApproveModal(rec)" class="btn btn-sm btn-success font-weight-bold">
                        <i class="bi bi-check-circle"></i> Approve Punch-In (Get 4-Digit PIN)
                      </button>
                    </div>
                    <!-- If Approved & Awaiting Code, Show Code again -->
                    <div v-else-if="rec.approvalStatus === 'APPROVED'">
                      <div class="small text-info font-weight-bold">
                        <i class="bi bi-info-circle"></i> Tell Code: <span class="badge bg-warning text-dark">{{ rec.approvalCode }}</span>
                      </div>
                    </div>
                    <div v-else-if="rec.approvalStatus === 'ACTIVE'">
                      <span class="text-success small font-weight-bold"><i class="bi bi-circle-fill" style="font-size: 8px;"></i> Duty Active in WMS</span>
                    </div>
                    <div v-else class="text-muted small">
                      {{ rec.approvalStatus }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Approve Punch-In Modal -->
      <div class="modal fade" id="approveDutyModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title"><i class="bi bi-shield-check"></i> Approve Employee Punch-In</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" v-if="selectedDuty">
              <p class="mb-2">
                Approving punch-in for <strong>{{ selectedDuty.employeeName }}</strong> ({{ selectedDuty.employeeRole }}).
              </p>
              <div class="mb-3">
                <label class="form-label font-weight-bold small text-uppercase">4-Digit Security Code (Employee enters this in WMS to start duty):</label>
                <div class="input-group">
                  <input v-model="approvalModalCode" maxlength="4" class="form-control text-center font-monospace fs-4 fw-bold text-success" placeholder="e.g. 4821">
                  <button @click="generateRandomCode" class="btn btn-outline-secondary" type="button">
                    <i class="bi bi-shuffle"></i> Random 4-Digit
                  </button>
                </div>
                <small class="form-text text-muted">
                  Aap employee ko yeh 4-digit code denge. Employee isey WMS me daal kar apni duty chalu karega.
                </small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button @click="submitApproval" class="btn btn-success font-weight-bold">
                <i class="bi bi-check-lg"></i> Confirm & Issue 4-Digit Code
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      records: [],
      counts: { pending: 0, approved: 0, active: 0, completed: 0 },
      selectedRole: 'all',
      selectedStatus: 'all',
      loading: false,
      selectedDuty: null,
      approvalModalCode: '4821',
      modalInstance: null
    };
  },
  mounted() {
    this.fetchDutyRecords();
    const modalEl = document.getElementById('approveDutyModal');
    if (modalEl && window.bootstrap) {
      this.modalInstance = new bootstrap.Modal(modalEl);
    }
  },
  methods: {
    async fetchDutyRecords() {
      this.loading = true;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/admin/duty-records?role=${this.selectedRole}&status=${this.selectedStatus}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.success) {
          this.records = res.data.records;
          this.counts = res.data.counts;
        }
      } catch (err) {
        console.error('Error fetching duty records:', err);
      } finally {
        this.loading = false;
      }
    },
    generateRandomCode() {
      this.approvalModalCode = String(Math.floor(1000 + Math.random() * 9000));
    },
    openApproveModal(duty) {
      this.selectedDuty = duty;
      this.generateRandomCode();
      if (this.modalInstance) this.modalInstance.show();
    },
    async submitApproval() {
      if (!this.selectedDuty) return;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/duty-approve', {
          dutyId: this.selectedDuty.dutyId,
          customCode: this.approvalModalCode
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          alert(`✅ Punch-In Approved! Code [${res.data.approvalCode}] generated. Employee ko yeh 4-digit code dein.`);
          if (this.modalInstance) this.modalInstance.hide();
          this.fetchDutyRecords();
        }
      } catch (err) {
        alert('Error approving duty: ' + (err.response?.data?.error || err.message));
      }
    },
    getRoleBadge(role) {
      const r = (role || '').toLowerCase();
      if (r === 'picker') return 'bg-warning text-dark';
      if (r === 'manager') return 'bg-danger text-white';
      if (r === 'packer') return 'bg-primary text-white';
      if (r === 'putter') return 'bg-info text-dark';
      return 'bg-secondary text-white';
    },
    getStatusBadge(status) {
      if (status === 'PENDING_APPROVAL') return 'bg-warning text-dark';
      if (status === 'APPROVED') return 'bg-info text-dark';
      if (status === 'ACTIVE') return 'bg-success text-white';
      if (status === 'COMPLETED') return 'bg-secondary text-white';
      return 'bg-dark text-white';
    },
    formatDate(d) {
      if (!d) return '';
      return new Date(d).toLocaleDateString();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminDutyRecords;
}
