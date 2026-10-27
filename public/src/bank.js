// Bank Component
const Bank = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-10">
          <div class="card shadow-sm">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-bank"></i> Bank Accounts</h4>
              <router-link to="/profile" class="btn btn-light btn-sm">
                <i class="bi bi-arrow-left"></i> Back to Profile
              </router-link>
            </div>
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <p class="text-muted mb-0">Manage your linked bank accounts for payments and withdrawals.</p>
                  <button class="btn btn-success btn-sm" @click="showBankForm = true; bankEditMode = false; resetBankForm()">
                    <i class="bi bi-plus-lg"></i> Add New Account
                  </button>
                </div>
                
                <div v-if="bankLoading" class="text-center py-5"><div class="spinner-border"></div></div>
                
                <div v-else-if="bankAccounts.length === 0" class="text-center py-5 bg-light rounded border mb-4">
                    <i class="bi bi-info-circle fs-1 text-muted"></i>
                    <p class="text-muted mt-2">No bank accounts added yet.</p>
                </div>
                
                <div v-else class="row">
                  <div v-for="bank in bankAccounts" :key="bank.BankID" class="col-md-6 mb-4">
                    <div class="card h-100 border-start border-4" :class="bank.IsPrimary ? 'border-success' : 'border-secondary shadow-sm'">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h6 class="card-title mb-0 fw-bold">{{ bank.BankName }}</h6>
                                <div class="d-flex flex-column align-items-end">
                                    <span v-if="bank.IsApproved" class="badge bg-success small mb-1"><i class="bi bi-check-circle"></i> Approved</span>
                                    <span v-else class="badge bg-warning text-dark small mb-1"><i class="bi bi-clock"></i> Pending</span>
                                    <span v-if="bank.IsPrimary" class="badge bg-primary small">Primary</span>
                                </div>
                            </div>
                            <div class="bank-details">
                                <div class="mb-1 d-flex">
                                    <span class="text-muted small w-50">Account No:</span>
                                    <span class="small fw-semibold">{{ bank.AccountNo }}</span>
                                </div>
                                <div class="mb-1 d-flex">
                                    <span class="text-muted small w-50">IFSC Code:</span>
                                    <span class="small fw-semibold">{{ bank.IFSC }}</span>
                                </div>
                                <div class="mb-2 d-flex">
                                    <span class="text-muted small w-50">UPI ID:</span>
                                    <span class="small fw-semibold">{{ bank.UPI || 'None' }}</span>
                                </div>
                            </div>
                            
                            <div v-if="bank.BankImageUrl" class="mt-3">
                                <a :href="bank.BankImageUrl" target="_blank" class="btn btn-outline-info btn-sm w-100">
                                    <i class="bi bi-image"></i> View Document Proof
                                </a>
                            </div>

                            <div class="mt-3 d-flex justify-content-end gap-2 align-items-center">
                                <button v-if="!bank.IsApproved || isAdmin" class="btn btn-outline-danger btn-sm" @click="deleteBank(bank.BankID)" title="Delete">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                                <span v-else class="text-muted small"><i class="bi bi-lock-fill"></i> Locked</span>
                            </div>
                        </div>
                    </div>
                  </div>
                </div>

                <!-- Bank Form Modal -->
                <div v-if="showBankForm" class="modal-backdrop fade show"></div>
                <div v-if="showBankForm" class="modal fade show" style="display: block;">
                  <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content shadow-lg border-0">
                      <div class="modal-header bg-primary text-white border-0">
                        <h5 class="modal-title">
                            <i class="bi" :class="bankEditMode ? 'bi-pencil-square' : 'bi-plus-circle'"></i>
                            {{ bankEditMode ? 'Edit Bank Account' : 'Add Bank Account' }}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" @click="showBankForm = false"></button>
                      </div>
                      <div class="modal-body p-4">
                        <div v-if="bankSaveError" class="alert alert-danger small">{{ bankSaveError }}</div>
                        
                        <div class="row">
                            <div class="col-12 mb-3">
                              <label class="form-label fw-bold small">Bank Name</label>
                              <input type="text" class="form-control" v-model="bankForm.BankName" placeholder="e.g. HDFC Bank, SBI" required>
                            </div>
                            <div class="col-12 mb-3">
                              <label class="form-label fw-bold small">Account Number</label>
                              <input type="text" class="form-control" v-model="bankForm.AccountNo" placeholder="Enter full account number" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold small">IFSC Code</label>
                                <input type="text" class="form-control" v-model="bankForm.IFSC" placeholder="HDFC0001234" required>
                            </div>
                            <div class="col-md-6 mb-3">
                                <label class="form-label fw-bold small">UPI ID (Optional)</label>
                                <input type="text" class="form-control" v-model="bankForm.UPI" placeholder="user@upi">
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold small d-block">Bank Proof (Cheque/Passbook)</label>
                            <div v-if="bankForm.BankImageUrl" class="mb-3 position-relative d-inline-block">
                                <img :src="bankForm.BankImageUrl" class="img-thumbnail" style="max-height: 120px; border-radius: 8px;">
                                <button class="btn btn-danger btn-xs position-absolute top-0 end-0 m-1 rounded-circle" @click="bankForm.BankImageUrl = ''">
                                    <i class="bi bi-x"></i>
                                </button>
                            </div>
                            <div class="input-group">
                                <input type="file" ref="bankFileInput" class="form-control" accept="image/*" @change="handleBankImageUpload">
                                <span v-if="bankUploading" class="input-group-text bg-white">
                                    <span class="spinner-border spinner-border-sm text-primary"></span>
                                </span>
                            </div>
                            <div class="form-text mt-1">Upload a clear photo of your cancelled cheque or first page of passbook.</div>
                        </div>

                        <div class="mb-3">
                            <div class="form-check form-switch card p-2 bg-light border-0">
                              <div class="ms-4">
                                <input type="checkbox" class="form-check-input" id="isPrimary" v-model="bankForm.IsPrimary">
                                <label class="form-check-label fw-semibold small" for="isPrimary">Set as Primary Account</label>
                                <div class="text-muted x-small">Primary account is used for default payouts.</div>
                              </div>
                            </div>
                        </div>
                        
                        <div class="alert alert-warning py-2 x-small mb-0 border-0 bg-opacity-10 bg-warning text-dark">
                            <i class="bi bi-shield-lock"></i> Changes will require admin verification before being fully active.
                        </div>
                      </div>
                      <div class="modal-footer border-0">
                        <button type="button" class="btn btn-light" @click="showBankForm = false">Discard</button>
                        <button type="button" class="btn btn-primary px-4" @click="saveBankAccount" :disabled="bankSaving || bankUploading">
                          <span v-if="bankSaving" class="spinner-border spinner-border-sm me-2"></span>
                          {{ bankEditMode ? 'Update Account' : 'Save Account' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Admin Approval Section (Only for authorized roles) -->
                <div v-if="isAdmin && pendingBankAccounts.length > 0" class="mt-5 pt-4 border-top">
                    <div class="d-flex align-items-center mb-4">
                        <h4 class="mb-0 text-dark"><i class="bi bi-shield-check text-warning"></i> Pending Verifications</h4>
                        <span class="badge bg-warning text-dark ms-2">{{ pendingBankAccounts.length }}</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle border">
                            <thead class="table-light">
                                <tr>
                                    <th class="small py-3">USER</th>
                                    <th class="small py-3">BANK NAME</th>
                                    <th class="small py-3">ACCOUNT DETAILS</th>
                                    <th class="small py-3 text-center">PROOF</th>
                                    <th class="small py-3 text-end">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="pBank in pendingBankAccounts" :key="pBank.BankID">
                                    <td>
                                        <div class="fw-bold small">ID: {{ pBank.UserID }}</div>
                                    </td>
                                    <td>
                                        <div class="fw-bold">{{ pBank.BankName }}</div>
                                        <div class="text-primary small">UPI: {{ pBank.UPI || 'N/A' }}</div>
                                    </td>
                                    <td>
                                        <div class="small fw-semibold">{{ pBank.AccountNo }}</div>
                                        <div class="text-muted small">IFSC: {{ pBank.IFSC }}</div>
                                    </td>
                                    <td class="text-center">
                                        <a v-if="pBank.BankImageUrl" :href="pBank.BankImageUrl" target="_blank" class="btn btn-sm btn-link text-decoration-none">
                                            <i class="bi bi-eye"></i> View
                                        </a>
                                        <span v-else class="text-muted small">No Proof</span>
                                    </td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-success px-3" @click="approveBank(pBank.BankID)" :disabled="bankApproving === pBank.BankID">
                                            <span v-if="bankApproving === pBank.BankID" class="spinner-border spinner-border-sm me-1"></span>
                                            <i v-else class="bi bi-check2"></i> Verify
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
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
      user: null, isAdmin: false,
      bankAccounts: [], bankLoading: false,
      showBankForm: false, bankEditMode: false, bankSaving: false, bankSaveError: null,
      bankForm: { BankID: null, BankName: '', AccountNo: '', IFSC: '', UPI: '', BankImageUrl: '', IsPrimary: false },
      bankUploading: false,
      pendingBankAccounts: [], bankApproving: null
    };
  },
  mounted() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        this.user = JSON.parse(storedUser);
        this.isAdmin = ['superadmin', 'admin', 'accountmanager'].includes(this.user.Role);
    } else {
        this.$router.push('/login');
        return;
    }
    this.fetchBankAccounts();
    if (this.isAdmin) this.fetchPendingBankAccounts();
  },
  methods: {
    async fetchBankAccounts() {
      this.bankLoading = true;
      const token = localStorage.getItem('token');
      const query = `query { myBankAccounts { BankID BankName AccountNo IFSC UPI BankImageUrl IsPrimary IsApproved CreatedAt } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.bankAccounts = data.myBankAccounts;
      } catch (err) { console.error('Error fetching bank accounts:', err); }
      finally { this.bankLoading = false; }
    },
    async fetchPendingBankAccounts() {
      if (!this.isAdmin) return;
      const token = localStorage.getItem('token');
      const query = `query { pendingBankAccounts { BankID UserID BankName AccountNo IFSC UPI BankImageUrl IsApproved } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.pendingBankAccounts = data.pendingBankAccounts;
      } catch (err) { console.error('Error fetching pending bank accounts:', err); }
    },
    async approveBank(bankID) {
      if (!confirm('Verify and approve this bank account?')) return;
      this.bankApproving = bankID;
      const token = localStorage.getItem('token');
      const mutation = `mutation ApproveBankAccount($BankID: Int!) { approveBankAccount(BankID: $BankID) { BankID IsApproved } }`;
      try {
        await graphqlRequest(mutation, { BankID: bankID }, token);
        this.fetchPendingBankAccounts();
        this.fetchBankAccounts();
      } catch (err) { alert('Error approving account: ' + err.message); }
      finally { this.bankApproving = null; }
    },
    resetBankForm() {
      this.bankForm = { BankID: null, BankName: '', AccountNo: '', IFSC: '', UPI: '', BankImageUrl: '', IsPrimary: false };
      this.bankSaveError = null;
    },
    editBank(bank) {
      this.bankForm = { ...bank };
      this.bankEditMode = true;
      this.showBankForm = true;
    },
    async deleteBank(bankID) {
      if (!confirm('Are you sure you want to delete this bank account?')) return;
      const token = localStorage.getItem('token');
      const mutation = `mutation DeleteBankAccount($BankID: Int!) { deleteBankAccount(BankID: $BankID) }`;
      try {
        await graphqlRequest(mutation, { BankID: bankID }, token);
        this.fetchBankAccounts();
      } catch (err) { alert('Error deleting account: ' + err.message); }
    },
    async handleBankImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.bankUploading = true;
      this.bankSaveError = null;
      
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('token');
      try {
        const response = await axios.post('/upload-bank-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.data.success) {
          this.bankForm.BankImageUrl = response.data.imageUrl;
        }
      } catch (err) {
        this.bankSaveError = 'Image upload failed: ' + (err.response?.data?.details || err.message);
      } finally {
        this.bankUploading = false;
        event.target.value = '';
      }
    },
    async saveBankAccount() {
      this.bankSaving = true;
      this.bankSaveError = null;
      const token = localStorage.getItem('token');
      
      const { BankID, BankName, AccountNo, IFSC, UPI, BankImageUrl, IsPrimary } = this.bankForm;
      const vars = { BankName, AccountNo, IFSC, UPI, BankImageUrl, IsPrimary };
      
      let query = '';
      if (this.bankEditMode) {
        query = `mutation UpdateBankAccount($BankID: Int!, $BankName: String, $AccountNo: String, $IFSC: String, $UPI: String, $BankImageUrl: String, $IsPrimary: Boolean) { 
          updateBankAccount(BankID: $BankID, BankName: $BankName, AccountNo: $AccountNo, IFSC: $IFSC, UPI: $UPI, BankImageUrl: $BankImageUrl, IsPrimary: $IsPrimary) { BankID } }`;
        vars.BankID = BankID;
      } else {
        query = `mutation AddBankAccount($BankName: String!, $AccountNo: String!, $IFSC: String!, $UPI: String, $BankImageUrl: String, $IsPrimary: Boolean) { 
          addBankAccount(BankName: $BankName, AccountNo: $AccountNo, IFSC: $IFSC, UPI: $UPI, BankImageUrl: $BankImageUrl, IsPrimary: $IsPrimary) { BankID } }`;
      }
      
      try {
        await graphqlRequest(query, vars, token);
        this.showBankForm = false;
        this.fetchBankAccounts();
      } catch (err) { this.bankSaveError = err.message; }
      finally { this.bankSaving = false; }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Bank;
}
