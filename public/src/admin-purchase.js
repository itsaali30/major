const AdminPurchase = {
  template: `
    <div class="container-fluid my-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 class="mb-1 fw-bold text-dark"><i class="bi bi-cart-check me-2 text-success"></i> Purchase Management</h4>
           <p class="text-muted small mb-0">Manage procurement cycles, inventory orders, and merchant invoices.</p>
        </div>
         <button class="btn btn-success shadow-sm fw-bold px-4 transition-all" @click="openModal()">
            <i class="bi bi-plus-lg me-1"></i> 
            {{ activeTab === 'purchasecart' ? 'Add To Cart' : (activeTab === 'purchase-invoices' ? 'New Invoice' : 'New Purchase Order') }}
         </button>
      </div>

      <!-- Sub-Navigation (4 Buttons) -->
      <div class="row g-2 mb-4">
         <div class="col-md-3">
            <button class="btn w-100 shadow-sm fw-bold py-3 border-0 transition-all" :class="activeTab === 'purchasecart' ? 'btn-success text-white' : 'btn-white text-dark'" @click="navigateTo('purchasecart')">
               <i class="bi bi-cart me-2"></i> Purchase Cart
               <span class="badge bg-white text-success ms-2" v-if="cartCount > 0">{{ cartCount }}</span>
            </button>
         </div>
         <div class="col-md-3">
            <button class="btn w-100 shadow-sm fw-bold py-3 border-0 transition-all" :class="activeTab === 'purchase-order' ? 'btn-primary text-white' : 'btn-white text-dark'" @click="navigateTo('purchase-order')">
               <i class="bi bi-list-check me-2"></i> Purchase Orders
            </button>
         </div>
         <div class="col-md-3">
            <button class="btn w-100 shadow-sm fw-bold py-3 border-0 transition-all" :class="activeTab === 'po-approval' ? 'btn-warning text-white' : 'btn-white text-dark'" @click="navigateTo('po-approval')">
               <i class="bi bi-shield-check me-2"></i> PO Approvals
               <span class="badge bg-danger text-white ms-2" v-if="pendingCount > 0">{{ pendingCount }}</span>
            </button>
         </div>
         <div class="col-md-3">
            <button class="btn w-100 shadow-sm fw-bold py-3 border-0 transition-all" :class="activeTab === 'purchase-invoices' ? 'btn-dark text-white' : 'btn-white text-dark'" @click="navigateTo('purchase-invoices')">
               <i class="bi bi-receipt me-2"></i> Purchase Invoices
            </button>
         </div>
      </div>

      <!-- Filters & Stats row (removed status filter as it is now tab-based) -->
      <div class="row g-3 mb-4" v-if="activeTab !== 'invoice'">
         <div class="col-md-12">
            <div class="card border-0 shadow-sm">
               <div class="card-body p-2">
                  <div class="input-group input-group-sm">
                     <span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>
                     <input type="text" class="form-control border-start-0" placeholder="Search PO#, Merchant or Warehouse..." v-model="search">
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- PO/Cart/Approval Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="activeTab !== 'purchase-invoices'">
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
               <tr v-for="po in filteredPOs" :key="po.POID" class="po-row">
                 <td class="ps-4">
                    <div class="fw-bold">PO-{{ String(po.POID).padStart(5, '0') }}</div>
                    <div class="x-small text-muted">{{ formatDate(po.CreatedAt) }}</div>
                 </td>
                 <td>
                    <div class="small fw-bold">{{ po.MerchantName }}</div>
                 </td>
                 <td>
                    <div class="small">{{ po.WarehouseName }}</div>
                 </td>
                 <td>
                    <span class="badge bg-light text-dark fw-normal">{{ po.ExpectedDate ? formatDate(po.ExpectedDate) : 'Not Set' }}</span>
                 </td>
                 <td class="fw-bold text-success">₹{{ (po.TotalAmount || 0).toFixed(2) }}</td>
                 <td>
                    <span class="badge" :class="statusBadge(po.Status)">{{ po.Status.toUpperCase() }}</span>
                 </td>
                 <td class="text-end pe-4">
                    <div class="btn-group btn-group-sm shadow-sm bg-white rounded border overflow-hidden">
                       <button class="btn btn-outline-light text-primary border-0 px-3" @click="openModal(po)"><i class="bi bi-pencil"></i></button>
                       <button v-if="po.Status === 'received' && activeTab === 'purchase-order'" class="btn btn-outline-light text-dark border-0 px-3" @click="generateInvoice(po)" title="Generate Invoice"><i class="bi bi-receipt"></i></button>
                       <button v-if="activeTab === 'po-approval'" class="btn btn-outline-light text-success border-0 px-3" @click="updateStatus(po, 'ordered', true)" title="Approve & Order"><i class="bi bi-check-circle"></i></button>
                       <button v-if="activeTab === 'purchasecart'" class="btn btn-outline-light text-warning border-0 px-3" @click="updateStatus(po, 'pending')" title="Submit for Approval"><i class="bi bi-send"></i></button>
                       <button class="btn btn-outline-light text-danger border-0 px-3" @click="deletePO(po.POID)"><i class="bi bi-trash"></i></button>
                    </div>
                 </td>
               </tr>
               <tr v-if="filteredPOs.length === 0">
                  <td colspan="7" class="text-center py-5 text-muted">No records found in this section</td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- Invoice Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5" v-if="activeTab === 'purchase-invoices'">
         <div class="table-responsive">
           <table class="table align-middle mb-0">
             <thead class="bg-dark text-white small text-uppercase fw-bold">
               <tr>
                 <th class="ps-4">Invoice #</th>
                 <th>PO Ref</th>
                 <th>Merchant Invoice</th>
                 <th>Date</th>
                 <th>Amount</th>
                 <th>Status</th>
                 <th class="text-end pe-4">Actions</th>
               </tr>
             </thead>
             <tbody>
               <tr v-for="inv in invoices" :key="inv.InvoiceID">
                 <td class="ps-4 fw-bold text-primary">{{ inv.InvoiceNo }}</td>
                 <td class="small">PO-{{ String(inv.POID).padStart(5, '0') }}</td>
                 <td>{{ inv.MerchantInvoiceNo || 'N/A' }}</td>
                 <td>{{ formatDate(inv.Date) }}</td>
                 <td class="fw-bold text-success">₹{{ inv.Amount.toFixed(2) }}</td>
                 <td><span class="badge bg-light text-dark">{{ inv.Status.toUpperCase() }}</span></td>
                 <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-danger border-0" @click="deleteInvoice(inv.InvoiceID)"><i class="bi bi-trash"></i></button>
                 </td>
               </tr>
               <tr v-if="invoices.length === 0">
                  <td colspan="7" class="text-center py-5 text-muted">No invoices generated yet</td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      <!-- PO Modal -->
      <div class="modal fade" id="poModal" tabindex="-1" ref="poModal">
        <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-dark text-white border-0 py-3">
              <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-plus me-2"></i> {{ isEditing ? 'Edit' : 'Create' }} Purchase Order</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body p-4 bg-light-subtle">
              <div class="row g-3 mb-4">
                 <!-- Merchant Selection -->
                 <div class="col-md-4">
                    <label class="form-label fw-bold small text-muted">Merchant / Supplier</label>
                    <div class="input-group input-group-sm mb-1" v-if="!isEditing">
                       <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                       <input type="text" class="form-control" placeholder="Search merchant..." v-model="merchantSearch">
                    </div>
                    <select class="form-select border-0 shadow-sm" v-model.number="formData.MerchantID" :disabled="isEditing">
                       <option :value="null" disabled>-- Select Merchant --</option>
                       <option v-for="m in filteredMerchants" :key="m.MerchantID" :value="m.MerchantID">
                          [ID: {{ m.MerchantID }}] {{ m.Name }}
                       </option>
                    </select>
                 </div>
                 <!-- Warehouse Selection -->
                 <div class="col-md-4">
                    <label class="form-label fw-bold small text-muted">Deliver To (Warehouse)</label>
                    <select class="form-select border-0 shadow-sm" v-model.number="formData.WarehouseID">
                       <option :value="null" disabled>-- Select Warehouse --</option>
                       <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">
                          [ID: {{ w.WarehouseID }}] {{ w.Name }}
                       </option>
                    </select>
                 </div>
                 <!-- Date & Status -->
                 <div class="col-md-2">
                    <label class="form-label fw-bold small text-muted">Expected Date</label>
                    <input type="date" class="form-control border-0 shadow-sm" v-model="formData.ExpectedDate">
                 </div>
                 <div class="col-md-2">
                    <label class="form-label fw-bold small text-muted">PO Status</label>
                    <select class="form-select border-0 shadow-sm fw-bold text-primary" v-model="formData.Status">
                       <option value="draft">CART (Draft)</option>
                       <option value="ordered">ORDERED</option>
                       <option value="received">RECEIVED</option>
                       <option value="cancelled">CANCELLED</option>
                    </select>
                 </div>
              </div>

              <!-- Item builder -->
              <div class="card border-0 shadow-sm">
                 <div class="card-header bg-white py-3">
                    <div class="d-flex justify-content-between align-items-center">
                       <h6 class="mb-0 fw-bold">Order Items</h6>
                       <div class="input-group input-group-sm w-50 shadow-sm">
                          <span class="input-group-text bg-white border-0"><i class="bi bi-search text-primary"></i></span>
                          <input type="text" class="form-control border-0" placeholder="Search by SKU or Product Name to add..." v-model="productSearch" @input="showProductList = true">
                          <div class="dropdown-menu show w-100 mt-1 shadow border-0" v-if="showProductList && filteredProducts.length > 0" style="max-height: 300px; overflow-y: auto;">
                             <button class="dropdown-item py-2 border-bottom" type="button" v-for="p in filteredProducts" :key="p.VariantID" @click="addItem(p)">
                                <div class="d-flex align-items-center">
                                   <div class="flex-grow-1">
                                      <div class="fw-bold small ">{{ p.variantName }} <span class="badge bg-light text-muted fw-normal ms-1">ID: {{p.VariantID}}</span></div>
                                      <div class="x-small text-muted">SKU: {{ p.SKU }} | MRP: ₹{{ p.MRP }}</div>
                                   </div>
                                   <i class="bi bi-plus-circle text-success fs-5"></i>
                                </div>
                             </button>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div class="card-body p-0">
                    <div class="table-responsive">
                       <table class="table align-middle mb-0">
                          <thead class="bg-light small text-muted fw-bold">
                             <tr>
                                <th class="ps-4">#</th>
                                <th>Item Specification</th>
                                <th>UOM</th>
                                <th style="width: 120px;">Qty</th>
                                <th style="width: 150px;">Entry Cost</th>
                                <th style="width: 150px;">Subtotal</th>
                                <th class="text-end pe-4"></th>
                             </tr>
                          </thead>
                          <tbody>
                             <tr v-for="(item, index) in formData.Items" :key="index">
                                <td class="ps-4 small text-muted">{{ index + 1 }}</td>
                                <td>
                                   <div class="fw-bold small">{{ item.VariantName }}</div>
                                   <div class="x-small text-muted">{{ item.SKU }}</div>
                                </td>
                                <td>
                                   <select class="form-select form-select-sm border-0 bg-light" v-model="item.UOM" @change="handleUOMChange(item)">
                                      <option v-for="u in getUOMsForItem(item)" :key="u" :value="u">{{ u }}</option>
                                   </select>
                                </td>
                                <td><input type="number" class="form-control form-control-sm border-0 bg-light text-center" v-model.number="item.Qty"></td>
                                <td>
                                   <div class="input-group input-group-sm">
                                      <span class="input-group-text border-0 bg-light">₹</span>
                                      <input type="number" step="0.01" class="form-control border-0 bg-light fw-bold" v-model.number="item.Cost">
                                   </div>
                                </td>
                                <td class="fw-bold text-dark">₹{{ (item.Qty * item.Cost).toFixed(2) }}</td>
                                <td class="text-end pe-4">
                                   <button class="btn btn-sm text-danger" @click="removeItem(index)"><i class="bi bi-x-circle"></i></button>
                                </td>
                             </tr>
                             <tr v-if="formData.Items.length === 0">
                                <td colspan="7" class="text-center py-5">
                                   <i class="bi bi-inbox fs-1 opacity-25"></i>
                                   <p class="text-muted small mt-2">Search and add variants to build your purchase order</p>
                                </td>
                             </tr>
                          </tbody>
                          <tfoot class="bg-light-subtle" v-if="formData.Items.length > 0">
                             <tr>
                                <td colspan="5" class="text-end fw-bold py-3 ps-4">PO Grand Total:</td>
                                <td colspan="2" class="py-3 pe-4"><h5 class="mb-0 fw-bold text-success">₹{{ calculateTotal }}</h5></td>
                             </tr>
                          </tfoot>
                       </table>
                    </div>
                 </div>
              </div>
            </div>
            <div class="modal-footer bg-white border-0 py-3">
              <button type="button" class="btn btn-light px-4 fw-bold" @click="closeModal">Discard</button>
              <button type="submit" class="btn btn-dark px-5 fw-bold shadow" :disabled="saving" @click="savePO">
                 <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                 {{ isEditing ? 'Update Purchase Order' : 'Create Purchase Order' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .po-row:hover { background-color: #f8f9fa; cursor: pointer; }
      .x-small { font-size: 0.7rem; }
      .dropdown-menu.show { display: block; }
    </style>
  `,
  data() {
    return {
      pos: [],
      merchants: [],
      warehouses: [],
      allVariants: [],
      invoices: [],
      
      activeTab: 'purchase-order', 
      search: '',
      merchantSearch: '',
      productSearch: '',
      showProductList: false,

      formData: {
         POID: null,
         MerchantID: null,
         WarehouseID: null,
         ExpectedDate: '',
         Status: 'draft',
         Items: []
      },
      
      loading: false,
      saving: false,
      isEditing: false,
      modalInstance: null
    };
  },
  computed: {
    totalProcurementValue() {
       return this.pos.reduce((sum, po) => sum + (po.TotalAmount || 0), 0).toFixed(2);
    },
    cartCount() { return this.pos.filter(p => p.Status === 'draft').length; },
    pendingCount() { return this.pos.filter(p => p.Status === 'pending').length; },
    filteredPOs() {
       return this.pos.filter(po => {
          // Tab Filtering
          if (this.activeTab === 'purchasecart' && po.Status !== 'draft') return false;
          if (this.activeTab === 'po-approval' && po.Status !== 'pending') return false;
          if (this.activeTab === 'purchase-order' && ['draft', 'pending'].includes(po.Status)) return false;

          const m = !this.search || 
                    (po.MerchantName || '').toLowerCase().includes(this.search.toLowerCase()) || 
                    (po.WarehouseName || '').toLowerCase().includes(this.search.toLowerCase()) ||
                    String(po.POID).includes(this.search);
          return m;
       });
    },
    filteredMerchants() {
       if (!this.merchantSearch) return this.merchants;
       const s = this.merchantSearch.toLowerCase();
       return this.merchants.filter(m => (m.Name || '').toLowerCase().includes(s));
    },
    filteredProducts() {
       if (!this.productSearch) return [];
       const s = this.productSearch.toLowerCase();
       return this.allVariants.filter(p => 
          p.variantName.toLowerCase().includes(s) || 
          p.SKU.toLowerCase().includes(s) ||
          p.VariantID.toString().includes(s)
       ).slice(0, 10);
    },
    calculateTotal() {
       return this.formData.Items.reduce((sum, item) => sum + (item.Qty * item.Cost), 0).toFixed(2);
    }
  },
  mounted() {
    this.syncTab();
    this.refreshData();
    this.modalInstance = new bootstrap.Modal(this.$refs.poModal);
  },
  watch: {
    '$route.params.section': function() {
       this.syncTab();
    }
  },
  methods: {
    syncTab() {
       const section = this.$route.params.section;
       const valid = ['purchase-order', 'purchasecart', 'purchase-invoices', 'po-approval'];
       if (section && valid.includes(section)) {
          this.activeTab = section;
       } else {
          this.activeTab = 'purchase-order';
       }
    },
    navigateTo(tab) {
       this.$router.push(`/admin/purchase/${tab}`).catch(err => {});
    },
    async refreshData() {
       this.loading = true;
       const q = `{
          allPurchaseOrders { POID WarehouseID MerchantID TotalAmount ExpectedDate Status CreatedAt WarehouseName MerchantName Items { VariantID VariantName Qty Cost Subtotal UOM } }
          allMerchants { MerchantID Name }
          allWarehouses { WarehouseID Name }
          allVariants { VariantID ProductID SKU Weight Size Color Unit MRP product { ProductName } }
          allPurchaseInvoices { InvoiceID POID InvoiceNo MerchantInvoiceNo Amount Tax Date Status CreatedAt }
       }`;
        try {
          const data = await graphqlRequest(q, {}, localStorage.getItem('token'));
          console.log("Purchase Data Loaded:", data);
          if (data) {
            this.pos = data.allPurchaseOrders || [];
            this.merchants = data.allMerchants || [];
            this.warehouses = data.allWarehouses || [];
            this.invoices = data.allPurchaseInvoices || [];
            // Flatten variants for easier picking
            this.allVariants = (data.allVariants || []).map(v => ({
               ...v,
               variantName: `${v.product ? v.product.ProductName : 'Unknown'} (${v.Size || ''} ${v.Color || ''})`
            }));
          }
       } catch (e) { 
          console.error("Purchase Fetch Error:", e);
          const msg = e.response?.errors?.[0]?.message || e.message;
          alert("Error loading data: " + msg);
       }
       finally { this.loading = false; }
    },
    async updateStatus(po, newStatus, isApproval = false) {
       if (isApproval && !confirm("Confirm approval and release order?")) return;
       try {
          const m = `mutation($poid: Int!, $st: String) { updatePurchaseOrder(POID: $poid, Status: $st) { POID Status } }`;
          await graphqlRequest(m, { poid: po.POID, st: newStatus }, localStorage.getItem('token'));
          this.refreshData();
       } catch (e) { alert(e.message); }
    },
    async deleteInvoice(id) {
       if (!confirm("Delete this invoice record?")) return;
       try {
          await graphqlRequest(`mutation($id: Int!) { deletePurchaseInvoice(InvoiceID: $id) }`, { id }, localStorage.getItem('token'));
          this.refreshData();
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
          this.activeTab = 'invoice';
          this.refreshData();
       } catch (e) { alert("Error generating invoice: " + e.message); }
    },
    openModal(po) {
       this.isEditing = !!po;
        if (po) {
           this.formData = {
              POID: po.POID,
              MerchantID: po.MerchantID,
              WarehouseID: po.WarehouseID,
              ExpectedDate: po.ExpectedDate ? new Date(po.ExpectedDate).toISOString().split('T')[0] : '',
              Status: po.Status,
              Items: (po.Items || []).map(i => {
                 const v = this.allVariants.find(av => av.VariantID === i.VariantID);
                 return { ...i, ProductID: v ? v.ProductID : null };
              })
           };
        } else {
           // Default status based on active tab
           const defaultStatus = this.activeTab === 'purchasecart' ? 'draft' : 
                                (this.activeTab === 'po-approval' ? 'pending' : 'ordered');
           
           this.formData = { 
              POID: null,
              MerchantID: null, 
              WarehouseID: null, 
              ExpectedDate: new Date().toISOString().split('T')[0], 
              Status: defaultStatus, 
              Items: [] 
           };
        }
       this.modalInstance.show();
    },
    closeModal() { this.modalInstance.hide(); },
    addItem(v) {
       this.formData.Items.push({
          VariantID: v.VariantID,
          ProductID: v.ProductID,
          VariantName: v.variantName,
          SKU: v.SKU,
          UOM: v.Unit || 'PCS',
          Qty: 1,
          Cost: 0
       });
       this.productSearch = '';
       this.showProductList = false;
    },
    getUOMsForItem(item) {
       if (!item.ProductID) return [item.UOM];
       return this.allVariants
          .filter(v => v.ProductID === item.ProductID)
          .map(v => v.Unit)
          .filter((v, i, a) => v && a.indexOf(v) === i); // Unique
    },
    handleUOMChange(item) {
       const newVariant = this.allVariants.find(v => v.ProductID === item.ProductID && v.Unit === item.UOM);
       if (newVariant) {
          item.VariantID = newVariant.VariantID;
          item.VariantName = `${newVariant.product ? newVariant.product.ProductName : 'Unknown'} (${newVariant.Size || ''} ${newVariant.Color || ''})`;
          item.SKU = newVariant.SKU;
          // Optionally update MRP/Cost if needed, but keeping existing cost for now
       }
    },
    removeItem(idx) { this.formData.Items.splice(idx, 1); },
    async savePO() {
        const missing = [];
        if (!this.formData.MerchantID) missing.push("Merchant");
        if (!this.formData.WarehouseID) missing.push("Warehouse");
        if (this.formData.Items.length === 0) missing.push("at least one item");
        
        if (missing.length > 0) {
           alert("Validation Error: Please select " + missing.join(", "));
           console.log("Form State:", JSON.parse(JSON.stringify(this.formData)));
           return;
        }
       this.saving = true;
       const mutation = this.isEditing ? `mutation($poid: Int!, $mid: Int, $wid: Int, $date: String, $st: String, $items: [PurchaseOrderItemInput]) {
          updatePurchaseOrder(POID: $poid, MerchantID: $mid, WarehouseID: $wid, ExpectedDate: $date, Status: $st, Items: $items) { POID }
       }` : `mutation($mid: Int!, $wid: Int!, $date: String, $st: String, $items: [PurchaseOrderItemInput!]!) {
          createPurchaseOrder(MerchantID: $mid, WarehouseID: $wid, ExpectedDate: $date, Status: $st, Items: $items) { POID }
       }`;
       
       const itemsInput = this.formData.Items.map(i => ({
          VariantID: i.VariantID,
          Qty: i.Qty,
          Cost: parseFloat(i.Cost),
          UOM: i.UOM
       }));

       const vars = {
          poid: this.formData.POID,
          mid: this.formData.MerchantID,
          wid: this.formData.WarehouseID,
          date: this.formData.ExpectedDate,
          st: this.formData.Status,
          items: itemsInput
       };

       try {
          await graphqlRequest(mutation, vars, localStorage.getItem('token'));
          this.closeModal();
          this.refreshData();
       } catch (e) { alert(e.message); }
       finally { this.saving = false; }
    },
    async deletePO(id) {
       if (!confirm("Are you sure you want to delete this Purchase Order?")) return;
       try {
          await graphqlRequest(`mutation($id: Int!) { deletePurchaseOrder(POID: $id) }`, { id }, localStorage.getItem('token'));
          this.refreshData();
       } catch (e) { alert(e.message); }
    },
    formatDate(d) {
      if (!d) return 'N/A';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    statusBadge(s) {
       const map = { draft: 'bg-secondary', pending: 'bg-warning', ordered: 'bg-primary', received: 'bg-success', cancelled: 'bg-danger' };
       return map[s] || 'bg-dark';
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminPurchase; }
