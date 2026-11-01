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
        .ledger-row {
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        .ledger-row:hover {
          background-color: #f1f5f9 !important;
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
            <span class="me-3" v-if="ledger.Contact || ledger.WhatsApp">
               <i class="bi bi-whatsapp text-success me-1"></i>
               <strong>WhatsApp / Contact:</strong> {{ ledger.WhatsApp || ledger.Contact }}
            </span>
            <span v-if="ledger.Address"><strong>Address:</strong> {{ ledger.Address }}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-success fw-bold px-3 shadow-sm" @click="sendWhatsAppLedgerStatement" v-if="ledger" title="Send full statement to merchant on WhatsApp">
            <i class="bi bi-whatsapp me-1"></i> Share Statement
          </button>
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
        <!-- 5 Summary KPI Cards (Purchases, Paid, Returns Separate, Balance, Mode Split) -->
        <div class="row g-3 mb-4">
          <!-- 1. Total Purchases -->
          <div class="col-lg-3 col-md-6">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-danger h-100">
              <div class="text-muted small text-uppercase fw-bold">Total Purchases (Billed)</div>
              <h3 class="fw-bold text-danger mt-2 mb-1">₹{{ (ledger.TotalPurchases || 0).toFixed(2) }}</h3>
              <div class="x-small text-muted">All GRN & Direct purchases billed</div>
            </div>
          </div>

          <!-- 2. Total Paid -->
          <div class="col-lg-2 col-md-6">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-success h-100">
              <div class="text-muted small text-uppercase fw-bold">Total Paid (Pay Kare)</div>
              <h3 class="fw-bold text-success mt-2 mb-1">₹{{ (ledger.TotalPaid || 0).toFixed(2) }}</h3>
              <div class="x-small text-muted">Settled via Cash, Bank, UPI</div>
            </div>
          </div>

          <!-- 3. Total Returns (Alag Show Hona) -->
          <div class="col-lg-2 col-md-6">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-primary h-100">
              <div class="text-muted small text-uppercase fw-bold text-primary">Returns (Wapas Kiya)</div>
              <h3 class="fw-bold text-primary mt-2 mb-1">₹{{ (ledger.TotalReturns || 0).toFixed(2) }}</h3>
              <div class="x-small text-muted">Stock returned to vendor</div>
            </div>
          </div>

          <!-- 4. Balance Outstanding -->
          <div class="col-lg-3 col-md-6">
            <div class="card ledger-card border-0 shadow-sm p-3 border-start border-4 h-100" :class="ledger.BalanceDue > 0 ? 'bg-danger-subtle border-danger' : 'bg-success-subtle border-success'">
              <div class="text-muted small text-uppercase fw-bold">Outstanding Balance (Baqi Hai)</div>
              <h3 class="fw-bold mt-2 mb-1" :class="ledger.BalanceDue > 0 ? 'text-danger' : 'text-success'">
                ₹{{ (ledger.BalanceDue || 0).toFixed(2) }}
              </h3>
              <div class="x-small text-muted fw-bold">
                {{ ledger.BalanceDue > 0 ? '⚠️ Amount Payable to Vendor' : '✅ All Accounts Cleared' }}
              </div>
            </div>
          </div>

          <!-- 5. Cash vs Credit Split -->
          <div class="col-lg-2 col-md-12">
            <div class="card ledger-card border-0 shadow-sm bg-white p-3 border-start border-4 border-info h-100">
              <div class="text-muted small text-uppercase fw-bold">Mode Breakdown</div>
              <div class="d-flex justify-content-between mt-2 pt-1">
                <span class="x-small text-muted">Cash Paid:</span>
                <span class="fw-bold text-success small">₹{{ (ledger.TotalCashPaid || 0).toFixed(2) }}</span>
              </div>
              <div class="d-flex justify-content-between mt-1">
                <span class="x-small text-muted">Credit:</span>
                <span class="fw-bold text-dark small">₹{{ (ledger.TotalCreditPurchases || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Ledger Statement Table (With Return Column & WhatsApp Send Button) -->
        <div class="card border-0 shadow-sm overflow-hidden mb-5">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
               <h5 class="mb-0 fw-bold text-dark"><i class="bi bi-clock-history me-2 text-primary"></i> Detailed Account Statement</h5>
               <p class="text-muted x-small mb-0">Complete itemized record with separate Purchases, Payments, and Returns tracking.</p>
            </div>
            <div class="badge bg-light text-dark border px-3 py-2 fw-normal">
              Showing <strong>{{ ledger.Entries ? ledger.Entries.length : 0 }}</strong> transactions
            </div>
          </div>
          <div class="table-responsive">
            <table class="table align-middle mb-0 table-hover">
              <thead class="bg-dark text-white small text-uppercase fw-bold">
                <tr>
                  <th class="ps-4">Date & Time</th>
                  <th>Type</th>
                  <th>Ref #</th>
                  <th>Payment Mode</th>
                  <th class="text-end">Purchase (Dr)</th>
                  <th class="text-end">Payment (Cr)</th>
                  <!-- Dedicated Return Column (Requested) -->
                  <th class="text-end text-primary bg-primary-subtle border-start border-end">Return (Cr)</th>
                  <th class="text-end">Balance Due</th>
                  <th class="ps-3">Remarks / Notes</th>
                  <!-- WhatsApp Send Invoice Button Column (Requested) -->
                  <th class="text-end pe-4">Actions / Invoice</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in ledger.Entries" :key="entry.LedgerID" class="ledger-row" @click="viewEntryDetails(entry)" title="Click row to view item details & receipt">
                  <!-- Date & Time -->
                  <td class="ps-4">
                    <div class="fw-bold small">{{ formatDate(entry.Date) }}</div>
                    <div class="x-small text-muted">{{ formatTime(entry.Date) }}</div>
                  </td>

                  <!-- Type Badge -->
                  <td>
                    <span class="badge" :class="typeBadgeClass(entry.Type)">
                      {{ (entry.Type || 'TRANSACTION').toUpperCase() }}
                    </span>
                  </td>

                  <!-- Ref # -->
                  <td>
                    <div class="small fw-bold text-primary">
                      {{ entry.ReferenceNumber || (entry.ReferenceID ? ('REF-' + entry.ReferenceID) : 'N/A') }}
                    </div>
                    <div class="badge bg-light text-secondary border x-small mt-1" v-if="entry.Items && entry.Items.length">
                       <i class="bi bi-box-seam me-1 text-primary"></i>{{ entry.Items.length }} {{ entry.Items.length === 1 ? 'item' : 'items' }}
                    </div>
                    <div class="x-small text-muted" v-if="entry.WarehouseName">
                       <i class="bi bi-geo-alt me-1"></i>{{ entry.WarehouseName }}
                    </div>
                  </td>

                  <!-- Payment Mode -->
                  <td>
                    <span class="badge bg-light text-dark border text-uppercase">
                      {{ entry.PaymentMode || 'CREDIT' }}
                    </span>
                  </td>

                  <!-- 1. Purchase (Dr) -->
                  <td class="text-end fw-bold text-danger">
                    {{ (entry.Type === 'PURCHASE' || entry.Type === 'INVOICE') ? ('₹' + Number(entry.Amount || 0).toFixed(2)) : '-' }}
                  </td>

                  <!-- 2. Payment (Cr) -->
                  <td class="text-end fw-bold text-success">
                    {{ entry.Type === 'PAYMENT' ? ('₹' + Number(entry.Amount || 0).toFixed(2)) : '-' }}
                  </td>

                  <!-- 3. Return (Cr) Separate Column (Requested) -->
                  <td class="text-end fw-bold text-primary bg-primary-subtle border-start border-end">
                    <span v-if="entry.Type === 'RETURN'">
                       <i class="bi bi-arrow-return-left me-1"></i>₹{{ Number(entry.Amount || 0).toFixed(2) }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>

                  <!-- 4. Running Balance -->
                  <td class="text-end fw-bold">
                    <span :class="(entry.Balance || 0) > 0 ? 'text-danger' : 'text-success'">
                      ₹{{ (entry.Balance || 0).toFixed(2) }}
                    </span>
                  </td>

                  <!-- Remarks / Notes -->
                  <td class="ps-3 small text-muted">
                    {{ entry.Notes || '-' }}
                  </td>

                  <!-- 5. Actions: View Items & WhatsApp Button -->
                  <td class="text-end pe-4" @click.stop>
                     <div class="d-inline-flex gap-2">
                        <button class="btn btn-sm btn-outline-info fw-bold shadow-sm" @click="viewEntryDetails(entry)" title="View item breakdown">
                           <i class="bi bi-eye me-1"></i> View ({{ (entry.Items || []).length }})
                        </button>
                        <button class="btn btn-sm btn-success fw-bold shadow-sm d-inline-flex align-items-center" @click="sendWhatsAppInvoice(entry)" title="Send Invoice to Merchant on WhatsApp">
                           <i class="bi bi-whatsapp me-1"></i> Send Invoice
                        </button>
                     </div>
                  </td>
                </tr>

                <tr v-if="!ledger.Entries || ledger.Entries.length === 0">
                  <td colspan="10" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 opacity-25 d-block mb-2"></i>
                    No ledger transactions recorded yet for this merchant.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Item Details & Transaction Breakdown Modal -->
      <div class="modal fade" id="itemDetailsModal" tabindex="-1" ref="itemDetailsModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" v-if="selectedEntry">
            <div class="modal-header border-0 py-3" :class="modalHeaderClass(selectedEntry.Type)">
              <div class="d-flex align-items-center">
                <i class="bi fs-4 me-2 text-white" :class="modalHeaderIcon(selectedEntry.Type)"></i>
                <div>
                   <h5 class="modal-title fw-bold mb-0 text-white">
                      {{ (selectedEntry.Type || 'TRANSACTION').toUpperCase() }} Details
                   </h5>
                   <div class="text-white-50 x-small">
                      Ref: {{ selectedEntry.ReferenceNumber || ('REF-' + selectedEntry.ReferenceID) }} | {{ formatDate(selectedEntry.Date) }} {{ formatTime(selectedEntry.Date) }}
                   </div>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white" @click="closeItemDetailsModal"></button>
            </div>
            <div class="modal-body p-4 bg-light-subtle">
               <!-- Info Summary Card -->
               <div class="card border-0 shadow-sm bg-white p-3 mb-3">
                  <div class="row g-3">
                     <div class="col-md-3 col-6">
                        <div class="text-muted x-small text-uppercase fw-bold">Merchant</div>
                        <div class="fw-bold text-dark small">{{ ledger ? ledger.MerchantName : 'N/A' }}</div>
                     </div>
                     <div class="col-md-3 col-6">
                        <div class="text-muted x-small text-uppercase fw-bold">Payment Mode</div>
                        <div class="mt-1">
                           <span class="badge text-uppercase" :class="(selectedEntry.PaymentMode || 'credit').toLowerCase() === 'cash' ? 'bg-success text-white' : 'bg-secondary text-white'">
                              {{ selectedEntry.PaymentMode || 'CREDIT' }}
                           </span>
                        </div>
                     </div>
                     <div class="col-md-3 col-6">
                        <div class="text-muted x-small text-uppercase fw-bold">Warehouse</div>
                        <div class="fw-bold text-primary small">{{ selectedEntry.WarehouseName || 'Main Warehouse' }}</div>
                     </div>
                     <div class="col-md-3 col-6">
                        <div class="text-muted x-small text-uppercase fw-bold">Total Amount</div>
                        <div class="fw-bold fs-6" :class="selectedEntry.Type === 'PURCHASE' ? 'text-danger' : (selectedEntry.Type === 'RETURN' ? 'text-primary' : 'text-success')">
                           ₹{{ Number(selectedEntry.Amount || 0).toFixed(2) }}
                        </div>
                     </div>
                     <div class="col-12 mt-2 pt-2 border-top" v-if="selectedEntry.Notes">
                        <div class="text-muted x-small text-uppercase fw-bold">Remarks / Notes</div>
                        <div class="small text-secondary">{{ selectedEntry.Notes }}</div>
                     </div>
                     <div class="col-12" v-if="selectedEntry.OfficerName">
                        <div class="text-muted x-small text-uppercase fw-bold">Officer / Handled By</div>
                        <div class="small fw-semibold text-dark"><i class="bi bi-person-badge text-primary me-1"></i>{{ selectedEntry.OfficerName }}</div>
                     </div>
                  </div>
               </div>

               <!-- Item Breakdown Section -->
               <div class="card border-0 shadow-sm bg-white overflow-hidden">
                  <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                     <div class="fw-bold small text-dark">
                        <i class="bi bi-box-seam text-primary me-2"></i> Itemized Breakdown ({{ (selectedEntry.Items || []).length }} Items)
                     </div>
                     <span class="badge bg-light text-dark border small">
                        Total Value: ₹{{ Number(selectedEntry.Amount || 0).toFixed(2) }}
                     </span>
                  </div>
                  <div class="table-responsive" v-if="selectedEntry.Items && selectedEntry.Items.length > 0">
                     <table class="table table-sm align-middle mb-0">
                        <thead class="table-light small text-uppercase">
                           <tr>
                              <th class="ps-3" style="width: 50px;">#</th>
                              <th>Product & Specifications</th>
                              <th class="text-center" style="width: 90px;">Qty</th>
                              <th class="text-center" style="width: 80px;">UOM</th>
                              <th class="text-end" style="width: 120px;">Unit Rate</th>
                              <th class="text-end pe-3" style="width: 130px;">Subtotal</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(item, idx) in selectedEntry.Items" :key="idx">
                              <td class="ps-3 text-muted small">{{ idx + 1 }}</td>
                              <td>
                                 <div class="fw-bold small text-dark">{{ item.VariantName }}</div>
                                 <div class="x-small text-muted" v-if="item.Reason">
                                    <i class="bi bi-info-circle me-1 text-warning"></i> Reason: {{ item.Reason }}
                                 </div>
                              </td>
                              <td class="text-center fw-bold">{{ item.Qty }}</td>
                              <td class="text-center small text-muted">{{ item.UOM || 'pcs' }}</td>
                              <td class="text-end small">₹{{ Number(item.Price || 0).toFixed(2) }}</td>
                              <td class="text-end pe-3 fw-bold" :class="selectedEntry.Type === 'PURCHASE' ? 'text-danger' : (selectedEntry.Type === 'RETURN' ? 'text-primary' : 'text-success')">
                                 ₹{{ Number(item.Subtotal || (item.Qty * item.Price) || 0).toFixed(2) }}
                              </td>
                           </tr>
                        </tbody>
                        <tfoot class="table-light fw-bold">
                           <tr>
                              <td colspan="5" class="text-end small">Grand Total:</td>
                              <td class="text-end pe-3 fs-6" :class="selectedEntry.Type === 'PURCHASE' ? 'text-danger' : (selectedEntry.Type === 'RETURN' ? 'text-primary' : 'text-success')">
                                 ₹{{ Number(selectedEntry.Amount || 0).toFixed(2) }}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
                  <div v-else class="text-center py-4 text-muted small">
                     <i class="bi bi-receipt fs-2 opacity-50 d-block mb-1"></i>
                     <span>Direct Payment / Financial adjustment entry without specific item records.</span>
                  </div>
               </div>
            </div>
            <div class="modal-footer bg-white border-0 py-3 d-flex justify-content-between">
               <button type="button" class="btn btn-outline-success fw-bold shadow-sm" @click="sendWhatsAppInvoice(selectedEntry)">
                  <i class="bi bi-whatsapp me-1"></i> Send Invoice on WhatsApp
               </button>
               <button type="button" class="btn btn-secondary px-4 fw-bold" @click="closeItemDetailsModal">Close</button>
            </div>
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
      selectedEntry: null,
      itemDetailsModalInstance: null,
      paymentForm: {
        Amount: null,
        PaymentMode: 'cash',
        ReferenceNo: '',
        Notes: ''
      }
    };
  },
  mounted() {
    if (this.$refs.paymentModal) {
      this.paymentModalInstance = new bootstrap.Modal(this.$refs.paymentModal);
    }
    if (this.$refs.itemDetailsModal) {
      this.itemDetailsModalInstance = new bootstrap.Modal(this.$refs.itemDetailsModal);
    }
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
          WhatsApp
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
            ReferenceNumber
            WarehouseName
            OfficerName
            Items {
              ItemID
              VariantID
              VariantName
              Qty
              Price
              Subtotal
              UOM
              Reason
            }
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

    // --- WHATSAPP INVOICE & STATEMENT DISPATCH (Requested) ---
    sendWhatsAppInvoice(entry) {
      if (!this.ledger) return;

      const merchantName = this.ledger.MerchantName || 'Merchant';
      let phone = this.ledger.WhatsApp || this.ledger.Contact;

      let cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : '';
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

      if (!cleanPhone || cleanPhone.length < 10) {
        const inputPhone = prompt(`No WhatsApp contact found for "${merchantName}".\nPlease enter 10-digit mobile number:`, '');
        if (!inputPhone) return;
        cleanPhone = String(inputPhone).replace(/[^\d]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      }

      const type = (entry.Type || 'TRANSACTION').toUpperCase();
      const amount = Number(entry.Amount || 0).toFixed(2);
      const balance = Number(entry.Balance || this.ledger.BalanceDue || 0).toFixed(2);
      const dateStr = this.formatDate(entry.Date);
      const timeStr = this.formatTime(entry.Date);
      const refNo = entry.ReferenceID ? `REF-${entry.ReferenceID}` : `VOUCHER-${entry.LedgerID}`;
      const mode = (entry.PaymentMode || 'credit').toUpperCase();
      const notes = entry.Notes || 'Official Ledger Transaction Entry';

      let headerEmoji = '📄';
      let typeLabel = 'TAX INVOICE / VOUCHER';
      if (type === 'PAYMENT') {
        headerEmoji = '💵';
        typeLabel = 'PAYMENT RECEIPT';
      } else if (type === 'RETURN') {
        headerEmoji = '🔄';
        typeLabel = 'PURCHASE RETURN CREDIT NOTE';
      }

      let message = `${headerEmoji} *${typeLabel}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🏬 *Vendor / Merchant:* ${merchantName}\n`;
      message += `🔢 *Reference #:* ${refNo}\n`;
      message += `📅 *Date & Time:* ${dateStr} ${timeStr}\n`;
      message += `🏷️ *Transaction Type:* ${type}\n`;
      message += `💳 *Payment Mode:* ${mode}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      
      if (type === 'RETURN') {
        message += `🔄 *Return Credit Amount:* ₹${amount}\n`;
      } else if (type === 'PAYMENT') {
        message += `💵 *Paid Amount Settled:* ₹${amount}\n`;
      } else {
        message += `📦 *Billed Purchase Amount:* ₹${amount}\n`;
      }

      message += `📋 *Description:* ${notes}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (entry.Items && entry.Items.length > 0) {
        message += `📦 *ITEMS DETAIL:*\n`;
        entry.Items.forEach((it, i) => {
          message += `${i+1}. ${it.VariantName} x ${it.Qty} @ ₹${Number(it.Price || 0).toFixed(2)} = ₹${Number(it.Subtotal || (it.Qty * it.Price) || 0).toFixed(2)}\n`;
        });
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
      }
      message += `📊 *ACCOUNT BALANCE SUMMARY:*\n`;
      message += `• Total Billed Purchases: ₹${Number(this.ledger.TotalPurchases || 0).toFixed(2)}\n`;
      message += `• Total Settled Payments: ₹${Number(this.ledger.TotalPaid || 0).toFixed(2)}\n`;
      message += `• Total Goods Returned: ₹${Number(this.ledger.TotalReturns || 0).toFixed(2)}\n`;
      message += `👉 *OUTSTANDING BALANCE (Baqi Hai): ₹${Number(this.ledger.BalanceDue || 0).toFixed(2)}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Please verify this entry in your accounts.\n`;
      message += `Thank you for your business!`;

      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    },

    sendWhatsAppLedgerStatement() {
      if (!this.ledger) return;

      const merchantName = this.ledger.MerchantName || 'Merchant';
      let phone = this.ledger.WhatsApp || this.ledger.Contact;

      let cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : '';
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

      if (!cleanPhone || cleanPhone.length < 10) {
        const inputPhone = prompt(`No WhatsApp contact found for "${merchantName}".\nPlease enter 10-digit mobile number:`, '');
        if (!inputPhone) return;
        cleanPhone = String(inputPhone).replace(/[^\d]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      }

      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const purchases = Number(this.ledger.TotalPurchases || 0).toFixed(2);
      const paid = Number(this.ledger.TotalPaid || 0).toFixed(2);
      const returns = Number(this.ledger.TotalReturns || 0).toFixed(2);
      const balance = Number(this.ledger.BalanceDue || 0).toFixed(2);

      let message = `📜 *ACCOUNT LEDGER STATEMENT*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🏬 *Merchant / Vendor:* ${merchantName}\n`;
      message += `📅 *Statement Date:* ${today}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💰 *Total Purchases (Billed):* ₹${purchases}\n`;
      message += `💵 *Total Paid (Pay Kare):* ₹${paid}\n`;
      message += `🔄 *Total Returns (Wapas Kiya):* ₹${returns}\n`;
      message += `👉 *OUTSTANDING BALANCE (Baqi Hai): ₹${balance}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💳 *Payment Mode Split:*\n`;
      message += `• Cash Paid: ₹${Number(this.ledger.TotalCashPaid || 0).toFixed(2)}\n`;
      message += `• Credit Purchases: ₹${Number(this.ledger.TotalCreditPurchases || 0).toFixed(2)}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Total Transactions: ${this.ledger.Entries ? this.ledger.Entries.length : 0}\n`;
      message += `Please review and settle any pending balance.\n`;
      message += `Thank you!`;

      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
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
    viewEntryDetails(entry) {
      this.selectedEntry = entry;
      if (this.itemDetailsModalInstance) {
        this.itemDetailsModalInstance.show();
      }
    },
    closeItemDetailsModal() {
      if (this.itemDetailsModalInstance) {
        this.itemDetailsModalInstance.hide();
      }
    },
    modalHeaderClass(type) {
      const t = (type || '').toUpperCase();
      if (t === 'PURCHASE' || t === 'INVOICE') return 'bg-danger text-white';
      if (t === 'RETURN') return 'bg-primary text-white';
      if (t === 'PAYMENT') return 'bg-success text-white';
      return 'bg-dark text-white';
    },
    modalHeaderIcon(type) {
      const t = (type || '').toUpperCase();
      if (t === 'PURCHASE' || t === 'INVOICE') return 'bi-box-arrow-in-down';
      if (t === 'RETURN') return 'bi-arrow-return-left';
      if (t === 'PAYMENT') return 'bi-cash-coin';
      return 'bi-receipt';
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
