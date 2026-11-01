// Admin Shelves Component with Item Breakdown, Receiving Officer Tracking & Transfer History
const AdminShelves = {
  template: `
    <div class="container my-5">
      <style>
        .shelf-row {
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        .shelf-row:hover {
          background-color: #f8fafc !important;
        }
        .nav-pills .nav-link.active {
          background-color: #0f172a !important;
          color: white !important;
        }
      </style>

      <div class="row">
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-3">
              <div>
                <h4 class="mb-0 fw-bold">
                  <i class="bi bi-stack me-2 text-primary"></i> 
                  Shelves for {{ store ? store.StoreName : 'Store #' + $route.params.StoreID }}
                </h4>
                <div class="x-small text-muted mt-1" v-if="store">
                   <span class="badge bg-secondary me-2">Type: {{ store.Type || 'Store' }}</span>
                   <span v-if="store.Warehouse" class="text-light">
                      <i class="bi bi-building me-1"></i> Warehouse: <strong>{{ store.Warehouse.Name }}</strong>
                   </span>
                </div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm fw-bold shadow-sm" @click="openCreateModal">
                   <i class="bi bi-plus-circle me-1"></i> Add Shelf
                </button>
                <router-link to="/admin/stores" class="btn btn-outline-light btn-sm fw-bold">
                   <i class="bi bi-arrow-left me-1"></i> Back to Stores
                </router-link>
              </div>
            </div>
            
            <div class="card-body p-4">
              <div v-if="loading" class="text-center py-5">
                 <div class="spinner-border text-primary"></div>
                 <p class="text-muted mt-2">Loading shelves and audit records...</p>
              </div>
              <div v-else-if="error" class="alert alert-danger shadow-sm">{{ error }}</div>
              <div v-else-if="shelves.length === 0" class="alert alert-info shadow-sm">
                No shelves found for this store. Click <strong>"Add Shelf"</strong> to create one.
              </div>
              
              <div v-else class="table-responsive">
                <table class="table align-middle table-hover mb-0">
                  <thead class="bg-light text-muted small text-uppercase">
                    <tr>
                      <th class="ps-3">Shelf ID</th>
                      <th>Shelf Code</th>
                      <th>Level / Position</th>
                      <th class="text-center">Current Items on Shelf</th>
                      <th class="text-center">Total Units</th>
                      <th class="text-end pe-3">Actions & Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in shelves" :key="s.ShelfID" class="shelf-row" @click="openShelfAuditModal(s)" title="Click to view shelf items, receiving officers & transfer history">
                      <td class="ps-3 fw-bold text-muted">#{{ s.ShelfID }}</td>
                      <td>
                        <span class="badge bg-light text-primary border px-3 py-2 fw-bold fs-6">
                           <i class="bi bi-geo-alt-fill me-1"></i> {{ s.ShelfCode }}
                        </span>
                      </td>
                      <td class="small text-muted">
                        Level {{ s.Level ?? 1 }} • Position {{ s.Position ?? 1 }}
                      </td>
                      <td class="text-center">
                         <span class="badge" :class="(s.TotalItemsCount || 0) > 0 ? 'bg-success' : 'bg-secondary'">
                            {{ s.TotalItemsCount || 0 }} Items
                         </span>
                      </td>
                      <td class="text-center">
                         <span class="fw-bold fs-6" :class="(s.TotalUnits || 0) > 0 ? 'text-success' : 'text-muted'">
                            {{ s.TotalUnits || 0 }} Units
                         </span>
                      </td>
                      <td class="text-end pe-3" @click.stop>
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-primary fw-bold px-3 shadow-sm" @click="openShelfAuditModal(s)" title="Koun sa item kitna hai, koun received kara, koun transfer kara">
                             <i class="bi bi-search me-1"></i> View Audit & History
                          </button>
                          <button class="btn btn-outline-warning" @click="printQRCode(s)" title="Print QR Code"><i class="bi bi-qr-code"></i></button>
                          <button v-if="!$root.isIncharge" class="btn btn-outline-info" @click="editShelf(s)" title="Edit"><i class="bi bi-pencil"></i></button>
                          <button v-if="!$root.isIncharge" class="btn btn-outline-danger" @click="deleteShelf(s.ShelfID)" title="Delete"><i class="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AUDIT MODAL: Koun Sa Item Kitna Hai, Koun Received Kara, Koun Transfer Kara -->
      <div class="modal fade" id="shelfAuditModal" tabindex="-1" ref="shelfAuditModal">
        <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedShelfAudit">
            <div class="modal-header bg-dark text-white">
              <div>
                 <h5 class="modal-title fw-bold">
                    <i class="bi bi-archive-fill text-primary me-2"></i> 
                    Shelf {{ selectedShelfAudit.ShelfCode }} Audit & Movement Details
                 </h5>
                 <div class="x-small text-muted mt-1">
                    Store: <strong>{{ selectedShelfAudit.StoreName }}</strong> ({{ selectedShelfAudit.StoreType }}) | 
                    Warehouse: <strong>{{ selectedShelfAudit.WarehouseName }}</strong>
                 </div>
              </div>
              <button type="button" class="btn-close btn-close-white" @click="closeShelfAuditModal()"></button>
            </div>
            
            <div class="modal-body p-4">
               <!-- 3 Navigation Tabs -->
               <ul class="nav nav-pills mb-4 border-bottom pb-3 gap-2" id="auditTabs" role="tablist">
                  <li class="nav-item" role="presentation">
                     <button class="nav-link fw-bold" :class="auditTab === 'items' ? 'active' : 'text-dark bg-light'" @click="auditTab = 'items'">
                        <i class="bi bi-box-seam me-1"></i> 1. Koun Sa Item Kitna Hai ({{ (selectedShelfAudit.Items || []).length }})
                     </button>
                  </li>
                  <li class="nav-item" role="presentation">
                     <button class="nav-link fw-bold" :class="auditTab === 'receivings' ? 'active' : 'text-dark bg-light'" @click="auditTab = 'receivings'">
                        <i class="bi bi-box-arrow-in-down me-1 text-info"></i> 2. Koun Received Kara (GRN Records) ({{ (selectedShelfAudit.Receivings || []).length }})
                     </button>
                  </li>
                  <li class="nav-item" role="presentation">
                     <button class="nav-link fw-bold" :class="auditTab === 'movements' ? 'active' : 'text-dark bg-light'" @click="auditTab = 'movements'">
                        <i class="bi bi-arrow-left-right me-1 text-warning"></i> 3. Koun Transfer Kara (Movements) ({{ (selectedShelfAudit.Movements || []).length }})
                     </button>
                  </li>
               </ul>

               <!-- TAB 1: KOUN SA ITEM KITNA HAI -->
               <div v-if="auditTab === 'items'">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                     <h6 class="fw-bold mb-0 text-dark"><i class="bi bi-boxes text-primary me-1"></i> Items Currently Stocked on Shelf {{ selectedShelfAudit.ShelfCode }}</h6>
                     <span class="badge bg-success-subtle text-success border border-success-subtle fs-7 fw-bold">
                        Total Stock: {{ selectedShelfAudit.TotalUnits || 0 }} Units
                     </span>
                  </div>

                  <div class="table-responsive">
                     <table class="table table-bordered table-sm align-middle mb-0">
                        <thead class="bg-light small">
                           <tr>
                              <th>#</th>
                              <th>Product Name & Specs</th>
                              <th>SKU</th>
                              <th class="text-center">UOM</th>
                              <th class="text-center">On Hand Qty</th>
                              <th class="text-center">Reserved</th>
                              <th class="text-center">Available Qty</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(it, idx) in selectedShelfAudit.Items" :key="idx">
                              <td class="text-muted small">{{ idx + 1 }}</td>
                              <td>
                                 <div class="fw-bold small">{{ it.ProductName }}</div>
                                 <div class="x-small text-muted" v-if="it.Size || it.Color">{{ it.Size }} • {{ it.Color }}</div>
                              </td>
                              <td><span class="badge bg-light text-dark border">{{ it.SKU }}</span></td>
                              <td class="text-center small">{{ it.Unit }}</td>
                              <td class="text-center fw-bold fs-6 text-dark">{{ it.OnHandQty }}</td>
                              <td class="text-center small text-muted">{{ it.ReservedQty || 0 }}</td>
                              <td class="text-center fw-bold fs-6" :class="it.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                                 {{ it.AvailableQty }}
                              </td>
                           </tr>
                           <tr v-if="(selectedShelfAudit.Items || []).length === 0">
                              <td colspan="7" class="text-center py-4 text-muted">
                                 <i class="bi bi-inbox fs-2 d-block mb-1 text-secondary"></i>
                                 No stock currently placed on this shelf.
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- TAB 2: KOUN RECEIVED KARA -->
               <div v-if="auditTab === 'receivings'">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                     <h6 class="fw-bold mb-0 text-dark">
                        <i class="bi bi-person-badge-fill text-info me-1"></i> Inward Goods Receipt Log (Koun Received Kara)
                     </h6>
                     <span class="small text-muted">Recorded via Route-A (PO) & Route-B (Direct Vendor)</span>
                  </div>

                  <div class="table-responsive">
                     <table class="table table-bordered table-sm align-middle mb-0">
                        <thead class="bg-light small">
                           <tr>
                              <th>GRN #</th>
                              <th>Type</th>
                              <th>Item Name & SKU</th>
                              <th class="text-center">Qty Received</th>
                              <th>Received By (Officer Name & ID)</th>
                              <th>Received At (Timestamp)</th>
                              <th>Merchant</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(rcv, idx) in selectedShelfAudit.Receivings" :key="idx">
                              <td class="fw-bold small text-primary">{{ rcv.GRNNumber }}</td>
                              <td>
                                 <span class="badge" :class="rcv.Type === 'PO' ? 'bg-primary-subtle text-primary border' : 'bg-warning-subtle text-warning border'">
                                    {{ rcv.Type === 'PO' ? 'Against PO' : 'Direct Vendor' }}
                                 </span>
                              </td>
                              <td>
                                 <div class="fw-bold small">{{ rcv.VariantName }}</div>
                                 <div class="x-small text-muted">SKU: {{ rcv.SKU }}</div>
                              </td>
                              <td class="text-center fw-bold fs-6 text-success">{{ rcv.Qty }}</td>
                              <td>
                                 <div class="fw-bold small text-dark">
                                    <i class="bi bi-person-fill text-secondary me-1"></i> {{ rcv.ReceivedByName || 'Officer' }}
                                 </div>
                                 <div class="x-small text-muted">Employee / Staff ID: <strong>{{ rcv.ReceivedByID || 'N/A' }}</strong></div>
                              </td>
                              <td class="small">{{ formatDateTime(rcv.ReceivedAt) }}</td>
                              <td class="small">{{ rcv.MerchantName }}</td>
                           </tr>
                           <tr v-if="(selectedShelfAudit.Receivings || []).length === 0">
                              <td colspan="7" class="text-center py-4 text-muted">
                                 No receiving records logged for this shelf yet.
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- TAB 3: KOUN TRANSFER KARA -->
               <div v-if="auditTab === 'movements'">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                     <h6 class="fw-bold mb-0 text-dark">
                        <i class="bi bi-arrow-left-right text-warning me-1"></i> Stock Movement & Transfer History (Koun Transfer Kara)
                     </h6>
                     <span class="small text-muted">All inward, outward, and shelf putaways</span>
                  </div>

                  <div class="table-responsive">
                     <table class="table table-bordered table-sm align-middle mb-0">
                        <thead class="bg-light small">
                           <tr>
                              <th>Date & Time</th>
                              <th>Movement Type</th>
                              <th>Item Name</th>
                              <th>From Location</th>
                              <th>To Location</th>
                              <th class="text-center">Qty</th>
                              <th>Transferred By (Officer / Staff)</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(m, idx) in selectedShelfAudit.Movements" :key="idx">
                              <td class="small">{{ formatDateTime(m.Date) }}</td>
                              <td>
                                 <span class="badge bg-light text-dark border text-uppercase">{{ m.Type }}</span>
                              </td>
                              <td>
                                 <div class="fw-bold small">{{ m.VariantName }}</div>
                                 <div class="x-small text-muted">SKU: {{ m.SKU }}</div>
                              </td>
                              <td class="small">
                                 <span class="fw-bold">{{ m.FromStoreName }}</span>
                                 <span class="badge bg-light text-secondary border ms-1">{{ m.FromShelf }}</span>
                              </td>
                              <td class="small">
                                 <span class="fw-bold">{{ m.ToStoreName }}</span>
                                 <span class="badge bg-light text-secondary border ms-1">{{ m.ToShelf }}</span>
                              </td>
                              <td class="text-center fw-bold fs-6 text-primary">{{ m.Qty }}</td>
                              <td>
                                 <div class="fw-bold small text-dark">
                                    <i class="bi bi-person-badge text-primary me-1"></i> {{ m.CreatedByName || 'Officer' }}
                                 </div>
                                 <div class="x-small text-muted" v-if="m.CreatedBy">Staff ID: <strong>{{ m.CreatedBy }}</strong></div>
                              </td>
                           </tr>
                           <tr v-if="(selectedShelfAudit.Movements || []).length === 0">
                              <td colspan="7" class="text-center py-4 text-muted">
                                 No transfer movements logged for this shelf yet.
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

            </div>
            
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary fw-bold" @click="closeShelfAuditModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div class="modal fade" id="shelfModal" tabindex="-1" ref="shelfModal">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title"><i class="bi" :class="isEditing ? 'bi-pencil-square' : 'bi-plus-circle'"></i> {{ isEditing ? 'Edit Shelf' : 'Add Shelf' }}</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>
              <form @submit.prevent="saveShelf">
                <div class="mb-3">
                  <label class="form-label">Shelf Code *</label>
                  <input type="text" class="form-control" v-model="formData.ShelfCode" required placeholder="e.g. S1-L1-P1 or FL01">
                </div>
                <div class="row">
                  <div class="col-6 mb-3">
                    <label class="form-label">Level</label>
                    <input type="number" class="form-control" v-model.number="formData.Level" min="1" placeholder="1">
                  </div>
                  <div class="col-6 mb-3">
                    <label class="form-label">Position</label>
                    <input type="number" class="form-control" v-model.number="formData.Position" min="1" placeholder="1">
                  </div>
                </div>
                <div class="text-end mt-3">
                  <button type="button" class="btn btn-secondary me-2" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-success" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ saving ? 'Saving...' : 'Save Shelf' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden QR Generator Container -->
      <div id="qr-code-print" style="display: none;"></div>
    </div>
  `,
  data() {
    return {
      shelves: [],
      store: null,
      loading: true,
      error: null,
      modalError: null,
      isEditing: false,
      saving: false,
      formData: {
        ShelfID: null,
        ShelfCode: '',
        Level: 1,
        Position: 1
      },
      shelfModalInstance: null,
      shelfAuditModalInstance: null,
      selectedShelfAudit: null,
      auditTab: 'items' // 'items', 'receivings', 'movements'
    };
  },
  async mounted() {
    if (this.$refs.shelfModal) {
      this.shelfModalInstance = new bootstrap.Modal(this.$refs.shelfModal);
    }
    if (this.$refs.shelfAuditModal) {
      this.shelfAuditModalInstance = new bootstrap.Modal(this.$refs.shelfAuditModal);
    }
    await this.fetchStore();
    await this.fetchShelves();
  },
  methods: {
    async fetchStore() {
      const storeId = parseInt(this.$route.params.StoreID);
      const query = `
        query GetStore($id: Int!) {
          store(StoreID: $id) {
            StoreID
            StoreName
            Type
            WarehouseID
            Warehouse {
              WarehouseID
              Name
            }
          }
        }
      `;
      try {
        const data = await graphqlRequest(query, { id: storeId }, localStorage.getItem('token'));
        this.store = data.store;
      } catch (err) {
        console.error("Failed to fetch store:", err);
      }
    },
    async fetchShelves() {
      this.loading = true;
      this.error = null;
      const storeId = parseInt(this.$route.params.StoreID);
      const query = `
        query GetShelves($storeId: Int!) {
          shelvesByStore(StoreID: $storeId) {
            ShelfID
            StoreID
            ShelfCode
            Level
            Position
            TotalItemsCount
            TotalUnits
          }
        }
      `;
      try {
        const data = await graphqlRequest(query, { storeId }, localStorage.getItem('token'));
        this.shelves = data.shelvesByStore || [];
      } catch (err) {
        this.error = "Failed to load shelves: " + (err.response?.errors?.[0]?.message || err.message);
      } finally {
        this.loading = false;
      }
    },
    async openShelfAuditModal(s) {
      const token = localStorage.getItem('token');
      const query = `
        query GetShelfAudit($id: Int!) {
          shelfAuditDetails(ShelfID: $id) {
            ShelfID ShelfCode StoreID StoreName StoreType WarehouseID WarehouseName TotalItemsCount TotalUnits
            Items { VariantID ProductID ProductName SKU Size Color Unit OnHandQty AvailableQty ReservedQty }
            Receivings { GRNID GRNNumber Type VariantID VariantName SKU Qty Cost ReceivedByID ReceivedByName ReceivedAt MerchantName Remarks }
            Movements { MovementID VariantID VariantName SKU FromStoreID FromStoreName ToStoreID ToStoreName FromShelf ToShelf Qty Type Date CreatedBy CreatedByName }
          }
        }
      `;
      try {
        const res = await graphqlRequest(query, { id: s.ShelfID }, token);
        this.selectedShelfAudit = res.shelfAuditDetails;
        this.auditTab = 'items';
        if (this.shelfAuditModalInstance) {
          this.shelfAuditModalInstance.show();
        }
      } catch (err) {
        alert("Error loading shelf audit details: " + err.message);
      }
    },
    closeShelfAuditModal() {
      if (this.shelfAuditModalInstance) {
        this.shelfAuditModalInstance.hide();
      }
    },
    openCreateModal() {
      this.isEditing = false;
      this.formData = {
        ShelfID: null,
        ShelfCode: '',
        Level: 1,
        Position: 1
      };
      this.modalError = null;
      this.shelfModalInstance.show();
    },
    editShelf(s) {
      this.isEditing = true;
      this.formData = {
        ShelfID: s.ShelfID,
        ShelfCode: s.ShelfCode,
        Level: s.Level,
        Position: s.Position
      };
      this.modalError = null;
      this.shelfModalInstance.show();
    },
    closeModal() {
      if (this.shelfModalInstance) this.shelfModalInstance.hide();
    },
    async saveShelf() {
      this.saving = true;
      this.modalError = null;
      const storeId = parseInt(this.$route.params.StoreID);

      const createMutation = `
        mutation CreateShelf($storeId: Int!, $shelfCode: String, $level: Int, $position: Int) {
          createShelf(StoreID: $storeId, ShelfCode: $shelfCode, Level: $level, Position: $position) {
            ShelfID
          }
        }
      `;
      const updateMutation = `
        mutation UpdateShelf($shelfId: Int!, $storeId: Int, $shelfCode: String, $level: Int, $position: Int) {
          updateShelf(ShelfID: $shelfId, StoreID: $storeId, ShelfCode: $shelfCode, Level: $level, Position: $position) {
            ShelfID
          }
        }
      `;

      try {
        if (this.isEditing) {
          await graphqlRequest(updateMutation, {
            shelfId: this.formData.ShelfID,
            storeId: storeId,
            shelfCode: this.formData.ShelfCode,
            level: this.formData.Level,
            position: this.formData.Position
          }, localStorage.getItem('token'));
        } else {
          await graphqlRequest(createMutation, {
            storeId: storeId,
            shelfCode: this.formData.ShelfCode,
            level: this.formData.Level,
            position: this.formData.Position
          }, localStorage.getItem('token'));
        }
        this.closeModal();
        await this.fetchShelves();
      } catch (err) {
        this.modalError = err.response?.errors?.[0]?.message || err.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteShelf(id) {
      if (!confirm("Are you sure you want to delete this shelf?")) return;
      const mutation = `
        mutation DeleteShelf($id: Int!) {
          deleteShelf(ShelfID: $id)
        }
      `;
      try {
        await graphqlRequest(mutation, { id }, localStorage.getItem('token'));
        await this.fetchShelves();
      } catch (err) {
        alert("Failed to delete shelf: " + (err.response?.errors?.[0]?.message || err.message));
      }
    },
    printQRCode(s) {
      const container = document.getElementById('qr-code-print');
      container.innerHTML = '';
      
      const qrData = JSON.stringify({
        type: 'SHELF',
        id: s.ShelfID,
        code: s.ShelfCode,
        storeId: s.StoreID
      });

      new QRCode(container, {
        text: qrData,
        width: 128,
        height: 128
      });

      setTimeout(() => {
        const img = container.querySelector('img');
        if (!img) return;
        const win = window.open('', '_blank');
        win.document.write(`
          <html>
            <head><title>Print QR - Shelf ${s.ShelfCode}</title></head>
            <body style="text-align: center; font-family: sans-serif; padding: 20px;">
              <h2>Shelf: ${s.ShelfCode}</h2>
              <p>Store ID: ${s.StoreID} | ID: #${s.ShelfID}</p>
              <img src="${img.src}" style="width: 200px; height: 200px;" />
              <br><br>
              <button onclick="window.print()">Print</button>
            </body>
          </html>
        `);
        win.document.close();
      }, 500);
    },
    formatDateTime(d) {
      if (!d) return 'N/A';
      const num = Number(d);
      const date = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(d);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminShelves; }
