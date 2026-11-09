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

      <!-- Filters & Grouping Row -->
      <div class="card shadow-sm mb-3">
        <div class="card-body py-2">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div class="d-flex align-items-center gap-2">
              <span class="small font-weight-bold text-muted">Filter Role:</span>
              <select v-model="selectedRole" @change="fetchDutyRecords" class="form-select form-select-sm" style="width: auto;">
                <option value="all">All Roles</option>
                <option value="picker">Picker</option>
                <option value="putter">Put-away / Loader</option>
                <option value="inward">Inward Associate</option>
                <option value="packer">Packer & Sorter</option>
                <option value="manager">Manager</option>
              </select>

              <span class="small font-weight-bold text-muted ms-2">Status:</span>
              <select v-model="selectedStatus" @change="fetchDutyRecords" class="form-select form-select-sm" style="width: auto;">
                <option value="all">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved (Awaiting PIN Entry)</option>
                <option value="ACTIVE">Active (Duty ON)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div class="text-muted small">
              <i class="bi bi-info-circle text-primary"></i>
              <strong>Tip:</strong> Har employee ka 1 single unique row hai. Kisi bhi <strong>row pe click karein</strong> taaki us employee ki complete shift details breakdown dikhe.
            </div>
          </div>
        </div>
      </div>

      <!-- Records Table (Deduplicated Unique Employee Rows) -->
      <div class="card shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Current Shift</th>
                  <th>Selfie / Biometric</th>
                  <th>Punch-In Time</th>
                  <th>Status</th>
                  <th>Approval PIN</th>
                  <th class="text-end pe-4">Manager Action</th>
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
                    No staff records found for the selected filter.
                  </td>
                </tr>
                <tr v-for="rec in records" :key="rec.userId"
                    @click="goToDetails(rec)"
                    class="cursor-pointer"
                    :class="{'table-warning': rec.approvalStatus === 'PENDING_APPROVAL', 'table-success-subtle': rec.approvalStatus === 'ACTIVE'}"
                    style="cursor: pointer;">
                  <td>
                    <div class="d-flex align-items-center gap-2">
                      <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-center font-weight-bold"
                           style="width: 36px; height: 36px; min-width: 36px; font-size: 14px; text-transform: uppercase;">
                        {{ rec.employeeName ? rec.employeeName.charAt(0) : 'E' }}
                      </div>
                      <div>
                        <div class="font-weight-bold text-dark d-flex align-items-center gap-1.5">
                          {{ rec.employeeName }}
                          <span v-if="rec.totalShifts && rec.totalShifts > 1" class="badge bg-secondary-subtle text-secondary border px-1.5 py-0.5 rounded-pill" style="font-size: 10px;">
                            {{ rec.totalShifts }} records
                          </span>
                        </div>
                        <small class="text-muted font-monospace">{{ rec.employeeMobile }}</small>
                      </div>
                    </div>
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
                    <div v-if="rec.selfieUrl" @click.stop>
                      <a :href="rec.selfieUrl" target="_blank" title="View Full Selfie Photo">
                        <img :src="rec.selfieUrl" class="rounded-circle border shadow-sm" style="width: 36px; height: 36px; object-fit: cover;">
                      </a>
                    </div>
                    <div v-else class="text-muted small">
                      <i class="bi bi-person-bounding-box"></i> No Selfie
                    </div>
                  </td>
                  <td>
                    <div class="small font-monospace font-weight-bold">{{ rec.punchInTime || 'Pending' }}</div>
                    <small class="text-muted" style="font-size: 11px;">{{ formatDate(rec.date) }}</small>
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
                  <td class="text-end pe-3" @click.stop>
                    <div class="d-inline-flex align-items-center gap-1.5">
                      <!-- Primary Quick Action -->
                      <button v-if="rec.approvalStatus === 'PENDING_APPROVAL'"
                              @click="openApproveModal(rec)"
                              class="btn btn-sm btn-success font-weight-bold shadow-sm">
                        <i class="bi bi-check-circle"></i> Approve PIN
                      </button>

                      <button v-else-if="rec.approvalStatus === 'APPROVED'"
                              @click="openApproveModal(rec)"
                              class="btn btn-sm btn-outline-info font-weight-bold">
                        PIN: {{ rec.approvalCode }}
                      </button>

                      <button v-else-if="rec.approvalStatus === 'ACTIVE'"
                              @click="goToDetails(rec)"
                              class="btn btn-sm btn-outline-success font-weight-bold">
                        <i class="bi bi-person-check-fill"></i> Duty Active
                      </button>

                      <button v-else
                              @click="goToDetails(rec)"
                              class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-eye"></i> Details
                      </button>

                      <!-- 3-Dot Dropdown Menu (checkout, forcecheckin, id-terminate, id-disable, id-active) -->
                      <div class="dropdown d-inline-block">
                        <button class="btn btn-sm btn-light border dropdown-toggle dropdown-toggle-split px-2"
                                type="button"
                                :id="'dropdownMenu_' + rec.userId"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                title="More Actions">
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm" :aria-labelledby="'dropdownMenu_' + rec.userId">
                          <li>
                            <h6 class="dropdown-header text-uppercase font-weight-bold" style="font-size: 10px;">
                              {{ rec.employeeName }} (ID #{{ rec.userId }})
                            </h6>
                          </li>
                          <li>
                            <a class="dropdown-item d-flex align-items-center gap-2" href="javascript:void(0)" @click="goToDetails(rec)">
                              <i class="bi bi-person-workspace text-primary"></i> View Activity Details (:id)
                            </a>
                          </li>
                          <li v-if="rec.approvalStatus === 'PENDING_APPROVAL'">
                            <a class="dropdown-item d-flex align-items-center gap-2 text-success font-weight-bold" href="javascript:void(0)" @click="openApproveModal(rec)">
                              <i class="bi bi-shield-check"></i> Approve PIN (Issue 4-Digit)
                            </a>
                          </li>
                          <li><hr class="dropdown-divider"></li>
                          <!-- Force Checkin -->
                          <li>
                            <a class="dropdown-item d-flex align-items-center gap-2 text-success" href="javascript:void(0)" @click="executeDutyAction('forcecheckin', rec)">
                              <i class="bi bi-box-arrow-in-right text-success"></i> Force Check-In
                            </a>
                          </li>
                          <!-- Checkout -->
                          <li>
                            <a class="dropdown-item d-flex align-items-center gap-2 text-warning" href="javascript:void(0)" @click="executeDutyAction('checkout', rec)">
                              <i class="bi bi-box-arrow-right text-warning"></i> Checkout (Punch Out)
                            </a>
                          </li>
                          <!-- Terminate Duty -->
                          <li>
                            <a class="dropdown-item d-flex align-items-center gap-2 text-danger" href="javascript:void(0)" @click="executeDutyAction('id-terminate', rec)">
                              <i class="bi bi-x-octagon text-danger"></i> Terminate Duty
                            </a>
                          </li>
                          <li><hr class="dropdown-divider"></li>
                          <!-- ID Disable / Active -->
                          <li v-if="rec.isActive !== false">
                            <a class="dropdown-item d-flex align-items-center gap-2 text-danger" href="javascript:void(0)" @click="executeDutyAction('id-disable', rec)">
                              <i class="bi bi-slash-circle text-danger"></i> Disable Account (ID Disable)
                            </a>
                          </li>
                          <li v-else>
                            <a class="dropdown-item d-flex align-items-center gap-2 text-success" href="javascript:void(0)" @click="executeDutyAction('id-active', rec)">
                              <i class="bi bi-check2-circle text-success"></i> Activate Account (ID Active)
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== EMPLOYEE SHIFT BREAKDOWN & DETAILS MODAL ==================== -->
      <div class="modal fade" id="employeeDetailModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-lg border-0">
            <div class="modal-header bg-dark text-white">
              <div class="d-flex align-items-center gap-2.5">
                <div class="rounded-circle bg-warning text-dark font-weight-bold d-flex align-items-center justify-center fs-5" style="width: 44px; height: 44px;">
                  {{ detailEmployee?.employeeName ? detailEmployee.employeeName.charAt(0) : 'E' }}
                </div>
                <div>
                  <h5 class="modal-title font-weight-bold mb-0">{{ detailEmployee?.employeeName }}</h5>
                  <div class="text-white-50 small d-flex align-items-center gap-2">
                    <span><i class="bi bi-telephone"></i> {{ detailEmployee?.employeeMobile }}</span>
                    <span>•</span>
                    <span class="badge" :class="getRoleBadge(detailEmployee?.employeeRole)">{{ detailEmployee?.employeeRole }}</span>
                    <span>•</span>
                    <span>Staff ID #{{ detailEmployee?.staffId }}</span>
                  </div>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <div class="modal-body p-4" v-if="detailEmployee">
              <!-- Quick Action & Status Banner -->
              <div class="card bg-light border-0 shadow-sm mb-4">
                <div class="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <span class="text-muted small text-uppercase font-weight-bold d-block">Current Duty Status</span>
                    <span class="badge fs-6 mt-1" :class="getStatusBadge(detailEmployee.approvalStatus)">
                      {{ detailEmployee.approvalStatus }}
                    </span>
                    <span v-if="detailEmployee.approvalCode" class="ms-2 badge bg-dark text-warning font-monospace fs-6">
                      PIN: {{ detailEmployee.approvalCode }}
                    </span>
                  </div>

                  <!-- Manager Quick Force Action Buttons -->
                  <div class="d-flex align-items-center gap-2">
                    <button v-if="detailEmployee.approvalStatus === 'PENDING_APPROVAL'"
                            @click="openApproveModal(detailEmployee)"
                            class="btn btn-sm btn-success font-weight-bold">
                      <i class="bi bi-shield-check"></i> Approve PIN
                    </button>
                    <button @click="promptForceCheckout(detailEmployee)"
                            class="btn btn-sm btn-outline-warning text-dark font-weight-bold">
                      <i class="bi bi-box-arrow-right"></i> Force Checkout
                    </button>
                    <button @click="promptForceLogout(detailEmployee)"
                            class="btn btn-sm btn-outline-danger font-weight-bold">
                      <i class="bi bi-person-x-fill"></i> Force Logout
                    </button>
                  </div>
                </div>
              </div>

              <!-- Full Shift Logs Table for this Employee -->
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="font-weight-bold text-dark mb-0">
                  <i class="bi bi-clock-history text-primary"></i> Shift Punch Logs & Biometrics ({{ (detailEmployee.history || []).length }} Records)
                </h6>
                <small class="text-muted">Chronological order (Newest first)</small>
              </div>

              <div class="table-responsive border rounded-3">
                <table class="table table-sm table-striped align-middle mb-0" style="font-size: 13px;">
                  <thead class="table-light">
                    <tr>
                      <th>Shift & Date</th>
                      <th>Punch-In</th>
                      <th>Punch-Out</th>
                      <th>Hours</th>
                      <th>Selfie</th>
                      <th>Status</th>
                      <th>Approval PIN</th>
                      <th>Approver</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!detailEmployee.history || detailEmployee.history.length === 0">
                      <td colspan="8" class="text-center py-3 text-muted">No past shifts logged yet.</td>
                    </tr>
                    <tr v-for="shift in detailEmployee.history" :key="shift.dutyId">
                      <td>
                        <div class="font-weight-bold">{{ shift.shiftSlot }}</div>
                        <small class="text-muted">{{ formatDate(shift.date) }}</small>
                      </td>
                      <td>
                        <span class="font-monospace font-weight-bold text-dark">{{ shift.punchInTime || '—' }}</span>
                      </td>
                      <td>
                        <span class="font-monospace text-secondary">{{ shift.punchOutTime || 'Active / On Duty' }}</span>
                      </td>
                      <td>
                        <span class="badge bg-light text-dark border font-monospace">
                          {{ shift.totalHours ? shift.totalHours + ' hrs' : 'In Progress' }}
                        </span>
                      </td>
                      <td>
                        <div v-if="shift.selfieUrl">
                          <a :href="shift.selfieUrl" target="_blank" title="Click to view full photo">
                            <img :src="shift.selfieUrl" class="rounded border" style="width: 32px; height: 32px; object-fit: cover;">
                          </a>
                        </div>
                        <span v-else class="text-muted small">None</span>
                      </td>
                      <td>
                        <span class="badge" :class="getStatusBadge(shift.approvalStatus)">
                          {{ shift.approvalStatus }}
                        </span>
                      </td>
                      <td>
                        <span v-if="shift.approvalCode" class="badge bg-dark text-warning font-monospace">
                          {{ shift.approvalCode }}
                        </span>
                        <span v-else class="text-muted small">—</span>
                      </td>
                      <td>
                        <small class="text-muted">{{ shift.approvedByName || 'Auto/Pending' }}</small>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Extra Notes / Details -->
              <div v-if="detailEmployee.notes" class="mt-3 p-2.5 bg-light rounded border text-muted small font-monospace">
                <strong>Notes / Audit:</strong> {{ detailEmployee.notes }}
              </div>
            </div>

            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
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
      detailEmployee: null,
      approvalModalCode: '4821',
      modalInstance: null,
      detailModalInstance: null
    };
  },
  mounted() {
    this.fetchDutyRecords();
    const modalEl = document.getElementById('approveDutyModal');
    if (modalEl && window.bootstrap) {
      this.modalInstance = new bootstrap.Modal(modalEl);
    }
    const detailEl = document.getElementById('employeeDetailModal');
    if (detailEl && window.bootstrap) {
      this.detailModalInstance = new bootstrap.Modal(detailEl);
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

          // If detail modal is open, refresh detail employee state
          if (this.detailEmployee) {
            const updated = this.records.find(r => r.userId === this.detailEmployee.userId);
            if (updated) this.detailEmployee = updated;
          }
        }
      } catch (err) {
        console.error('Error fetching duty records:', err);
      } finally {
        this.loading = false;
      }
    },
    goToDetails(rec) {
      if (!rec) return;
      const targetId = rec.dutyId || rec.userId;
      this.$router.push(`/admin/duty-records/${targetId}`);
    },
    async executeDutyAction(action, rec) {
      if (!rec) return;
      const actionLabels = {
        'forcecheckin': 'Force Check-In (Direct Activate Duty)',
        'checkout': 'Checkout (Punch Out)',
        'id-terminate': 'Terminate Duty Session',
        'id-disable': 'Disable Account / ID',
        'id-active': 'Activate Account / ID'
      };
      const label = actionLabels[action] || action;
      const confirmed = confirm(`Kya aap sure hain ${rec.employeeName} ke liye '${label}' action run karne ke liye?`);
      if (!confirmed) return;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/duty-action', {
          action,
          userId: rec.userId,
          dutyId: rec.dutyId,
          reason: `Admin triggered ${action} from duty records list`
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          alert(`✅ ${res.data.message}`);
          this.fetchDutyRecords();
        } else {
          alert('Action error: ' + res.data.message);
        }
      } catch (err) {
        alert('Duty action failed: ' + (err.response?.data?.message || err.message));
      }
    },
    openDetailModal(employee) {
      this.detailEmployee = employee;
      if (!this.detailModalInstance) {
        const detailEl = document.getElementById('employeeDetailModal');
        if (detailEl && window.bootstrap) {
          this.detailModalInstance = new bootstrap.Modal(detailEl);
        }
      }
      if (this.detailModalInstance) {
        this.detailModalInstance.show();
      }
    },
    generateRandomCode() {
      this.approvalModalCode = String(Math.floor(1000 + Math.random() * 9000));
    },
    openApproveModal(duty) {
      this.selectedDuty = duty;
      this.generateRandomCode();
      if (!this.modalInstance) {
        const modalEl = document.getElementById('approveDutyModal');
        if (modalEl && window.bootstrap) {
          this.modalInstance = new bootstrap.Modal(modalEl);
        }
      }
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
    async promptForceCheckout(employee) {
      const confirmed = confirm(`Kya aap sure hain ${employee.employeeName} ko Force Checkout (Duty punch-out) karne ke liye?`);
      if (!confirmed) return;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/duty-force-checkout', {
          dutyId: employee.dutyId,
          userId: employee.userId,
          reason: 'Manual force checkout from admin dashboard'
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          alert(`✅ ${res.data.message}`);
          this.fetchDutyRecords();
        }
      } catch (err) {
        alert('Error during force checkout: ' + (err.response?.data?.error || err.message));
      }
    },
    async promptForceLogout(employee) {
      const confirmed = confirm(`⚠️ Warning: Kya aap sure hain ${employee.employeeName} ko Force Logout karne ke liye? Employee ka active session terminate ho jayega.`);
      if (!confirmed) return;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/duty-force-logout', {
          userId: employee.userId,
          dutyId: employee.dutyId,
          reason: 'Manager terminated employee active session'
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          alert(`✅ ${res.data.message}`);
          this.fetchDutyRecords();
        }
      } catch (err) {
        alert('Error during force logout: ' + (err.response?.data?.error || err.message));
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
