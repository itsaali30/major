const AdminMerchantLedger = {
  template: `
    <div class="container-fluid my-4 px-4">
      <style>
        .ledger-card {
          border-radius: 12px;
          transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        .ledger-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.08) !important;
        }
        .type-purchase { color: #dc3545; font-weight: bold; }
        .type-payment { color: #198754; font-weight: bold; }
        .type-return { color: #0d6efd; font-weight: bold; }
      </style>

      <!-- Header & Navigation -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <div class="d-flex align-items-center mb-1">
            <router-link :to="'/admin/merchants/' + MerchantID" class="btn btn-sm btn-outline-secondary me-3">
              <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
            </router-link>
            <h3 class="mb-0 fw-bold text-dark">
              <i class="bi bi-journal-text text-primary me-2"></i> {{ ledger ? ledger.MerchantName : 'Merchant Ledger' }}
            </h3>
          </div>
          <div class="text-muted small mt-1" v-if="ledger">
            <span class="me-3" v-if="ledger.GSTIN"><strong>GSTIN:</strong> {{ ledger.GSTIN }}</span>
            <span class="me-3" v-if="ledger.Contact"><strong>Contact:</strong> {{ ledger.Contact }}</span>
            <span v-if="ledger.Address"><strong>Address:</strong> {{ ledger.Address }}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary fw-bold px-3 shadow-sm" @click="fetchLedger">
            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button class="btn btn-success fw-bold px-4 shadow-sm" @click="openPaymentModal">
            <i class="bi bi-cash-stack me-1"></i> Record Payment
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Loading ledger statement...</p>
      </div>

      <div v-else-if="error" class="alert alert-danger shadow-sm">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
      </div>

      <div v-else>
        <!-- 4 Summary KPI Cards -->
        <div class="row g-3 mb-4">
          <!-- Total Purchases -->
          <div class="col-md-3">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-danger">
              <div class="text-muted small text-uppercase fw-bold">Total Purchases (Billed)</div>
              <h3 class="fw-bold text-danger mt-2 mb-1">₹{{ (ledger.TotalPurchases || 0).toFixed(2) }}</h3>
              <div class="x-small text-muted">All GRN & Direct purchase receipts</div>
            </div>
          </div>

          <!-- Total Paid -->
          <div class="col-md-3">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-success">
              <div class="text-muted small text-uppercase fw-bold">Total Paid (Pay Kare)</div>
              <h3 class="fw-bold text-success mt-2 mb-1">₹{{ (ledger.TotalPaid || 0).toFixed(2) }}</h3>
              <div class="x-small text-muted">Settled via Cash, Bank & UPI</div>
            </div>
          </div>

          <!-- Balance Outstanding -->
          <div class="col-md-3">
            <div class="card ledger-card border-0 shadow-sm p-3 border-start border-4" :class="ledger.BalanceDue > 0 ? 'bg-danger-subtle border-danger' : 'bg-success-subtle border-success'">
              <div class="text-muted small text-uppercase fw-bold">Outstanding Balance (Baqi Hai)</div>
              <h3 class="fw-bold mt-2 mb-1" :class="ledger.BalanceDue > 0 ? 'text-danger' : 'text-success'">
                ₹{{ (ledger.BalanceDue || 0).toFixed(2) }}
              </h3>
              <div class="x-small text-muted fw-bold">
                {{ ledger.BalanceDue > 0 ? '⚠️ Amount Payable to Vendor' : '✅ All Accounts Cleared' }}
              </div>
            </div>
          </div>

          <!-- Cash vs Credit Split -->
          <div class="col-md-3">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-info">
              <div class="text-muted small text-uppercase fw-bold">Payment Mode Split</div>
              <div class="d-flex justify-content-between mt-2 pt-1">
                <span class="small text-muted">Cash Paid:</span>
                <span class="fw-bold text-success">₹{{ (ledger.TotalCashPaid || 0).toFixed(2) }}</span>
              </div>
              <div class="d-flex justify-content-between mt-1">
                <span class="small text-muted">Credit Purchases:</span>
                <span class="fw-bold text-dark">₹{{ (ledger.TotalCreditPurchases || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ledger Statement Table -->
        <div class="card border-0 shadow-sm overflow-hidden mb-5">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0 fw-bold text-dark"><i class="bi bi-clock-history me-2 text-primary"></i> Detailed Account Statement</h5>
            <div class="badge bg-light text-dark border px-3 py-2 fw-normal">
              Showing <strong>{{ ledger.Entries ? ledger.Entries.length : 0 }}</strong> transactions
            </div>
          </div>
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead class="bg-dark text-white small text-uppercase fw-bold">
                <tr>
                  <th class="ps-4">Date & Time</th>
                  <th>Type</th>
                  <th>Ref #</th>
                  <th>Payment Mode</th>
                  <th class="text-end">Debit (Purchase)</th>
                  <th class="text-end">Credit (Paid/Return)</th>
                  <th class="text-end">Balance Owed</th>
                  <th class="pe-4 ps-4">Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in ledger.Entries" :key="entry.LedgerID">
                  <td class="ps-4">
                    <div class="fw-bold small">{{ formatDate(entry.Date) }}</div>
                    <div class="x-small text-muted">{{ formatTime(entry.Date) }}</div>
                  </td>
                  <td>
                    <span class="badge" :class="typeBadgeClass(entry.Type)">
                      {{ (entry.Type || 'TRANSACTION').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <span class="small fw-semibold text-secondary">
                      {{ entry.ReferenceID ? ('REF-' + entry.ReferenceID) : 'N/A' }}
                    </span>
                  </td>
                  <td>
                    <span class="badge bg-light text-dark border text-uppercase">
                      {{ entry.PaymentMode || 'CREDIT' }}
                    </span>
                  </td>
                  <!-- Debit (Purchase adds to balance) -->
                  <td class="text-end fw-bold text-danger">
                    {{ (entry.Type === 'PURCHASE' || entry.Type === 'INVOICE') ? ('₹' + Number(entry.Amount || 0).toFixed(2)) : '-' }}
                  </td>
                  <!-- Credit (Payment or Return subtracts from balance) -->
                  <td class="text-end fw-bold text-success">
                    {{ (entry.Type === 'PAYMENT' || entry.Type === 'RETURN') ? ('₹' + Number(entry.Amount || 0).toFixed(2)) : '-' }}
                  </td>
                  <!-- Running Balance -->
                  <td class="text-end fw-bold">
                    <span :class="(entry.Balance || 0) > 0 ? 'text-danger' : 'text-success'">
                      ₹{{ (entry.Balance || 0).toFixed(2) }}
                    </span>
                  </td>
                  <td class="pe-4 ps-4 small text-muted">
                    {{ entry.Notes || '-' }}
                  </td>
                </tr>
                <tr v-if="!ledger.Entries || ledger.Entries.length === 0">
                  <td colspan="8" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 opacity-25 d-block mb-2"></i>
                    No ledger transactions recorded yet for this merchant.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Record Payment Modal -->
      <div class="modal fade" id="paymentModal" tabindex="-1" ref="paymentModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0 py-3">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-cash-coin me-2 text-success"></i> Record Merchant Payment
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closePaymentModal"></button>
            </div>
            <div class="modal-body p-4 bg-light-subtle">
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Merchant</label>
                <input type="text" class="form-control bg-light border-0 fw-bold" :value="ledger ? ledger.MerchantName : ''" readonly>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Payment Amount (₹) <span class="text-danger">*</span></label>
                <div class="input-group">
                  <span class="input-group-text bg-white border-0 shadow-sm fw-bold">₹</span>
                  <input type="number" step="0.01" class="form-control border-0 shadow-sm fw-bold fs-5 text-success" v-model.number="paymentForm.Amount" placeholder="0.00" required>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Payment Mode <span class="text-danger">*</span></label>
                <select class="form-select border-0 shadow-sm fw-bold" v-model="paymentForm.PaymentMode">
                  <option value="cash">CASH</option>
                  <option value="bank">BANK TRANSFER / NEFT / IMPS</option>
                  <option value="upi">UPI / GPAY / PHONEPE</option>
                  <option value="cheque">CHEQUE</option>
                  <option value="credit">CREDIT ADJUSTMENT</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Transaction / Cheque / UTR Ref</label>
                <input type="text" class="form-control border-0 shadow-sm" placeholder="e.g. UTR-98748392" v-model="paymentForm.ReferenceNo">
              </div>
              <div class="mb-3">
                <label class="form-label fw-bold small text-muted">Notes / Remarks</label>
                <textarea class="form-control border-0 shadow-sm" rows="2" placeholder="e.g. Cleared bill for batch order..." v-model="paymentForm.Notes"></textarea>
              </div>
            </div>
            <div class="modal-footer bg-white border-0 py-3">
              <button type="button" class="btn btn-light px-4 fw-bold" @click="closePaymentModal">Cancel</button>
              <button type="button" class="btn btn-success px-5 fw-bold shadow" :disabled="savingPayment" @click="submitPayment">
                <span v-if="savingPayment" class="spinner-border spinner-border-sm me-1"></span>
                Save Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      MerchantID: this.$route.params.MerchantID,
      ledger: null,
      loading: true,
      error: null,
      savingPayment: false,
      paymentModalInstance: null,
      paymentForm: {
        Amount: null,
        PaymentMode: 'cash',
        ReferenceNo: '',
        Notes: ''
      }
    };
  },
  mounted() {
    this.paymentModalInstance = new bootstrap.Modal(this.$refs.paymentModal);
    this.fetchLedger();
  },
  watch: {
    '$route.params.MerchantID': function(newId) {
      this.MerchantID = newId;
      this.fetchLedger();
    }
  },
  methods: {
    async fetchLedger() {
      this.loading = true;
      this.error = null;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      const query = `query GetLedger($MerchantID: Int!) {
        merchantLedger(MerchantID: $MerchantID) {
          MerchantID
          MerchantName
          GSTIN
          Contact
          Address
          TotalPurchases
          TotalPaid
          TotalReturns
          BalanceDue
          TotalCashPaid
          TotalCreditPurchases
          Entries {
            LedgerID
            MerchantID
            Type
            Amount
            ReferenceID
            Date
            Balance
            PaymentMode
            Notes
            CreatedBy
          }
        }
      }`;

      try {
        const data = await graphqlRequest(query, { MerchantID: parseInt(this.MerchantID) }, token);
        if (data && data.merchantLedger) {
          this.ledger = data.merchantLedger;
        } else {
          this.error = "Failed to load merchant ledger.";
        }
      } catch (err) {
        console.error("Ledger Fetch Error:", err);
        this.error = err.response?.errors?.[0]?.message || err.message;
      } finally {
        this.loading = false;
      }
    },
    openPaymentModal() {
      this.paymentForm = {
        Amount: null,
        PaymentMode: 'cash',
        ReferenceNo: '',
        Notes: ''
      };
      this.paymentModalInstance.show();
    },
    closePaymentModal() {
      this.paymentModalInstance.hide();
    },
    async submitPayment() {
      if (!this.paymentForm.Amount || this.paymentForm.Amount <= 0) {
        alert("Please enter a valid payment amount.");
        return;
      }

      this.savingPayment = true;
      const token = localStorage.getItem('token');
      const mutation = `mutation RecordPayment($mid: Int!, $amt: Float!, $mode: String!, $ref: String, $notes: String) {
        recordMerchantPayment(MerchantID: $mid, Amount: $amt, PaymentMode: $mode, ReferenceNo: $ref, Notes: $notes) {
          LedgerID
          Amount
          Date
        }
      }`;

      try {
        await graphqlRequest(mutation, {
          mid: parseInt(this.MerchantID),
          amt: parseFloat(this.paymentForm.Amount),
          mode: this.paymentForm.PaymentMode,
          ref: this.paymentForm.ReferenceNo || null,
          notes: this.paymentForm.Notes || null
        }, token);

        this.closePaymentModal();
        alert("Payment recorded successfully!");
        await this.fetchLedger();
      } catch (err) {
        console.error("Payment Record Error:", err);
        const msg = err.response?.errors?.[0]?.message || err.message;
        alert("Error recording payment: " + msg);
      } finally {
        this.savingPayment = false;
      }
    },
    formatDate(d) {
      if (!d) return 'N/A';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatTime(d) {
      if (!d) return '';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    },
    typeBadgeClass(t) {
      const type = (t || '').toUpperCase();
      if (type === 'PURCHASE' || type === 'INVOICE') return 'bg-danger text-white';
      if (type === 'PAYMENT') return 'bg-success text-white';
      if (type === 'RETURN') return 'bg-primary text-white';
      return 'bg-secondary text-white';
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminMerchantLedger;
}
