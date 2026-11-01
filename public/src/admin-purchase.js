const AdminPurchase = {
  template: `
    <div class="container-fluid my-4">
      <style>
        .po-row {
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        .po-row:hover {
          background-color: #f0fdf4 !important;
        }
        .po-row:hover td {
          background-color: transparent !important;
        }
        .nav-btn-active {
          box-shadow: 0 4px 10px rgba(0,0,0,0.12) !important;
          transform: translateY(-1px);
        }
        .badge-route-a {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }
        .badge-route-b {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
      </style>

      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
           <div class="d-flex align-items-center mb-1">
              <router-link :to="'/admin/merchants/' + merchantFilterId" class="btn btn-sm btn-outline-secondary me-3" v-if="merchantFilterId">
                 <i class="bi bi-arrow-left me-1"></i> Back to Merchant
              </router-link>
              <h4 class="mb-0 fw-bold text-dark">
                 <i class="bi bi-cart-check me-2 text-success"></i> 
                 {{ merchantFilterId ? (currentMerchantName + ' - Purchase Orders') : 'Purchase & Procurement Management' }}
              </h4>
           </div>
           <p class="text-muted small mb-0">
              {{ merchantFilterId ? ('Showing purchase orders specifically for ' + currentMerchantName) : 'Manage procurement orders, goods receipt notes (GRN Floor Store FL01), invoices, and vendor returns.' }}
           </p>
        </div>
        <div class="d-flex gap-2">
           <router-link :to="'/admin/merchants/' + merchantFilterId + '/ledger'" class="btn btn-outline-primary fw-bold shadow-sm" v-if="merchantFilterId">
              <i class="bi bi-journal-text me-1"></i> View Merchant Ledger
           </router-link>
           <button class="btn btn-success shadow-sm fw-bold px-4 transition-all" @click="handlePrimaryAction()">
              <i class="bi bi-plus-lg me-1"></i> 
              {{ primaryActionLabel }}
           </button>
        </div>
      </div>

      <!-- Sub-Navigation (6 Tabs) - Hidden when filtering by merchant so it strictly shows the purchase-order view -->
      <div class="row g-2 mb-4" v-if="!merchantFilterId">
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'purchasecart' ? 'btn-success text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('purchasecart')">
               <i class="bi bi-cart me-1"></i> Cart
               <span class="badge bg-white text-success ms-1" v-if="cartCount > 0">{{ cartCount }}</span>
            </button>
         </div>
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'purchase-order' ? 'btn-primary text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('purchase-order')">
               <i class="bi bi-list-check me-1"></i> PO Orders
               <span class="badge bg-white text-primary ms-1" v-if="orderedCount > 0">{{ orderedCount }}</span>
            </button>
         </div>
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'po-approval' ? 'btn-warning text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('po-approval')">
               <i class="bi bi-shield-check me-1"></i> Approvals
               <span class="badge bg-danger text-white ms-1" v-if="pendingCount > 0">{{ pendingCount }}</span>
            </button>
         </div>
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'purchase-grn' ? 'btn-info text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('purchase-grn')">
               <i class="bi bi-box-arrow-in-down me-1"></i> GRN (Receipts)
               <span class="badge bg-white text-info ms-1" v-if="grns.length > 0">{{ grns.length }}</span>
            </button>
         </div>
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'purchase-invoices' ? 'btn-dark text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('purchase-invoices')">
               <i class="bi bi-receipt me-1"></i> Invoices
               <span class="badge bg-danger text-white ms-1" v-if="unpaidInvoiceCount > 0">{{ unpaidInvoiceCount }}</span>
            </button>
         </div>
         <div class="col-md-2 col-6">
            <button class="btn w-100 shadow-sm fw-bold py-2 border-0 transition-all text-truncate" :class="activeTab === 'purchase-return' ? 'btn-danger text-white nav-btn-active' : 'btn-white text-dark'" @click="navigateTo('purchase-return')">
               <i class="bi bi-arrow-return-left me-1"></i> Returns
               <span class="badge bg-white text-danger ms-1" v-if="returns.length > 0">{{ returns.length }}</span>
            </button>
         </div>
      </div>

      <!-- Filters & Search bar -->
      <div class="row g-3 mb-4">
         <div class="col-md-12">
            <div class="card border-0 shadow-sm">
               <div class="card-body p-2 d-flex align-items-center">
                  <div class="input-group input-group-sm">
                     <span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>
                     <input type="text" class="form-control border-start-0" :placeholder="searchPlaceholder" v-model="search">
                  </div>
                  <button class="btn btn-sm btn-outline-secondary ms-2 text-nowrap" @click="refreshData">
                     <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                  </button>
               </div>
            </div>
         </div>
      </div>

      <!-- VIEW 1: PO / Cart / Approvals Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="['purchasecart', 'purchase-order', 'po-approval'].includes(activeTab)">
         <div v-if="activeTab === 'po-approval' && !canApprove" class="alert alert-warning border-0 rounded-0 mb-0 py-2 px-4 small d-flex align-items-center">
            <i class="bi bi-shield-lock-fill me-2 fs-6"></i>
            <span><strong>Read-Only View:</strong> Only users with role <strong>Superadmin, Admin, Manager, Accountant,</strong> or <strong>Account Manager</strong> can approve purchase orders.</span>
         </div>
         <div class="table-responsive">
           <table class="table align-middle mb-0">
             <thead class="bg-dark text-white small text-uppercase fw-bold">
               <tr>
                 <th class="ps-4">PO #</th>
                 <th>Merchant</th>
                 <th>Warehouse</th>
                 <th>{{ activeTab === 'purchasecart' ? 'Expected' : 'Delivery Date' }}</th>
                 <th>Total Amt</th>
                 <th>Status</th>
                 <th class="text-end pe-4">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="po in filteredPOs" :key="po.POID" class="po-row" @click="openModal(po)" style="cursor: pointer;" title="Click row to edit order">
                 <td class="ps-4">
                    <div class="fw-bold">PO-{{ String(po.POID).padStart(5, '0') }}</div>
                    <div class="x-small text-muted">{{ formatDate(po.CreatedAt) }}</div>
                 </td>
                 <td>
                    <div class="small fw-bold">{{ po.MerchantName }}</div>
                    <router-link :to="'/admin/merchants/' + po.MerchantID + '/ledger'" class="x-small text-decoration-none text-primary" @click.stop>
                       <i class="bi bi-journal-text me-1"></i> Ledger
                    </router-link>
                 </td>
                 <td>
                    <div class="small">{{ po.WarehouseName }}</div>
                 </td>
                 <td>
                    <span class="badge bg-light text-dark fw-normal">{{ po.ExpectedDate ? formatDate(po.ExpectedDate) : 'Not Set' }}</span>
                 </td>
                 <td class="fw-bold text-success">₹{{ (po.TotalAmount || 0).toFixed(2) }}</td>
                 <td>
                    <span class="badge" :class="statusBadge(po.Status)">{{ (po.Status || 'draft').toUpperCase() }}</span>
                 </td>
                 <td class="text-end pe-4" @click.stop>
                    <div class="d-inline-flex align-items-center gap-2">
                       <!-- Cart Actions -->
                       <button v-if="activeTab === 'purchasecart' || po.Status === 'draft'" class="btn btn-warning btn-sm fw-bold px-3 shadow-sm text-dark border-0" @click.stop="sendToApproval(po)" title="Send to Approval">
                          <i class="bi bi-send-fill me-1"></i> Send to Approval
                       </button>

                       <!-- Approval Actions -->
                       <template v-if="po.Status === 'pending'">
                          <button v-if="canApprove" class="btn btn-success btn-sm fw-bold px-3 shadow-sm" @click.stop="updateStatus(po, 'ordered', true)" title="Approve and Release Order">
                             <i class="bi bi-check-circle me-1"></i> Approve
                          </button>
                          <button class="btn btn-danger btn-sm fw-bold px-2 shadow-sm" @click.stop="updateStatus(po, 'cancelled')" title="Reject / Cancel PO">
                             <i class="bi bi-x-circle me-1"></i> Cancel
                          </button>
                       </template>

                       <!-- Ordered Actions (WhatsApp + GRN Receipt) -->
                       <template v-if="po.Status === 'ordered'">
                          <button class="btn btn-info btn-sm fw-bold text-white shadow-sm" @click.stop="openGRNModalWithPO(po)" title="Receive items into Floor Store (FL01)">
                             <i class="bi bi-box-arrow-in-down me-1"></i> Receive GRN
                          </button>
                          <button class="btn btn-success btn-sm fw-bold shadow-sm d-flex align-items-center" @click.stop="sendWhatsApp(po)" title="Send PO to Merchant on WhatsApp">
                             <i class="bi bi-whatsapp me-1"></i> WhatsApp
                          </button>
                          <button class="btn btn-outline-dark btn-sm fw-bold shadow-sm" @click.stop="generateInvoice(po)" title="Generate Invoice">
                             <i class="bi bi-receipt me-1"></i> Invoice
                          </button>
                       </template>

                       <!-- Received / Done Actions -->
                       <template v-if="po.Status === 'received'">
                          <span class="badge bg-success-subtle text-success border border-success-subtle py-2 px-2 fw-bold">
                             <i class="bi bi-check2-all me-1"></i> Received (FL01)
                          </span>
                       </template>

                       <!-- Delete button for drafts -->
                       <button v-if="po.Status === 'draft'" class="btn btn-link text-danger p-0 ms-2" @click.stop="deletePO(po.POID)" title="Delete Order">
                          <i class="bi bi-trash fs-6"></i>
                       </button>
                    </div>
                 </td>
               </tr>
               <tr v-if="filteredPOs.length === 0">
                 <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                    No purchase orders found matching this view.
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- VIEW 2: Goods Received Note (GRN) Table (ROUTE-A & ROUTE-B) -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="activeTab === 'purchase-grn'">
         <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
            <div>
               <h5 class="fw-bold mb-1"><i class="bi bi-box-arrow-in-down text-info me-2"></i> Goods Received Notes (GRN)</h5>
               <p class="text-muted small mb-0">Direct & PO Receipts automatically added to Warehouse <strong>Floor Store (Shelf FL01)</strong> with receiver officer tracking.</p>
            </div>
            <button class="btn btn-info text-white fw-bold shadow-sm px-3" @click="openGRNModal()">
               <i class="bi bi-plus-lg me-1"></i> New GRN Receipt
            </button>
         </div>
         <div class="table-responsive">
           <table class="table align-middle mb-0">
             <thead class="bg-dark text-white small text-uppercase fw-bold">
               <tr>
                 <th class="ps-4">GRN #</th>
                 <th>Type / Route</th>
                 <th>PO Ref</th>
                 <th>Merchant</th>
                 <th>Warehouse Destination</th>
                  <th>Payment Mode</th>
                 <th>Received By (Officer)</th>
                 <th>Received At</th>
                 <th>Total Amount</th>
                 <th class="text-end pe-4">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="g in filteredGRNs" :key="g.GRNID">
                 <td class="ps-4">
                    <div class="fw-bold text-dark">{{ g.GRNNumber || ('GRN-' + g.GRNID) }}</div>
                    <div class="x-small text-muted">{{ formatDate(g.CreatedAt) }}</div>
                 </td>
                 <td>
                    <span v-if="g.Type === 'PO'" class="badge badge-route-a px-2 py-1 fw-bold">
                       <i class="bi bi-link-45deg me-1"></i> ROUTE-A: Against PO
                    </span>
                    <span v-else class="badge badge-route-b px-2 py-1 fw-bold">
                       <i class="bi bi-lightning-charge me-1"></i> ROUTE-B: Direct Vendor
                    </span>
                 </td>
                 <td>
                    <span v-if="g.POID" class="badge bg-light text-primary border fw-bold">
                       PO-{{ String(g.POID).padStart(5, '0') }}
                    </span>
                    <span v-else class="text-muted small">Direct / No PO</span>
                 </td>
                 <td>
                    <div class="small fw-bold">{{ g.MerchantName }}</div>
                    <router-link :to="'/admin/merchants/' + g.MerchantID + '/ledger'" class="x-small text-decoration-none text-primary">
                       <i class="bi bi-journal-text me-1"></i> Ledger
                    </router-link>
                 </td>
                 <td>
                    <div class="small fw-bold text-dark">{{ g.WarehouseName }}</div>
                    <div class="badge bg-success-subtle text-success border border-success-subtle x-small">
                       <i class="bi bi-geo-alt-fill me-1"></i> Floor Store (Shelf FL01)
                    </div>
                 </td>
                 <td>
                    <span class="badge px-2 py-1 fw-bold text-uppercase" :class="(g.PaymentMode || 'credit') === 'cash' ? 'bg-success text-white' : 'bg-secondary text-white'">
                       <i class="bi me-1" :class="(g.PaymentMode || 'credit') === 'cash' ? 'bi-cash-stack' : 'bi-credit-card'"></i>
                       {{ g.PaymentMode || 'credit' }}
                    </span>
                 </td>
                 <td>
                    <div class="small fw-bold text-dark">
                       <i class="bi bi-person-badge text-secondary me-1"></i> {{ g.ReceivedByName || 'Officer' }}
                    </div>
                    <div class="x-small text-muted">ID: {{ g.ReceivedByID || 'N/A' }}</div>
                 </td>
                 <td>
                    <span class="small text-muted">{{ formatDateTime(g.ReceivedAt || g.CreatedAt) }}</span>
                 </td>
                 <td class="fw-bold text-success">₹{{ (g.TotalAmount || 0).toFixed(2) }}</td>
                 <td class="text-end pe-4">
                    <div class="btn-group btn-group-sm">
                       <button class="btn btn-outline-info fw-bold shadow-sm" @click="viewGRNDetails(g)">
                          <i class="bi bi-eye me-1"></i> View ({{ (g.Items || []).length }})
                       </button>
                       <button class="btn btn-outline-secondary fw-bold shadow-sm" @click="openEditGRN(g)">
                          <i class="bi bi-pencil-square me-1"></i> Edit
                       </button>
                    </div>
                 </td>
               </tr>
               <tr v-if="filteredGRNs.length === 0">
                 <td colspan="10" class="text-center py-5 text-muted">
                    <i class="bi bi-box-seam fs-1 d-block mb-2 text-secondary"></i>
                    No Goods Received Notes found. Click <strong>"New GRN Receipt"</strong> to receive stock.
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- VIEW 3: Purchase Invoices Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="activeTab === 'purchase-invoices'">
         <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
            <div>
               <h5 class="fw-bold mb-1"><i class="bi bi-receipt text-dark me-2"></i> Purchase Invoices & Settlements</h5>
               <p class="text-muted small mb-0">Vendor invoices, payment mode tracking (Cash, Bank, UPI), and ledger settlement.</p>
            </div>
            <button class="btn btn-dark fw-bold shadow-sm px-3" @click="openInvoiceModal()">
               <i class="bi bi-plus-lg me-1"></i> New Invoice
            </button>
         </div>
         <div class="table-responsive">
           <table class="table align-middle mb-0">
             <thead class="bg-dark text-white small text-uppercase fw-bold">
               <tr>
                 <th class="ps-4">Invoice #</th>
                 <th>PO Ref</th>
                 <th>Merchant</th>
                 <th>Date</th>
                 <th>Total Amount</th>
                 <th>Paid Amount</th>
                 <th>Balance Due</th>
                 <th>Mode</th>
                 <th>Status</th>
                 <th class="text-end pe-4">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="inv in filteredInvoices" :key="inv.InvoiceID">
                 <td class="ps-4">
                    <div class="fw-bold text-dark">{{ inv.InvoiceNo }}</div>
                    <div class="x-small text-muted" v-if="inv.MerchantInvoiceNo">Vendor Bill: {{ inv.MerchantInvoiceNo }}</div>
                 </td>
                 <td>
                    <span v-if="inv.POID" class="badge bg-light text-primary border">PO-{{ String(inv.POID).padStart(5, '0') }}</span>
                    <span v-else class="text-muted small">Direct</span>
                 </td>
                 <td>
                    <div class="small fw-bold">{{ inv.MerchantName }}</div>
                    <router-link :to="'/admin/merchants/' + (inv.MerchantID || 1) + '/ledger'" class="x-small text-decoration-none text-primary">
                       <i class="bi bi-journal-text me-1"></i> Ledger
                    </router-link>
                 </td>
                 <td class="small">{{ formatDate(inv.Date || inv.CreatedAt) }}</td>
                 <td class="fw-bold text-dark">₹{{ (inv.Amount || 0).toFixed(2) }}</td>
                 <td class="fw-bold text-success">₹{{ (inv.PaidAmount || 0).toFixed(2) }}</td>
                 <td class="fw-bold" :class="(inv.Amount - (inv.PaidAmount || 0)) > 0 ? 'text-danger' : 'text-muted'">
                    ₹{{ Math.max(0, (inv.Amount || 0) - (inv.PaidAmount || 0)).toFixed(2) }}
                 </td>
                 <td>
                    <span class="badge bg-light text-dark text-uppercase border">{{ inv.PaymentMode || 'credit' }}</span>
                 </td>
                 <td>
                    <span class="badge" :class="invoiceStatusBadge(inv.Status)">{{ (inv.Status || 'unpaid').toUpperCase() }}</span>
                 </td>
                 <td class="text-end pe-4">
                    <div class="d-inline-flex gap-2">
                       <button v-if="(inv.Status || '').toLowerCase() !== 'paid'" class="btn btn-success btn-sm fw-bold px-3 shadow-sm" @click="openPaymentModal(inv)">
                          <i class="bi bi-cash-stack me-1"></i> Pay / Settle
                       </button>
                       <button class="btn btn-link text-danger p-0 ms-2" @click="deleteInvoice(inv.InvoiceID)" title="Delete invoice">
                          <i class="bi bi-trash"></i>
                       </button>
                    </div>
                 </td>
               </tr>
               <tr v-if="filteredInvoices.length === 0">
                 <td colspan="10" class="text-center py-5 text-muted">
                    <i class="bi bi-receipt-cutoff fs-1 d-block mb-2 text-secondary"></i>
                    No purchase invoices found.
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- VIEW 4: Purchase Returns Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="activeTab === 'purchase-return'">
         <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
            <div>
               <h5 class="fw-bold mb-1"><i class="bi bi-arrow-return-left text-danger me-2"></i> Purchase Returns (Vendor Returns)</h5>
               <p class="text-muted small mb-0">Record items returned to vendors. Automatically deducts stock from Warehouse <strong>Floor Store (Shelf FL01)</strong> and credits Merchant Ledger.</p>
            </div>
            <button class="btn btn-danger text-white fw-bold shadow-sm px-3" @click="openReturnModal()">
               <i class="bi bi-plus-lg me-1"></i> Record Return
            </button>
         </div>
         <div class="table-responsive">
           <table class="table align-middle mb-0">
             <thead class="bg-dark text-white small text-uppercase fw-bold">
               <tr>
                 <th class="ps-4">Return #</th>
                 <th>Date</th>
                 <th>Merchant</th>
                 <th>Warehouse Source</th>
                 <th>Reason / Remarks</th>
                 <th>Total Value</th>
                 <th class="text-end pe-4">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="ret in filteredReturns" :key="ret.ReturnID">
                 <td class="ps-4">
                    <div class="fw-bold text-danger">{{ ret.ReturnNo || ('PR-' + ret.ReturnID) }}</div>
                 </td>
                 <td class="small">{{ formatDate(ret.CreatedAt) }}</td>
                 <td>
                    <div class="small fw-bold">{{ ret.MerchantName }}</div>
                    <router-link :to="'/admin/merchants/' + ret.MerchantID + '/ledger'" class="x-small text-decoration-none text-primary">
                       <i class="bi bi-journal-text me-1"></i> Ledger
                    </router-link>
                 </td>
                 <td>
                    <div class="small fw-bold">{{ ret.WarehouseName }}</div>
                    <div class="badge bg-danger-subtle text-danger border border-danger-subtle x-small">
                       Deducted from Floor Store (FL01)
                    </div>
                 </td>
                 <td class="small text-muted">{{ ret.Reason || 'Return to vendor' }}</td>
                 <td class="fw-bold text-danger">₹{{ (ret.TotalAmount || 0).toFixed(2) }}</td>
                 <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger fw-bold px-3 shadow-sm" @click="viewReturnDetails(ret)">
                       <i class="bi bi-eye me-1"></i> View Items ({{ (ret.Items || []).length }})
                    </button>
                 </td>
               </tr>
               <tr v-if="filteredReturns.length === 0">
                 <td colspan="7" class="text-center py-5 text-muted">
                    <i class="bi bi-arrow-return-left fs-1 d-block mb-2 text-secondary"></i>
                    No purchase returns recorded yet.
                 </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- MODAL 1: PO Creation / Edit Modal -->
      <div class="modal fade" id="poModal" tabindex="-1" ref="poModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 {{ isEditing ? 'Edit Purchase Order' : (activeTab === 'purchasecart' || isIncharge ? 'Add To Cart' : 'Create Purchase Order') }}
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal()"></button>
            </div>
            <div class="modal-body p-4">
              <form @submit.prevent="savePO">
                <div class="row g-3 mb-3">
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Merchant / Vendor <span class="text-danger">*</span></label>
                    <select class="form-select" v-model.number="formData.MerchantID" required :disabled="!!merchantFilterId">
                       <option :value="null">Select Merchant</option>
                       <option v-for="m in merchants" :key="m.MerchantID" :value="m.MerchantID">{{ m.Name }}</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Destination Warehouse <span class="text-danger">*</span></label>
                    <select class="form-select" v-model.number="formData.WarehouseID" required>
                       <option :value="null">Select Warehouse</option>
                       <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                    </select>
                  </div>
                </div>

                <div class="row g-3 mb-4">
                  <div class="col-md-6">
                    <label class="form-label small fw-bold">Expected Delivery Date</label>
                    <input type="date" class="form-control" v-model="formData.ExpectedDate">
                  </div>
                  <div class="col-md-6" v-if="!isIncharge && activeTab !== 'purchasecart'">
                    <label class="form-label small fw-bold">Order Status</label>
                    <select class="form-select" v-model="formData.Status">
                       <option value="draft">Draft (Cart)</option>
                       <option value="pending">Pending Approval</option>
                       <option value="ordered">Ordered</option>
                       <option value="received">Received</option>
                    </select>
                  </div>
                </div>

                <!-- Add Items Section -->
                <div class="card bg-light border-0 mb-4 p-3">
                   <h6 class="fw-bold mb-3"><i class="bi bi-box me-1"></i> Add Items to Order</h6>
                   <div class="position-relative">
                      <div class="input-group">
                         <span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>
                         <input type="text" class="form-control border-start-0" placeholder="Search catalog items by name, SKU or size..." v-model="productSearch" @input="searchProducts">
                      </div>
                      
                      <!-- Product Search Dropdown -->
                      <div class="list-group position-absolute w-100 shadow-lg mt-1" style="max-height: 220px; overflow-y: auto; z-index: 1050;" v-if="showProductList && searchResults.length > 0">
                         <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" v-for="prod in searchResults" :key="prod.VariantID" @click="addItem(prod)">
                            <div>
                               <div class="fw-bold small">{{ prod.variantName }}</div>
                               <div class="x-small text-muted">SKU: {{ prod.SKU }} | Available: {{ prod.Unit }}</div>
                            </div>
                            <span class="badge bg-primary rounded-pill"><i class="bi bi-plus-lg"></i> Select</span>
                         </button>
                      </div>
                   </div>
                </div>

                <!-- Items Table -->
                <div class="table-responsive mb-4" v-if="formData.Items.length > 0">
                   <table class="table table-bordered table-sm align-middle">
                      <thead class="bg-secondary text-white small">
                         <tr>
                            <th>Item Name</th>
                            <th style="width: 130px;">UOM</th>
                            <th style="width: 100px;">Qty</th>
                            <th style="width: 120px;">Unit Cost</th>
                            <th style="width: 120px;">Total</th>
                            <th style="width: 40px;"></th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr v-for="(it, idx) in formData.Items" :key="idx">
                            <td>
                               <div class="small fw-bold">{{ it.VariantName }}</div>
                               <div class="x-small text-muted">{{ it.SKU }}</div>
                            </td>
                            <td>
                               <select class="form-select form-select-sm" v-model="it.UOM" @change="handleUOMChange(it)">
                                  <option v-for="uom in getUOMsForItem(it)" :key="uom" :value="uom">{{ uom }}</option>
                               </select>
                            </td>
                            <td>
                               <input type="number" class="form-control form-control-sm text-center" min="1" v-model.number="it.Qty" required>
                            </td>
                            <td>
                               <input type="number" step="0.01" min="0" class="form-control form-control-sm text-end" v-model.number="it.Cost">
                            </td>
                            <td class="text-end fw-bold small text-success">
                               ₹{{ ((it.Qty || 1) * (it.Cost || 0)).toFixed(2) }}
                            </td>
                            <td class="text-center">
                               <button type="button" class="btn btn-link text-danger p-0" @click="removeItem(idx)">
                                  <i class="bi bi-x-circle fs-6"></i>
                               </button>
                            </td>
                         </tr>
                      </tbody>
                      <tfoot>
                         <tr class="table-active">
                            <td colspan="4" class="text-end fw-bold">Order Total:</td>
                            <td class="text-end fw-bold text-success fs-6">₹{{ calculateTotal().toFixed(2) }}</td>
                            <td></td>
                         </tr>
                      </tfoot>
                   </table>
                </div>
                <div v-else class="alert alert-secondary py-3 text-center small mb-4">
                   <i class="bi bi-info-circle me-1"></i> No items added yet. Search and select items above.
                </div>

                <div class="d-flex justify-content-between align-items-center">
                  <div>
                     <button type="button" class="btn btn-warning fw-bold text-dark me-2" v-if="formData.POID && formData.Status === 'draft'" @click="sendPOToApproval()">
                        <i class="bi bi-send-fill me-1"></i> Submit to Approval
                     </button>
                  </div>
                  <div class="d-flex gap-2">
                     <button type="button" class="btn btn-outline-secondary" @click="closeModal()">Cancel</button>
                     <button type="submit" class="btn btn-success fw-bold px-4" :disabled="saving">
                        <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                        {{ isEditing ? 'Save Changes' : (activeTab === 'purchasecart' || isIncharge ? 'Add To Cart' : 'Create Order') }}
                     </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 2: Goods Received Note (GRN) Creation Modal (ROUTE-A vs ROUTE-B) -->
      <div class="modal fade" id="grnModal" tabindex="-1" ref="grnModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-info text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-box-arrow-in-down me-2"></i> Receive Goods (GRN Entry)
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeGRNModal()"></button>
            </div>
            <div class="modal-body p-4">
               <!-- Route Selection Pills -->
               <div class="d-flex gap-2 mb-4">
                  <button type="button" class="btn flex-fill py-2 fw-bold" :class="grnRoute === 'A' ? 'btn-primary' : 'btn-outline-primary'" @click="setGRNRoute('A')">
                     <i class="bi bi-link-45deg me-1"></i> ROUTE-A: Against Approved PO
                  </button>
                  <button type="button" class="btn flex-fill py-2 fw-bold" :class="grnRoute === 'B' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'" @click="setGRNRoute('B')">
                     <i class="bi bi-lightning-charge me-1"></i> ROUTE-B: Direct Vendor Purchase
                  </button>
               </div>

               <!-- Auto Destination Notice -->
               <div class="alert alert-success border-0 py-2 px-3 small d-flex align-items-center mb-3">
                  <i class="bi bi-check-circle-fill me-2 fs-5"></i>
                  <div>
                     <strong>Auto Inventory Location:</strong> Received items will be automatically stocked into the Warehouse's <strong>Floor Store (Shelf FL01)</strong>.
                  </div>
               </div>

               <!-- Officer & Receiver Tracking Box -->
               <div class="card border-0 bg-light p-3 mb-3">
                  <div class="fw-bold small text-dark mb-2"><i class="bi bi-person-badge-fill me-1 text-primary"></i> Receiving Officer & Payment Details</div>
                  <div class="row g-2">
                     <div class="col-md-3">
                        <label class="form-label x-small text-muted fw-bold mb-1">Employee / User ID <span class="text-danger">*</span></label>
                        <input type="number" class="form-control form-control-sm" v-model.number="grnForm.ReceivedByID" placeholder="e.g. 101" required>
                     </div>
                     <div class="col-md-3">
                        <label class="form-label x-small text-muted fw-bold mb-1">Receiver Officer Name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control form-control-sm" v-model="grnForm.ReceivedByName" placeholder="Officer Full Name" required>
                     </div>
                     <div class="col-md-3">
                        <label class="form-label x-small text-muted fw-bold mb-1">Received Date & Time</label>
                        <input type="datetime-local" class="form-control form-control-sm" v-model="grnForm.ReceivedAt">
                     </div>
                     <div class="col-md-3">
                        <label class="form-label x-small text-muted fw-bold mb-1">Payment Mode <span class="text-danger">*</span></label>
                        <select class="form-select form-select-sm fw-bold border-primary" v-model="grnForm.PaymentMode" required>
                           <option value="credit">CREDIT (Payable Later)</option>
                           <option value="cash">CASH (Paid on Receipt)</option>
                        </select>
                     </div>
                  </div>
               </div>

               <!-- ROUTE-A FORM: AGAINST APPROVED PO -->
               <div v-if="grnRoute === 'A'">
                  <div class="mb-3">
                     <label class="form-label small fw-bold">Select Approved Purchase Order <span class="text-danger">*</span></label>
                     <select class="form-select" v-model.number="grnForm.POID" @change="onSelectPOForGRN">
                        <option :value="null">-- Select Ordered PO --</option>
                        <option v-for="p in orderedPOs" :key="p.POID" :value="p.POID">
                           PO-{{ String(p.POID).padStart(5, '0') }} - {{ p.MerchantName }} ({{ p.WarehouseName }}) - ₹{{ (p.TotalAmount || 0).toFixed(2) }}
                        </option>
                     </select>
                  </div>

                  <div v-if="selectedPOForGRN" class="card border p-3 mb-3 bg-white">
                     <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="small fw-bold">Vendor: {{ selectedPOForGRN.MerchantName }}</span>
                        <span class="small text-muted">Warehouse: {{ selectedPOForGRN.WarehouseName }}</span>
                     </div>

                     <div class="table-responsive">
                        <table class="table table-sm align-middle mb-0">
                           <thead class="bg-light small">
                              <tr>
                                 <th>Item</th>
                                 <th style="width: 100px;">UOM</th>
                                 <th style="width: 100px;">Qty</th>
                                 <th style="width: 120px;">Unit Cost</th>
                                 <th style="width: 120px;" class="text-end">Subtotal</th>
                              </tr>
                           </thead>
                           <tbody>
                              <tr v-for="it in grnForm.Items" :key="it.VariantID">
                                 <td class="small fw-bold">{{ it.VariantName }}</td>
                                 <td class="small">{{ it.UOM }}</td>
                                 <td>
                                    <input type="number" class="form-control form-control-sm text-center" min="1" v-model.number="it.Qty">
                                 </td>
                                 <td>
                                    <input type="number" step="0.01" class="form-control form-control-sm text-end" v-model.number="it.Cost">
                                 </td>
                                 <td class="text-end fw-bold small text-success">
                                    ₹{{ ((it.Qty || 1) * (it.Cost || 0)).toFixed(2) }}
                                 </td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div class="mb-3">
                     <label class="form-label small fw-bold">Remarks / Inspection Notes</label>
                     <input type="text" class="form-control" v-model="grnForm.Remarks" placeholder="e.g. Inspected and verified in good condition">
                  </div>
               </div>

               <!-- ROUTE-B FORM: DIRECT VENDOR PURCHASE -->
               <div v-if="grnRoute === 'B'">
                  <div class="row g-3 mb-3">
                     <div class="col-md-6">
                        <label class="form-label small fw-bold">Merchant / Vendor <span class="text-danger">*</span></label>
                        <select class="form-select" v-model.number="grnForm.MerchantID">
                           <option :value="null">Select Vendor</option>
                           <option v-for="m in merchants" :key="m.MerchantID" :value="m.MerchantID">{{ m.Name }}</option>
                        </select>
                     </div>
                     <div class="col-md-6">
                        <label class="form-label small fw-bold">Destination Warehouse <span class="text-danger">*</span></label>
                        <select class="form-select" v-model.number="grnForm.WarehouseID">
                           <option :value="null">Select Warehouse</option>
                           <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                        </select>
                     </div>
                  </div>

                  <!-- Catalog Search for Direct GRN -->
                  <div class="card bg-light border-0 mb-3 p-3">
                     <h6 class="fw-bold mb-2 small"><i class="bi bi-search me-1"></i> Add Items to Direct Purchase</h6>
                     <div class="position-relative">
                        <input type="text" class="form-control form-control-sm" placeholder="Search catalog items..." v-model="grnProductSearch" @input="searchGRNProducts">
                        <div class="list-group position-absolute w-100 shadow-lg mt-1" style="max-height: 200px; overflow-y: auto; z-index: 1050;" v-if="showGRNProductList && grnSearchResults.length > 0">
                           <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" v-for="prod in grnSearchResults" :key="prod.VariantID" @click="addGRNItem(prod)">
                              <div>
                                 <div class="fw-bold small">{{ prod.variantName }}</div>
                                 <div class="x-small text-muted">SKU: {{ prod.SKU }}</div>
                              </div>
                              <span class="badge bg-primary rounded-pill"><i class="bi bi-plus-lg"></i> Add</span>
                           </button>
                        </div>
                     </div>
                  </div>

                  <!-- Direct GRN Items Table -->
                  <div class="table-responsive mb-3" v-if="grnForm.Items.length > 0">
                     <table class="table table-bordered table-sm align-middle">
                        <thead class="bg-secondary text-white small">
                           <tr>
                              <th>Item Name</th>
                              <th style="width: 100px;">UOM</th>
                              <th style="width: 100px;">Qty</th>
                              <th style="width: 120px;">Unit Cost</th>
                              <th style="width: 120px;" class="text-end">Subtotal</th>
                              <th style="width: 40px;"></th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(it, idx) in grnForm.Items" :key="idx">
                              <td class="small fw-bold">{{ it.VariantName }}</td>
                              <td class="small">{{ it.UOM }}</td>
                              <td>
                                 <input type="number" class="form-control form-control-sm text-center" min="1" v-model.number="it.Qty">
                              </td>
                              <td>
                                 <input type="number" step="0.01" min="0" class="form-control form-control-sm text-end" v-model.number="it.Cost">
                              </td>
                              <td class="text-end fw-bold small text-success">
                                 ₹{{ ((it.Qty || 1) * (it.Cost || 0)).toFixed(2) }}
                              </td>
                              <td class="text-center">
                                 <button type="button" class="btn btn-link text-danger p-0" @click="removeGRNItem(idx)">
                                    <i class="bi bi-x-circle"></i>
                                 </button>
                              </td>
                           </tr>
                        </tbody>
                        <tfoot>
                           <tr class="table-active">
                              <td colspan="4" class="text-end fw-bold">Total Amount:</td>
                              <td class="text-end fw-bold text-success">₹{{ calculateGRNTotal().toFixed(2) }}</td>
                              <td></td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>

                  <div class="mb-3">
                     <label class="form-label small fw-bold">Remarks / Reference</label>
                     <input type="text" class="form-control" v-model="grnForm.Remarks" placeholder="e.g. Direct Vendor Spot Purchase">
                  </div>
               </div>

               <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-outline-secondary" @click="closeGRNModal()">Cancel</button>
                  <button type="button" class="btn btn-success fw-bold px-4" :disabled="savingGRN" @click="submitGRN()">
                     <span v-if="savingGRN" class="spinner-border spinner-border-sm me-1"></span>
                     <i class="bi bi-check-lg me-1"></i> Receive & Stock in Floor Store (FL01)
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 3: GRN Details Modal -->
      <div class="modal fade" id="grnDetailsModal" tabindex="-1" ref="grnDetailsModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedGRN">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-box-seam me-2"></i> {{ selectedGRN.GRNNumber || ('GRN-' + selectedGRN.GRNID) }} Details
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeGRNDetailsModal()"></button>
            </div>
            <div class="modal-body p-4">
               <div class="row g-3 mb-4">
                  <div class="col-md-3">
                     <div class="text-muted x-small text-uppercase fw-bold">Route Type</div>
                     <div class="fw-bold mt-1">
                        <span v-if="selectedGRN.Type === 'PO'" class="badge badge-route-a">Route-A (PO Based)</span>
                        <span v-else class="badge badge-route-b">Route-B (Direct Purchase)</span>
                     </div>
                  </div>
                  <div class="col-md-3">
                     <div class="text-muted x-small text-uppercase fw-bold">Merchant</div>
                     <div class="fw-bold mt-1">{{ selectedGRN.MerchantName }}</div>
                  </div>
                  <div class="col-md-3">
                     <div class="text-muted x-small text-uppercase fw-bold">Warehouse Destination</div>
                     <div class="fw-bold mt-1">{{ selectedGRN.WarehouseName }}</div>
                     <div class="badge bg-success-subtle text-success border border-success-subtle x-small mt-1">
                        {{ selectedGRN.StoreName || 'Floor Store' }} ({{ selectedGRN.ShelfCode || 'FL01' }})
                     </div>
                  </div>
                  <div class="col-md-3">
                     <div class="text-muted x-small text-uppercase fw-bold">Received Officer</div>
                     <div class="fw-bold mt-1 text-primary">{{ selectedGRN.ReceivedByName || 'Officer' }}</div>
                     <div class="x-small text-muted">ID: {{ selectedGRN.ReceivedByID || 'N/A' }}</div>
                     <div class="x-small text-muted">{{ formatDateTime(selectedGRN.ReceivedAt || selectedGRN.CreatedAt) }}</div>
                  </div>
                  <div class="col-md-3">
                     <div class="text-muted x-small text-uppercase fw-bold">Payment Mode</div>
                     <div class="mt-1">
                        <span class="badge fs-7 px-3 py-1" :class="(selectedGRN.PaymentMode || 'credit') === 'cash' ? 'bg-success text-white' : 'bg-secondary text-white'">
                           {{ (selectedGRN.PaymentMode || 'credit').toUpperCase() }}
                        </span>
                     </div>
                  </div>
               </div>

               <h6 class="fw-bold mb-2">Received Items</h6>
               <div class="table-responsive">
                  <table class="table table-bordered table-sm align-middle">
                     <thead class="bg-light small">
                        <tr>
                           <th>#</th>
                           <th>Item Name</th>
                           <th class="text-center">UOM</th>
                           <th class="text-center">Qty Received</th>
                           <th class="text-end">Unit Cost</th>
                           <th class="text-end">Subtotal</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(it, idx) in selectedGRN.Items" :key="idx">
                           <td class="text-muted">{{ idx + 1 }}</td>
                           <td class="fw-bold small">{{ it.VariantName || ('Item #' + it.VariantID) }}</td>
                           <td class="text-center small">{{ it.UOM || 'PCS' }}</td>
                           <td class="text-center fw-bold">{{ it.Qty }}</td>
                           <td class="text-end">₹{{ (it.Cost || 0).toFixed(2) }}</td>
                           <td class="text-end fw-bold text-success">₹{{ (it.Subtotal || (it.Qty * it.Cost) || 0).toFixed(2) }}</td>
                        </tr>
                     </tbody>
                     <tfoot>
                        <tr class="table-light">
                           <td colspan="5" class="text-end fw-bold">Total GRN Amount:</td>
                           <td class="text-end fw-bold text-success fs-6">₹{{ (selectedGRN.TotalAmount || 0).toFixed(2) }}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary fw-bold" @click="closeGRNDetailsModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 4: Purchase Return Creation Modal -->
      <div class="modal fade" id="returnModal" tabindex="-1" ref="returnModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-arrow-return-left me-2"></i> Record Purchase Return
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeReturnModal()"></button>
            </div>
            <div class="modal-body p-4">
               <div class="alert alert-warning border-0 py-2 px-3 small d-flex align-items-center mb-3">
                  <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                  <div>
                     <strong>Stock Deduction:</strong> Returned items will be deducted from the Warehouse's <strong>Floor Store (Shelf FL01)</strong> and a credit balance posted to the Merchant's Ledger.
                  </div>
               </div>

               <div class="row g-3 mb-3">
                  <div class="col-md-6">
                     <label class="form-label small fw-bold">Merchant / Vendor <span class="text-danger">*</span></label>
                     <select class="form-select" v-model.number="returnForm.MerchantID" required>
                        <option :value="null">Select Vendor</option>
                        <option v-for="m in merchants" :key="m.MerchantID" :value="m.MerchantID">{{ m.Name }}</option>
                     </select>
                  </div>
                  <div class="col-md-6">
                     <label class="form-label small fw-bold">Source Warehouse <span class="text-danger">*</span></label>
                     <select class="form-select" v-model.number="returnForm.WarehouseID" required>
                        <option :value="null">Select Warehouse</option>
                        <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                     </select>
                  </div>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Return Reason / Notes</label>
                  <input type="text" class="form-control" v-model="returnForm.Reason" placeholder="e.g. Damaged goods, expired stock, wrong specifications">
               </div>

               <!-- Add Items to Return -->
               <div class="card bg-light border-0 mb-3 p-3">
                  <h6 class="fw-bold mb-2 small"><i class="bi bi-search me-1"></i> Add Items to Return</h6>
                  <div class="position-relative">
                     <input type="text" class="form-control form-control-sm" placeholder="Search catalog items..." v-model="returnProductSearch" @input="searchReturnProducts">
                     <div class="list-group position-absolute w-100 shadow-lg mt-1" style="max-height: 200px; overflow-y: auto; z-index: 1050;" v-if="showReturnProductList && returnSearchResults.length > 0">
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" v-for="prod in returnSearchResults" :key="prod.VariantID" @click="addReturnItem(prod)">
                           <div>
                              <div class="fw-bold small">{{ prod.variantName }}</div>
                              <div class="x-small text-muted">SKU: {{ prod.SKU }}</div>
                           </div>
                           <span class="badge bg-danger rounded-pill"><i class="bi bi-plus-lg"></i> Add</span>
                        </button>
                     </div>
                  </div>
               </div>

               <!-- Return Items Table -->
               <div class="table-responsive mb-3" v-if="returnForm.Items.length > 0">
                  <table class="table table-bordered table-sm align-middle">
                     <thead class="bg-secondary text-white small">
                        <tr>
                           <th>Item Name</th>
                           <th style="width: 100px;">Qty</th>
                           <th style="width: 120px;">Unit Credit</th>
                           <th>Item Reason</th>
                           <th style="width: 120px;" class="text-end">Subtotal</th>
                           <th style="width: 40px;"></th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(it, idx) in returnForm.Items" :key="idx">
                           <td class="small fw-bold">{{ it.VariantName }}</td>
                           <td>
                              <input type="number" class="form-control form-control-sm text-center" min="1" v-model.number="it.Qty">
                           </td>
                           <td>
                              <input type="number" step="0.01" min="0" class="form-control form-control-sm text-end" v-model.number="it.Price">
                           </td>
                           <td>
                              <input type="text" class="form-control form-control-sm" v-model="it.Reason" placeholder="Reason">
                           </td>
                           <td class="text-end fw-bold small text-danger">
                              ₹{{ ((it.Qty || 1) * (it.Price || 0)).toFixed(2) }}
                           </td>
                           <td class="text-center">
                              <button type="button" class="btn btn-link text-danger p-0" @click="removeReturnItem(idx)">
                                 <i class="bi bi-x-circle"></i>
                              </button>
                           </td>
                        </tr>
                     </tbody>
                     <tfoot>
                        <tr class="table-active">
                           <td colspan="4" class="text-end fw-bold">Total Credit:</td>
                           <td class="text-end fw-bold text-danger">₹{{ calculateReturnTotal().toFixed(2) }}</td>
                           <td></td>
                        </tr>
                     </tfoot>
                  </table>
               </div>

               <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-outline-secondary" @click="closeReturnModal()">Cancel</button>
                  <button type="button" class="btn btn-danger fw-bold px-4" :disabled="savingReturn" @click="submitPurchaseReturn()">
                     <span v-if="savingReturn" class="spinner-border spinner-border-sm me-1"></span>
                     <i class="bi bi-arrow-return-left me-1"></i> Record Return & Deduct Stock
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 5: Return Details Modal -->
      <div class="modal fade" id="returnDetailsModal" tabindex="-1" ref="returnDetailsModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedReturn">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-arrow-return-left me-2 text-danger"></i> {{ selectedReturn.ReturnNo || ('PR-' + selectedReturn.ReturnID) }} Details
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeReturnDetailsModal()"></button>
            </div>
            <div class="modal-body p-4">
               <div class="row g-3 mb-4">
                  <div class="col-md-4">
                     <div class="text-muted x-small text-uppercase fw-bold">Merchant</div>
                     <div class="fw-bold mt-1">{{ selectedReturn.MerchantName }}</div>
                  </div>
                  <div class="col-md-4">
                     <div class="text-muted x-small text-uppercase fw-bold">Warehouse Source</div>
                     <div class="fw-bold mt-1">{{ selectedReturn.WarehouseName }} (Floor Store FL01)</div>
                  </div>
                  <div class="col-md-4">
                     <div class="text-muted x-small text-uppercase fw-bold">Return Date</div>
                     <div class="fw-bold mt-1">{{ formatDate(selectedReturn.CreatedAt) }}</div>
                  </div>
               </div>
               <div class="p-2 bg-light rounded small mb-3">
                  <strong>Return Reason:</strong> {{ selectedReturn.Reason || 'Return to vendor' }}
               </div>

               <h6 class="fw-bold mb-2">Returned Items</h6>
               <div class="table-responsive">
                  <table class="table table-bordered table-sm align-middle">
                     <thead class="bg-light small">
                        <tr>
                           <th>#</th>
                           <th>Item Name</th>
                           <th class="text-center">Qty Returned</th>
                           <th class="text-end">Unit Price</th>
                           <th>Item Reason</th>
                           <th class="text-end">Total Credit</th>
                        </tr>
                     </thead>
                     <tbody>
                        <tr v-for="(it, idx) in selectedReturn.Items" :key="idx">
                           <td class="text-muted">{{ idx + 1 }}</td>
                           <td class="fw-bold small">{{ it.VariantName || ('Item #' + it.VariantID) }}</td>
                           <td class="text-center fw-bold">{{ it.Qty }}</td>
                           <td class="text-end">₹{{ (it.Price || 0).toFixed(2) }}</td>
                           <td class="small text-muted">{{ it.Reason || selectedReturn.Reason }}</td>
                           <td class="text-end fw-bold text-danger">₹{{ ((it.Qty || 1) * (it.Price || 0)).toFixed(2) }}</td>
                        </tr>
                     </tbody>
                     <tfoot>
                        <tr class="table-light">
                           <td colspan="5" class="text-end fw-bold">Total Credit Value:</td>
                           <td class="text-end fw-bold text-danger fs-6">₹{{ (selectedReturn.TotalAmount || 0).toFixed(2) }}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary fw-bold" @click="closeReturnDetailsModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

            <!-- MODAL 7: Edit GRN Modal -->
      <div class="modal fade" id="editGRNModal" tabindex="-1" ref="editGRNModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="editingGRN">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-pencil-square me-2 text-warning"></i> Edit GRN (#{{ editingGRN.GRNNumber || editingGRN.GRNID }})
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeEditGRNModal()"></button>
            </div>
            <div class="modal-body p-4">
               <div class="card bg-light border-0 p-3 mb-3">
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Merchant:</span>
                     <span class="fw-bold">{{ editingGRN.MerchantName }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Warehouse:</span>
                     <span class="fw-bold">{{ editingGRN.WarehouseName }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Total Value:</span>
                     <span class="fw-bold text-success">₹{{ (editingGRN.TotalAmount || 0).toFixed(2) }}</span>
                  </div>
                  <div class="d-flex justify-content-between">
                     <span class="text-muted small">Received By:</span>
                     <span class="fw-bold">{{ editingGRN.ReceivedByName || 'Officer' }} (ID: {{ editingGRN.ReceivedByID || 'N/A' }})</span>
                  </div>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Payment Mode <span class="text-danger">*</span></label>
                  <select class="form-select fw-bold border-primary" v-model="editGRNForm.PaymentMode" required>
                     <option value="credit">CREDIT (Payable Later / Balance Due)</option>
                     <option value="cash">CASH (Paid Immediately on Delivery)</option>
                  </select>
                  <div class="form-text text-muted x-small">
                     Selecting <strong>CASH</strong> marks direct invoice as settled and posts matching payment to Merchant Ledger.
                  </div>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Remarks / Notes</label>
                  <textarea class="form-control" rows="3" v-model="editGRNForm.Remarks" placeholder="Update remarks or reason for change..."></textarea>
               </div>

               <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-outline-secondary" @click="closeEditGRNModal()">Cancel</button>
                  <button type="button" class="btn btn-primary fw-bold px-4" :disabled="savingEditGRN" @click="submitEditGRN()">
                     <span v-if="savingEditGRN" class="spinner-border spinner-border-sm me-1"></span>
                     <i class="bi bi-check2-circle me-1"></i> Update GRN
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

<!-- MODAL 6: Invoice Payment Settlement Modal -->
      <div class="modal fade" id="paymentModal" tabindex="-1" ref="paymentModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedInvoiceForPayment">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-cash-stack me-2"></i> Record Invoice Payment
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closePaymentModal()"></button>
            </div>
            <div class="modal-body p-4">
               <div class="card bg-light border-0 p-3 mb-3">
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Invoice No:</span>
                     <span class="fw-bold">{{ selectedInvoiceForPayment.InvoiceNo }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Merchant:</span>
                     <span class="fw-bold">{{ selectedInvoiceForPayment.MerchantName }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Total Billed:</span>
                     <span class="fw-bold text-dark">₹{{ (selectedInvoiceForPayment.Amount || 0).toFixed(2) }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                     <span class="text-muted small">Already Paid:</span>
                     <span class="fw-bold text-success">₹{{ (selectedInvoiceForPayment.PaidAmount || 0).toFixed(2) }}</span>
                  </div>
                  <div class="d-flex justify-content-between pt-2 border-top">
                     <span class="fw-bold text-danger">Balance Due:</span>
                     <span class="fw-bold text-danger fs-6">
                        ₹{{ Math.max(0, (selectedInvoiceForPayment.Amount || 0) - (selectedInvoiceForPayment.PaidAmount || 0)).toFixed(2) }}
                     </span>
                  </div>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Payment Amount (₹) <span class="text-danger">*</span></label>
                  <input type="number" step="0.01" min="0.01" class="form-control form-control-lg fw-bold text-success" v-model.number="paymentForm.Amount" required>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Payment Mode <span class="text-danger">*</span></label>
                  <select class="form-select" v-model="paymentForm.PaymentMode" required>
                     <option value="cash">Cash</option>
                     <option value="bank">Bank Transfer (NEFT/RTGS/IMPS)</option>
                     <option value="upi">UPI / QR Code</option>
                     <option value="cheque">Cheque</option>
                     <option value="credit">Credit / Adjustment</option>
                  </select>
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Transaction Ref / Cheque No</label>
                  <input type="text" class="form-control" v-model="paymentForm.ReferenceNo" placeholder="e.g. UTR12345678 or Chq# 000123">
               </div>

               <div class="mb-3">
                  <label class="form-label small fw-bold">Notes / Remarks</label>
                  <input type="text" class="form-control" v-model="paymentForm.Notes" placeholder="Payment notes...">
               </div>

               <div class="alert alert-info border-0 py-2 px-3 small mb-0">
                  <i class="bi bi-info-circle-fill me-1"></i> Recording payment will automatically update invoice status and log an entry in the Merchant's Ledger.
               </div>

               <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-outline-secondary" @click="closePaymentModal()">Cancel</button>
                  <button type="button" class="btn btn-success fw-bold px-4" :disabled="savingPayment" @click="submitInvoicePayment()">
                     <span v-if="savingPayment" class="spinner-border spinner-border-sm me-1"></span>
                     <i class="bi bi-check-lg me-1"></i> Settle Payment
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      activeTab: 'purchasecart', // purchasecart, purchase-order, po-approval, purchase-grn, purchase-invoices, purchase-return
      search: '',
      purchaseOrders: [],
      invoices: [],
      grns: [],
      returns: [],
      merchants: [],
      warehouses: [],
      allVariants: [],
      
      // Modals
      isEditing: false,
      saving: false,
      modalInstance: null,
      grnModalInstance: null,
      grnDetailsModalInstance: null,
      returnModalInstance: null,
      returnDetailsModalInstance: null,
      paymentModalInstance: null,

      // PO Form
      formData: {
        POID: null,
        MerchantID: null,
        WarehouseID: null,
        ExpectedDate: '',
        Status: 'draft',
        Items: []
      },
      productSearch: '',
      searchResults: [],
      showProductList: false,

      // GRN Form
      grnRoute: 'A', // 'A' or 'B'
      savingGRN: false,
      grnForm: {
        POID: null,
        MerchantID: null,
        WarehouseID: null,
        ReceivedByID: null,
        ReceivedByName: '',
        ReceivedAt: '',
        PaymentMode: 'credit',
        Remarks: '',
        Items: []
      },
      // Edit GRN Form
      editingGRN: null,
      editGRNModalInstance: null,
      savingEditGRN: false,
      editGRNForm: {
        GRNID: null,
        PaymentMode: 'credit',
        Remarks: ''
      },
      selectedPOForGRN: null,
      grnProductSearch: '',
      grnSearchResults: [],
      showGRNProductList: false,
      selectedGRN: null,

      // Returns Form
      savingReturn: false,
      returnForm: {
        MerchantID: null,
        WarehouseID: null,
        Reason: '',
        Items: []
      },
      returnProductSearch: '',
      returnSearchResults: [],
      showReturnProductList: false,
      selectedReturn: null,

      // Invoice Payment Form
      savingPayment: false,
      selectedInvoiceForPayment: null,
      paymentForm: {
        InvoiceID: null,
        Amount: 0,
        PaymentMode: 'cash',
        ReferenceNo: '',
        Notes: ''
      }
    };
  },
  computed: {
    merchantFilterId() {
      return this.$route?.params?.MerchantID ? parseInt(this.$route.params.MerchantID) : null;
    },
    currentMerchantName() {
      if (!this.merchantFilterId) return '';
      const m = this.merchants.find(x => x.MerchantID === this.merchantFilterId);
      return m ? m.Name : ('Merchant #' + this.merchantFilterId);
    },
    primaryActionLabel() {
      if (this.activeTab === 'purchasecart' || this.isIncharge) return 'Add To Cart';
      if (this.activeTab === 'purchase-grn') return 'New GRN Receipt';
      if (this.activeTab === 'purchase-invoices') return 'New Invoice';
      if (this.activeTab === 'purchase-return') return 'Record Return';
      return 'New Purchase Order';
    },
    searchPlaceholder() {
      if (this.activeTab === 'purchase-grn') return 'Search GRN#, Merchant, Officer...';
      if (this.activeTab === 'purchase-invoices') return 'Search Invoice#, Merchant...';
      if (this.activeTab === 'purchase-return') return 'Search Return#, Reason...';
      return 'Search PO#, Merchant, Warehouse...';
    },
    currentUser() {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch (e) {
        return {};
      }
    },
    isIncharge() {
      return (this.currentUser.Role || '').toLowerCase() === 'incharge';
    },
    canApprove() {
      const allowed = ['superadmin', 'admin', 'manager', 'accountant', 'accountmanager', 'accountantmanager'];
      return allowed.includes((this.currentUser.Role || '').toLowerCase());
    },
    cartCount() {
      return this.purchaseOrders.filter(po => po.Status === 'draft').length;
    },
    orderedCount() {
      return this.purchaseOrders.filter(po => po.Status === 'ordered').length;
    },
    pendingCount() {
      return this.purchaseOrders.filter(po => po.Status === 'pending').length;
    },
    unpaidInvoiceCount() {
      return this.invoices.filter(i => (i.Status || '').toLowerCase() !== 'paid').length;
    },
    orderedPOs() {
      return this.purchaseOrders.filter(p => p.Status === 'ordered');
    },
    filteredPOs() {
      return this.purchaseOrders.filter(po => {
        if (this.merchantFilterId && po.MerchantID !== this.merchantFilterId) return false;
        
        // Tab filtering
        if (this.activeTab === 'purchasecart' && po.Status !== 'draft') return false;
        if (this.activeTab === 'po-approval' && po.Status !== 'pending') return false;
        if (this.activeTab === 'purchase-order' && !['ordered', 'received', 'cancelled'].includes(po.Status)) return false;

        // Search filtering
        if (!this.search) return true;
        const q = this.search.toLowerCase();
        const poId = String(po.POID);
        const mName = (po.MerchantName || '').toLowerCase();
        const wName = (po.WarehouseName || '').toLowerCase();
        return poId.includes(q) || mName.includes(q) || wName.includes(q);
      });
    },
    filteredGRNs() {
      return this.grns.filter(g => {
        if (this.merchantFilterId && g.MerchantID !== this.merchantFilterId) return false;
        if (!this.search) return true;
        const q = this.search.toLowerCase();
        return (g.GRNNumber || '').toLowerCase().includes(q) ||
               (g.MerchantName || '').toLowerCase().includes(q) ||
               (g.WarehouseName || '').toLowerCase().includes(q) ||
               (g.ReceivedByName || '').toLowerCase().includes(q);
      });
    },
    filteredInvoices() {
      return this.invoices.filter(i => {
        if (this.merchantFilterId && i.MerchantID !== this.merchantFilterId) return false;
        if (!this.search) return true;
        const q = this.search.toLowerCase();
        return (i.InvoiceNo || '').toLowerCase().includes(q) ||
               (i.MerchantName || '').toLowerCase().includes(q) ||
               (i.MerchantInvoiceNo || '').toLowerCase().includes(q);
      });
    },
    filteredReturns() {
      return this.returns.filter(r => {
        if (this.merchantFilterId && r.MerchantID !== this.merchantFilterId) return false;
        if (!this.search) return true;
        const q = this.search.toLowerCase();
        return (r.ReturnNo || '').toLowerCase().includes(q) ||
               (r.MerchantName || '').toLowerCase().includes(q) ||
               (r.Reason || '').toLowerCase().includes(q);
      });
    }
  },
  watch: {
    '$route.params.section'(newSec) {
      if (newSec && newSec !== this.activeTab) {
        this.activeTab = newSec;
        this.refreshData();
      }
    }
  },
  async mounted() {
    // 1. Initialize Bootstrap Modals
    if (this.$refs.poModal) this.modalInstance = new bootstrap.Modal(this.$refs.poModal);
    if (this.$refs.grnModal) this.grnModalInstance = new bootstrap.Modal(this.$refs.grnModal);
    if (this.$refs.grnDetailsModal) this.grnDetailsModalInstance = new bootstrap.Modal(this.$refs.grnDetailsModal);
    if (this.$refs.returnModal) this.returnModalInstance = new bootstrap.Modal(this.$refs.returnModal);
    if (this.$refs.returnDetailsModal) this.returnDetailsModalInstance = new bootstrap.Modal(this.$refs.returnDetailsModal);
    if (this.$refs.paymentModal) this.paymentModalInstance = new bootstrap.Modal(this.$refs.paymentModal);
    if (this.$refs.editGRNModal) this.editGRNModalInstance = new bootstrap.Modal(this.$refs.editGRNModal);

    // 2. Set active tab from route
    const sec = this.$route?.params?.section;
    if (sec && ['purchasecart', 'purchase-order', 'po-approval', 'purchase-grn', 'purchase-invoices', 'purchase-return'].includes(sec)) {
      this.activeTab = sec;
    } else if (this.merchantFilterId) {
      this.activeTab = 'purchase-order';
    } else if (this.isIncharge) {
      this.activeTab = 'purchasecart';
    }

    await this.loadDependencies();
    await this.refreshData();
  },
  methods: {
    navigateTo(tab) {
      this.activeTab = tab;
      if (this.$router && !this.merchantFilterId) {
        this.$router.push('/admin/purchase/' + tab).catch(() => {});
      }
    },
    handlePrimaryAction() {
      if (this.activeTab === 'purchase-grn') {
        this.openGRNModal();
      } else if (this.activeTab === 'purchase-invoices') {
        this.openInvoiceModal();
      } else if (this.activeTab === 'purchase-return') {
        this.openReturnModal();
      } else {
        this.openModal();
      }
    },
    async loadDependencies() {
      try {
        const token = localStorage.getItem('token');
        const q = `query {
          allMerchants { MerchantID Name Contact GSTIN }
          allWarehouses { WarehouseID Name }
          allProducts {
            ProductID
            ProductName
            variants {
              VariantID
              ProductID
              SKU
              Size
              Color
              Unit
              MRP
              SalePrice
            }
          }
        }`;
        const res = await graphqlRequest(q, {}, token);
        this.merchants = res.allMerchants || [];
        this.warehouses = res.allWarehouses || [];
        
        // Flatten variants for fast lookup
        const list = [];
        (res.allProducts || []).forEach(p => {
          (p.variants || []).forEach(v => {
            list.push({
              VariantID: v.VariantID,
              ProductID: p.ProductID,
              ProductName: p.ProductName,
              variantName: `${p.ProductName} (${v.Size || ''} ${v.Color || ''})`.trim(),
              SKU: v.SKU,
              Unit: v.Unit || 'PCS',
              MRP: v.MRP,
              Cost: v.SalePrice || 0,
              product: p
            });
          });
        });
        this.allVariants = list;
      } catch (e) {
        console.error("Error loading purchase dependencies:", e);
      }
    },
    async refreshData() {
      const token = localStorage.getItem('token');
      try {
        // Fetch POs
        const poQuery = `query {
          allPurchaseOrders {
            POID WarehouseID MerchantID TotalAmount ExpectedDate Status CreatedAt UpdatedAt
            WarehouseName MerchantName MerchantContact MerchantWhatsApp
            Items { ItemID POID VariantID VariantName UOM Qty Cost Subtotal }
          }
        }`;
        const poRes = await graphqlRequest(poQuery, {}, token);
        this.purchaseOrders = poRes.allPurchaseOrders || [];

        // Fetch GRNs
        const grnQuery = `query {
          allGRNs {
            GRNID GRNNumber Type POID MerchantID WarehouseID StoreID ShelfID
            TotalAmount PaymentMode ReceivedByID ReceivedByName ReceivedAt Remarks Status CreatedAt
            WarehouseName MerchantName StoreName ShelfCode PONumber
            Items { GRNItemID GRNID VariantID VariantName Qty Cost Subtotal UOM }
          }
        }`;
        const grnRes = await graphqlRequest(grnQuery, {}, token);
        this.grns = grnRes.allGRNs || [];

        // Fetch Invoices
        const invQuery = `query {
          allPurchaseInvoices {
            InvoiceID POID MerchantID InvoiceNo MerchantInvoiceNo Amount Tax Date Status PaymentMode PaidAmount CreatedAt
            MerchantName WarehouseName
          }
        }`;
        const invRes = await graphqlRequest(invQuery, {}, token);
        this.invoices = resFilterInvoices(invRes.allPurchaseInvoices || []);

        // Fetch Returns
        const retQuery = `query {
          allPurchaseReturns {
            ReturnID ReturnNo MerchantID WarehouseID TotalAmount Reason Status CreatedAt
            WarehouseName MerchantName
            Items { ReturnItemID ReturnID VariantID VariantName Qty Price Reason }
          }
        }`;
        const retRes = await graphqlRequest(retQuery, {}, token);
        this.returns = retRes.allPurchaseReturns || [];

      } catch (e) {
        console.error("Error refreshing purchase data:", e);
      }
      function resFilterInvoices(invs) { return invs; }
    },

    // --- WHATSAPP & ACTIONS ---
    sendWhatsApp(po) {
      const merchantName = po.MerchantName || 'Merchant';
      const warehouseName = po.WarehouseName || 'Main Hub';
      let phone = po.MerchantWhatsApp || po.MerchantContact;
      
      let cleanPhone = phone ? String(phone).replace(/[^\d]/g, '') : '';
      if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      
      if (!cleanPhone || cleanPhone.length < 10) {
         const inputPhone = prompt(`No WhatsApp contact number found for "${merchantName}".\nPlease enter 10-digit mobile number:`, '');
         if (!inputPhone) return;
         cleanPhone = String(inputPhone).replace(/[^\d]/g, '');
         if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
         if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      }
      
      const items = po.Items || [];
      let itemsText = '';
      if (items.length > 0) {
         itemsText = items.map((it, idx) => {
            const name = it.VariantName || `Item #${it.VariantID}`;
            const qty = it.Qty || 1;
            const uom = it.UOM || 'PCS';
            return `${idx + 1}. ${name} - ${qty} ${uom}`;
         }).join('\n');
      } else {
         itemsText = 'No items specified';
      }
      
      const expDate = po.ExpectedDate ? this.formatDate(po.ExpectedDate) : 'Immediate / As per schedule';
      const poNumber = 'PO-' + String(po.POID).padStart(5, '0');
      const totalAmt = Number(po.TotalAmount || 0);

      let message = `📦 *PURCHASE ORDER: ${poNumber}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🏬 *Supplier:* ${merchantName}\n`;
      message += `🏢 *Deliver To:* ${warehouseName}\n`;
      message += `📅 *Expected Date:* ${expDate}\n`;
      message += `📊 *Status:* ${(po.Status || 'ORDERED').toUpperCase()}\n\n`;
      message += `📋 *ORDER ITEMS:*\n${itemsText}\n`;
      if (totalAmt > 0) {
         message += `\n💰 *Total Value:* ₹${totalAmt.toFixed(2)}\n`;
      }
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Please confirm order receipt and expected delivery schedule.\n`;
      message += `Thank you!`;

      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    },

    async sendToApproval(po) {
      if (!confirm(`Submit PO-${String(po.POID).padStart(5, '0')} for Approval?`)) return;
      try {
         const m = `mutation($poid: Int!, $st: String) { updatePurchaseOrder(POID: $poid, Status: $st) { POID Status } }`;
         await graphqlRequest(m, { poid: po.POID, st: 'pending' }, localStorage.getItem('token'));
         alert(`PO-${String(po.POID).padStart(5, '0')} submitted to approval queue!`);
         await this.refreshData();
      } catch (e) {
         alert("Error sending to approval: " + (e.response?.errors?.[0]?.message || e.message));
      }
    },
    async sendPOToApproval() {
      if (!this.formData.POID) return;
      if (!confirm(`Submit PO-${String(this.formData.POID).padStart(5, '0')} for Approval?`)) return;
      this.formData.Status = 'pending';
      await this.savePO();
    },
    async updateStatus(po, newStatus, isApproval = false) {
      if (isApproval) {
         if (!this.canApprove) {
            alert("Access Denied: Only Superadmin, Admin, Manager, Accountant, or Account Manager can approve Purchase Orders.");
            return;
         }
         if (!confirm("Confirm approval and release order?")) return;
      }
      try {
         const m = `mutation($poid: Int!, $st: String) { updatePurchaseOrder(POID: $poid, Status: $st) { POID Status } }`;
         await graphqlRequest(m, { poid: po.POID, st: newStatus }, localStorage.getItem('token'));
         await this.refreshData();
      } catch (e) { alert(e.message); }
    },
    async generateInvoice(po) {
      const invNo = prompt("Enter Merchant Invoice Number:", `INV-${po.POID}-${Date.now().toString().slice(-4)}`);
      if (!invNo) return;
      
      const mutation = `mutation($poid: Int!, $ino: String!, $amt: Float!) {
         createPurchaseInvoice(POID: $poid, InvoiceNo: $ino, Amount: $amt, Status: "unpaid") { InvoiceID InvoiceNo }
      }`;
      try {
         await graphqlRequest(mutation, { poid: po.POID, ino: invNo, amt: po.TotalAmount }, localStorage.getItem('token'));
         alert("Invoice generated successfully!");
         this.navigateTo('purchase-invoices');
         await this.refreshData();
      } catch (e) { alert("Error generating invoice: " + e.message); }
    },
    async deletePO(id) {
      if (!confirm("Are you sure you want to delete this Purchase Order?")) return;
      try {
         await graphqlRequest(`mutation($id: Int!) { deletePurchaseOrder(POID: $id) }`, { id }, localStorage.getItem('token'));
         await this.refreshData();
      } catch (e) { alert(e.message); }
    },
    async deleteInvoice(id) {
      if (!confirm("Delete this invoice record?")) return;
      try {
         await graphqlRequest(`mutation($id: Int!) { deletePurchaseInvoice(InvoiceID: $id) }`, { id }, localStorage.getItem('token'));
         await this.refreshData();
      } catch (e) { alert(e.message); }
    },

    // --- PO MODAL METHODS ---
    openModal(po) {
      this.isEditing = !!po;
      if (po) {
         let expDate = '';
         if (po.ExpectedDate) {
            const num = Number(po.ExpectedDate);
            const d = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(po.ExpectedDate);
            if (!isNaN(d.getTime())) expDate = d.toISOString().split('T')[0];
         }
         this.formData = {
            POID: po.POID,
            MerchantID: po.MerchantID,
            WarehouseID: po.WarehouseID,
            ExpectedDate: expDate,
            Status: po.Status,
            Items: (po.Items || []).map(i => {
               const v = this.allVariants.find(av => av.VariantID === i.VariantID);
               return {
                  VariantID: i.VariantID,
                  ProductID: v ? v.ProductID : null,
                  VariantName: i.VariantName || (v ? v.variantName : 'Item'),
                  SKU: v ? v.SKU : '',
                  UOM: i.UOM || (v ? v.Unit : 'PCS'),
                  Qty: i.Qty || 1,
                  Cost: (i.Cost !== undefined && i.Cost !== null) ? i.Cost : 0
               };
            })
         };
      } else {
         const defaultStatus = (this.isIncharge || this.activeTab === 'purchasecart') ? 'draft' : 
                              (this.activeTab === 'po-approval' ? 'pending' : 'ordered');
         this.formData = { 
            POID: null,
            MerchantID: this.merchantFilterId || null, 
            WarehouseID: null, 
            ExpectedDate: new Date().toISOString().split('T')[0], 
            Status: defaultStatus, 
            Items: [] 
         };
      }
      this.modalInstance.show();
    },
    closeModal() {
      if (this.modalInstance) this.modalInstance.hide();
    },
    searchProducts() {
      if (!this.productSearch) {
         this.searchResults = [];
         this.showProductList = false;
         return;
      }
      const q = this.productSearch.toLowerCase();
      this.searchResults = this.allVariants.filter(v => 
         v.variantName.toLowerCase().includes(q) || 
         (v.SKU && v.SKU.toLowerCase().includes(q))
      ).slice(0, 10);
      this.showProductList = true;
    },
    addItem(v) {
      this.formData.Items.push({
         VariantID: v.VariantID,
         ProductID: v.ProductID,
         VariantName: v.variantName,
         SKU: v.SKU,
         UOM: v.Unit || 'PCS',
         Qty: 1,
         Cost: v.Cost || 0
      });
      this.productSearch = '';
      this.showProductList = false;
    },
    getUOMsForItem(item) {
      if (!item.ProductID) return [item.UOM];
      return this.allVariants
         .filter(v => v.ProductID === item.ProductID)
         .map(v => v.Unit)
         .filter((v, i, a) => v && a.indexOf(v) === i);
    },
    handleUOMChange(item) {
      const newVariant = this.allVariants.find(v => v.ProductID === item.ProductID && v.Unit === item.UOM);
      if (newVariant) {
         item.VariantID = newVariant.VariantID;
         item.VariantName = `${newVariant.product ? newVariant.product.ProductName : 'Unknown'} (${newVariant.Size || ''} ${newVariant.Color || ''})`;
         item.SKU = newVariant.SKU;
      }
    },
    removeItem(idx) {
      this.formData.Items.splice(idx, 1);
    },
    calculateTotal() {
      return this.formData.Items.reduce((acc, it) => acc + ((it.Qty || 1) * (it.Cost || 0)), 0);
    },
    async savePO() {
      const missing = [];
      if (!this.formData.MerchantID) missing.push("Merchant");
      if (!this.formData.WarehouseID) missing.push("Warehouse");
      if (this.formData.Items.length === 0) missing.push("at least one item");
      
      if (missing.length > 0) {
         alert("Validation Error: Please select " + missing.join(", "));
         return;
      }
      this.saving = true;
      if (this.isIncharge && this.formData.Status !== 'pending') {
         this.formData.Status = 'draft';
      }

      const mutation = this.isEditing ? `mutation($poid: Int!, $mid: Int, $wid: Int, $date: String, $st: String, $items: [PurchaseOrderItemInput]) {
         updatePurchaseOrder(POID: $poid, MerchantID: $mid, WarehouseID: $wid, ExpectedDate: $date, Status: $st, Items: $items) { POID }
      }` : `mutation($mid: Int!, $wid: Int!, $date: String, $st: String, $items: [PurchaseOrderItemInput!]!) {
         createPurchaseOrder(MerchantID: $mid, WarehouseID: $wid, ExpectedDate: $date, Status: $st, Items: $items) { POID }
      }`;
      
      const itemsInput = this.formData.Items.map(i => ({
         VariantID: parseInt(i.VariantID),
         Qty: parseInt(i.Qty || 1),
         Cost: (i.Cost !== undefined && i.Cost !== null && i.Cost !== '' && !isNaN(i.Cost)) ? parseFloat(i.Cost) : 0,
         UOM: i.UOM || null
      }));

      const vars = {
         poid: this.formData.POID,
         mid: this.formData.MerchantID,
         wid: this.formData.WarehouseID,
         date: this.formData.ExpectedDate || null,
         st: this.formData.Status,
         items: itemsInput
      };

      try {
         await graphqlRequest(mutation, vars, localStorage.getItem('token'));
         this.closeModal();
         if (this.formData.Status === 'draft' && this.activeTab !== 'purchasecart') {
            this.navigateTo('purchasecart');
         } else if (this.formData.Status === 'pending') {
            alert("Purchase order submitted to approval queue!");
         }
         await this.refreshData();
      } catch (e) {
         const msg = e.response?.errors?.[0]?.message || e.message;
         alert("Error saving Purchase Order: " + msg);
      } finally {
         this.saving = false;
      }
    },

    // --- GRN (ROUTE-A & ROUTE-B) METHODS ---
    openGRNModal() {
      const nowStr = new Date().toISOString().slice(0, 16);
      const user = this.currentUser;
      const officerName = `${user.UserNameFirst || ''} ${user.UserNameLast || ''}`.trim() || user.Username || 'Store Officer';
      const officerId = user.UserID || 1;

      this.grnRoute = 'A';
      this.selectedPOForGRN = null;
      this.grnForm = {
        POID: null,
        MerchantID: null,
        WarehouseID: null,
        ReceivedByID: officerId,
        ReceivedByName: officerName,
        ReceivedAt: nowStr,
        PaymentMode: 'credit',
        Remarks: '',
        Items: []
      };
      if (this.grnModalInstance) this.grnModalInstance.show();
    },
    openGRNModalWithPO(po) {
      this.openGRNModal();
      this.grnRoute = 'A';
      this.grnForm.POID = po.POID;
      this.onSelectPOForGRN();
    },
    setGRNRoute(route) {
      this.grnRoute = route;
      this.grnForm.Items = [];
      if (route === 'B') {
        this.grnForm.POID = null;
        this.selectedPOForGRN = null;
      }
    },
    onSelectPOForGRN() {
      if (!this.grnForm.POID) {
        this.selectedPOForGRN = null;
        this.grnForm.Items = [];
        return;
      }
      const po = this.purchaseOrders.find(p => p.POID === this.grnForm.POID);
      this.selectedPOForGRN = po;
      if (po) {
        this.grnForm.MerchantID = po.MerchantID;
        this.grnForm.WarehouseID = po.WarehouseID;
        this.grnForm.Items = (po.Items || []).map(i => ({
          VariantID: i.VariantID,
          VariantName: i.VariantName,
          UOM: i.UOM || 'PCS',
          Qty: i.Qty || 1,
          Cost: i.Cost || 0
        }));
      }
    },
    searchGRNProducts() {
      if (!this.grnProductSearch) {
         this.grnSearchResults = [];
         this.showGRNProductList = false;
         return;
      }
      const q = this.grnProductSearch.toLowerCase();
      this.grnSearchResults = this.allVariants.filter(v => 
         v.variantName.toLowerCase().includes(q) || 
         (v.SKU && v.SKU.toLowerCase().includes(q))
      ).slice(0, 10);
      this.showGRNProductList = true;
    },
    addGRNItem(v) {
      this.grnForm.Items.push({
         VariantID: v.VariantID,
         VariantName: v.variantName,
         UOM: v.Unit || 'PCS',
         Qty: 1,
         Cost: v.Cost || 0
      });
      this.grnProductSearch = '';
      this.showGRNProductList = false;
    },
    removeGRNItem(idx) {
      this.grnForm.Items.splice(idx, 1);
    },
    calculateGRNTotal() {
      return this.grnForm.Items.reduce((acc, it) => acc + ((it.Qty || 1) * (it.Cost || 0)), 0);
    },
    closeGRNModal() {
      if (this.grnModalInstance) this.grnModalInstance.hide();
    },
    async submitGRN() {
      const f = this.grnForm;
      if (!f.ReceivedByID || !f.ReceivedByName) {
        alert("Please enter the receiving Employee / Officer ID and Name.");
        return;
      }

      this.savingGRN = true;
      const token = localStorage.getItem('token');

      try {
        if (this.grnRoute === 'A') {
          if (!f.POID) {
            alert("Please select an approved Purchase Order.");
            this.savingGRN = false;
            return;
          }
          const m = `mutation($poid: Int!, $empid: Int, $empname: String, $time: String, $rem: String, $paymentMode: String, $items: [GRNItemInput]) {
            createGRNAgainstPO(
              POID: $poid,
              ReceivedByID: $empid,
              ReceivedByName: $empname,
              ReceivedAt: $time,
              Remarks: $rem,
              PaymentMode: $paymentMode,
              Items: $items
            ) { GRNID GRNNumber }
          }`;
          const itemsPayload = f.Items.map(it => ({
            VariantID: it.VariantID,
            VariantName: it.VariantName,
            UOM: it.UOM,
            Qty: parseInt(it.Qty || 1),
            Cost: parseFloat(it.Cost || 0)
          }));
          await graphqlRequest(m, {
            poid: f.POID,
            empid: parseInt(f.ReceivedByID),
            empname: f.ReceivedByName,
            time: f.ReceivedAt ? new Date(f.ReceivedAt).toISOString() : new Date().toISOString(),
            rem: f.Remarks,
            paymentMode: f.PaymentMode || 'credit',
            items: itemsPayload
          }, token);

          alert("Success! Goods received against PO. Items deposited into Warehouse Floor Store (Shelf FL01) and PO marked as received.");
        } else {
          // ROUTE-B: DIRECT PURCHASE
          if (!f.MerchantID || !f.WarehouseID) {
            alert("Please select Merchant and Destination Warehouse.");
            this.savingGRN = false;
            return;
          }
          if (f.Items.length === 0) {
            alert("Please add at least one item for Direct Purchase receipt.");
            this.savingGRN = false;
            return;
          }
          const m = `mutation($mid: Int!, $wid: Int!, $empid: Int, $empname: String, $time: String, $rem: String, $paymentMode: String, $items: [GRNItemInput!]!) {
            createDirectGRN(
              MerchantID: $mid,
              WarehouseID: $wid,
              ReceivedByID: $empid,
              ReceivedByName: $empname,
              ReceivedAt: $time,
              Remarks: $rem,
              PaymentMode: $paymentMode,
              Items: $items
            ) { GRNID GRNNumber }
          }`;
          const itemsPayload = f.Items.map(it => ({
            VariantID: it.VariantID,
            VariantName: it.VariantName,
            UOM: it.UOM,
            Qty: parseInt(it.Qty || 1),
            Cost: parseFloat(it.Cost || 0)
          }));
          await graphqlRequest(m, {
            mid: f.MerchantID,
            wid: f.WarehouseID,
            empid: parseInt(f.ReceivedByID),
            empname: f.ReceivedByName,
            time: f.ReceivedAt ? new Date(f.ReceivedAt).toISOString() : new Date().toISOString(),
            rem: f.Remarks,
            paymentMode: f.PaymentMode || 'credit',
            items: itemsPayload
          }, token);

          alert("Success! Direct vendor purchase received. Items deposited into Warehouse Floor Store (Shelf FL01), invoice generated, and merchant ledger updated.");
        }

        this.closeGRNModal();
        this.navigateTo('purchase-grn');
        await this.refreshData();
      } catch (e) {
        console.error("GRN creation error:", e);
        const msg = e.response?.errors?.[0]?.message || e.message;
        alert("Error creating GRN: " + msg);
      } finally {
        this.savingGRN = false;
      }
    },
    // --- EDIT GRN METHODS ---
    openEditGRN(g) {
      this.editingGRN = g;
      this.editGRNForm = {
        GRNID: g.GRNID,
        PaymentMode: g.PaymentMode || 'credit',
        Remarks: g.Remarks || ''
      };
      if (this.editGRNModalInstance) this.editGRNModalInstance.show();
    },
    closeEditGRNModal() {
      if (this.editGRNModalInstance) this.editGRNModalInstance.hide();
    },
    async submitEditGRN() {
      if (!this.editGRNForm.GRNID) return;
      this.savingEditGRN = true;
      try {
        const token = localStorage.getItem('token');
        const m = `mutation($id: Int!, $mode: String, $rem: String) {
          updateGRN(GRNID: $id, PaymentMode: $mode, Remarks: $rem) {
            GRNID
            PaymentMode
            Remarks
          }
        }`;
        await graphqlRequest(m, {
          id: this.editGRNForm.GRNID,
          mode: this.editGRNForm.PaymentMode,
          rem: this.editGRNForm.Remarks
        }, token);

        alert("GRN payment mode updated successfully!");
        this.closeEditGRNModal();
        await this.refreshData();
      } catch (e) {
        console.error("Update GRN error:", e);
        const msg = e.response?.errors?.[0]?.message || e.message;
        alert("Failed to update GRN: " + msg);
      } finally {
        this.savingEditGRN = false;
      }
    },
    viewGRNDetails(g) {
      this.selectedGRN = g;
      if (this.grnDetailsModalInstance) this.grnDetailsModalInstance.show();
    },
    closeGRNDetailsModal() {
      if (this.grnDetailsModalInstance) this.grnDetailsModalInstance.hide();
    },

    // --- PURCHASE RETURNS METHODS ---
    openReturnModal() {
      this.returnForm = {
        MerchantID: this.merchantFilterId || null,
        WarehouseID: null,
        Reason: '',
        Items: []
      };
      if (this.returnModalInstance) this.returnModalInstance.show();
    },
    closeReturnModal() {
      if (this.returnModalInstance) this.returnModalInstance.hide();
    },
    searchReturnProducts() {
      if (!this.returnProductSearch) {
         this.returnSearchResults = [];
         this.showReturnProductList = false;
         return;
      }
      const q = this.returnProductSearch.toLowerCase();
      this.returnSearchResults = this.allVariants.filter(v => 
         v.variantName.toLowerCase().includes(q) || 
         (v.SKU && v.SKU.toLowerCase().includes(q))
      ).slice(0, 10);
      this.showReturnProductList = true;
    },
    addReturnItem(v) {
      this.returnForm.Items.push({
         VariantID: v.VariantID,
         VariantName: v.variantName,
         Qty: 1,
         Price: v.Cost || 0,
         Reason: ''
      });
      this.returnProductSearch = '';
      this.showReturnProductList = false;
    },
    removeReturnItem(idx) {
      this.returnForm.Items.splice(idx, 1);
    },
    calculateReturnTotal() {
      return this.returnForm.Items.reduce((acc, it) => acc + ((it.Qty || 1) * (it.Price || 0)), 0);
    },
    async submitPurchaseReturn() {
      const f = this.returnForm;
      if (!f.MerchantID || !f.WarehouseID) {
        alert("Please select Merchant and Warehouse.");
        return;
      }
      if (f.Items.length === 0) {
        alert("Please add at least one item to return.");
        return;
      }

      this.savingReturn = true;
      const token = localStorage.getItem('token');
      try {
        const m = `mutation($mid: Int!, $wid: Int!, $reason: String, $items: [PurchaseReturnItemInput!]!) {
          createPurchaseReturn(
            MerchantID: $mid,
            WarehouseID: $wid,
            Reason: $reason,
            Items: $items
          ) { ReturnID ReturnNo }
        }`;
        const itemsPayload = f.Items.map(it => ({
          VariantID: it.VariantID,
          Qty: parseInt(it.Qty || 1),
          Price: parseFloat(it.Price || 0),
          Reason: it.Reason || f.Reason || 'Vendor Return'
        }));
        await graphqlRequest(m, {
          mid: f.MerchantID,
          wid: f.WarehouseID,
          reason: f.Reason,
          items: itemsPayload
        }, token);

        alert("Success! Purchase Return recorded. Stock deducted from Floor Store (Shelf FL01) and credit logged to Merchant Ledger.");
        this.closeReturnModal();
        this.navigateTo('purchase-return');
        await this.refreshData();
      } catch (e) {
        console.error("Return error:", e);
        const msg = e.response?.errors?.[0]?.message || e.message;
        alert("Error recording return: " + msg);
      } finally {
        this.savingReturn = false;
      }
    },
    viewReturnDetails(r) {
      this.selectedReturn = r;
      if (this.returnDetailsModalInstance) this.returnDetailsModalInstance.show();
    },
    closeReturnDetailsModal() {
      if (this.returnDetailsModalInstance) this.returnDetailsModalInstance.hide();
    },

    // --- INVOICE & SETTLEMENT METHODS ---
    openInvoiceModal() {
      const invNo = prompt("Enter New Invoice Number:", `INV-${Date.now().toString().slice(-6)}`);
      if (!invNo) return;
      const amtStr = prompt("Enter Total Invoice Amount (₹):", "0.00");
      if (!amtStr) return;
      const amt = parseFloat(amtStr);
      if (isNaN(amt) || amt <= 0) {
        alert("Invalid amount.");
        return;
      }
      const midStr = prompt("Enter Merchant ID (1-" + (this.merchants.length || 10) + "):", this.merchantFilterId || "1");
      if (!midStr) return;
      const mid = parseInt(midStr);

      const m = `mutation($mid: Int, $ino: String!, $amt: Float!) {
        createPurchaseInvoice(MerchantID: $mid, InvoiceNo: $ino, Amount: $amt, Status: "unpaid", PaymentMode: "credit") {
          InvoiceID InvoiceNo
        }
      }`;
      graphqlRequest(m, { mid, ino: invNo, amt }, localStorage.getItem('token'))
        .then(() => {
          alert("Invoice created successfully!");
          this.navigateTo('purchase-invoices');
          this.refreshData();
        })
        .catch(e => alert("Error: " + e.message));
    },
    openPaymentModal(inv) {
      this.selectedInvoiceForPayment = inv;
      const balance = Math.max(0, (inv.Amount || 0) - (inv.PaidAmount || 0));
      this.paymentForm = {
        InvoiceID: inv.InvoiceID,
        Amount: balance > 0 ? balance : inv.Amount,
        PaymentMode: 'cash',
        ReferenceNo: '',
        Notes: ''
      };
      if (this.paymentModalInstance) this.paymentModalInstance.show();
    },
    closePaymentModal() {
      if (this.paymentModalInstance) this.paymentModalInstance.hide();
    },
    async submitInvoicePayment() {
      const f = this.paymentForm;
      if (!f.Amount || f.Amount <= 0) {
        alert("Please enter a valid payment amount.");
        return;
      }
      this.savingPayment = true;
      try {
        const m = `mutation($id: Int!, $amt: Float!, $mode: String!, $ref: String, $notes: String) {
          recordInvoicePayment(InvoiceID: $id, Amount: $amt, PaymentMode: $mode, ReferenceNo: $ref, Notes: $notes) {
            InvoiceID PaidAmount Status
          }
        }`;
        await graphqlRequest(m, {
          id: f.InvoiceID,
          amt: parseFloat(f.Amount),
          mode: f.PaymentMode,
          ref: f.ReferenceNo,
          notes: f.Notes
        }, localStorage.getItem('token'));

        alert("Payment recorded successfully! Merchant ledger updated.");
        this.closePaymentModal();
        await this.refreshData();
      } catch (e) {
        console.error("Payment error:", e);
        const msg = e.response?.errors?.[0]?.message || e.message;
        alert("Error recording payment: " + msg);
      } finally {
        this.savingPayment = false;
      }
    },

    // --- UTILS ---
    formatDate(d) {
      if (!d) return 'N/A';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatDateTime(d) {
      if (!d) return 'N/A';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    statusBadge(s) {
       const map = { draft: 'bg-secondary', pending: 'bg-warning', ordered: 'bg-primary', received: 'bg-success', cancelled: 'bg-danger' };
       return map[s] || 'bg-dark';
    },
    invoiceStatusBadge(s) {
       const map = { paid: 'bg-success', partial: 'bg-warning text-dark', unpaid: 'bg-danger' };
       return map[(s || '').toLowerCase()] || 'bg-secondary';
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminPurchase; }
