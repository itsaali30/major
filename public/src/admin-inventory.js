const AdminInventory = {
  template: `
    <div class="container-fluid my-4">
      <style>
        .stock-row {
          cursor: pointer;
          transition: background-color 0.15s ease-in-out;
        }
        .stock-row:hover {
          background-color: #f0fdf4 !important;
        }
        .location-card {
          border-left: 4px solid #0d6efd;
        }
        .return-card {
          border-left: 4px solid #dc3545;
          background-color: #fef2f2;
        }
      </style>

      <!-- Header & Warehouse / Store Selectors -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
               <h4 class="mb-1 fw-bold text-dark"><i class="bi bi-stack me-2 text-primary"></i> Stock & Inventory Management</h4>
               <p class="text-muted small mb-0">Track real-time stock levels, warehouse shelves, and designated return store locations.</p>
            </div>
            
            <div class="d-flex flex-wrap gap-3 align-items-center">
               <!-- Selected Warehouse Option (Requested) -->
               <div>
                  <label class="fw-bold x-small text-muted text-uppercase mb-1 d-block">
                     <i class="bi bi-building me-1 text-primary"></i> Selected Warehouse:
                  </label>
                  <select class="form-select form-select-sm border shadow-sm bg-white fw-bold" style="min-width: 220px;" v-model.number="selectedWarehouseID" @change="onWarehouseChange">
                     <option :value="null">-- All Warehouses --</option>
                     <option v-for="w in warehouses" :key="w.WarehouseID" :value="w.WarehouseID">{{ w.Name }}</option>
                  </select>
               </div>

               <!-- Store Selector (Filtered by Warehouse) -->
               <div>
                  <label class="fw-bold x-small text-muted text-uppercase mb-1 d-block">
                     <i class="bi bi-shop me-1 text-success"></i> Selected Store:
                  </label>
                  <select class="form-select form-select-sm border shadow-sm bg-white fw-bold" style="min-width: 220px;" v-model.number="selectedStoreID" @change="fetchStock">
                     <option :value="null">-- All Stores in Warehouse --</option>
                     <option v-for="s in filteredStores" :key="s.StoreID" :value="s.StoreID">
                        {{ s.StoreName }} ({{ s.Type || 'Store' }})
                     </option>
                  </select>
               </div>

               <div class="pt-3">
                  <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" @click="fetchStock">
                     <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Table -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5">
        <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
           <div class="input-group" style="max-width: 400px;">
              <span class="input-group-text bg-light border-0"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control bg-light border-0" placeholder="Search by product, SKU, specs, shelf..." v-model="searchQuery">
           </div>
           <div class="text-muted small">
              <span class="badge bg-primary me-2">{{ filteredStocks.length }} Records</span>
              <span class="text-secondary"><i class="bi bi-info-circle me-1"></i> Click any row to inspect physical location & return store</span>
           </div>
        </div>

        <div v-if="loading" class="text-center py-5">
           <div class="spinner-border text-primary" role="status"></div>
           <p class="text-muted mt-2">Loading stock levels...</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table align-middle mb-0 table-hover">
            <thead class="bg-dark text-white small text-uppercase">
               <tr>
                  <th class="ps-4">Product & Specs</th>
                  <th>Store</th>
                  <th>Shelf</th>
                  <th class="text-center">On Hand</th>
                  <th class="text-center">Reserved</th>
                  <th class="text-center">Available (Current Stock)</th>
                  <th class="text-end pe-4">Locations & Return Store</th>
               </tr>
            </thead>
            <tbody>
               <tr v-for="s in filteredStocks" :key="s.StockID ? s.StockID : (s.StoreID + '-' + s.VariantID)" class="stock-row" @click="inspectStock(s)" title="Click to view where this stock is located & return store">
                  <!-- Column 1: Product & Specs -->
                  <td class="ps-4">
                     <div class="fw-bold text-dark">{{ s.productName }}</div>
                     <div class="small text-muted d-flex align-items-center gap-2 mt-1">
                        <span class="badge bg-light text-dark border">SKU: {{ s.sku }}</span>
                        <span v-if="s.specs" class="text-secondary fw-semibold">{{ s.specs }}</span>
                        <span class="badge bg-secondary-subtle text-secondary">{{ s.unit }}</span>
                     </div>
                  </td>

                  <!-- Column 2: Store -->
                  <td>
                     <div class="fw-bold small text-dark">{{ s.storeName }}</div>
                     <div class="x-small text-muted">{{ s.warehouseName }}</div>
                     <span class="badge x-small" :class="s.storeType === 'Return' ? 'bg-danger text-white' : (s.storeType === 'Floor' ? 'bg-success text-white' : 'bg-secondary text-white')">
                        {{ s.storeType || 'Store' }}
                     </span>
                  </td>

                  <!-- Column 3: Shelf -->
                  <td>
                     <span class="badge bg-light text-primary border px-2 py-1 fw-bold fs-7">
                        <i class="bi bi-geo-alt-fill me-1"></i> {{ s.shelfCode }}
                     </span>
                  </td>

                  <!-- Column 4: On Hand -->
                  <td class="text-center">
                     <span class="fw-bold fs-6 text-dark">{{ s.OnHandQty || 0 }}</span>
                  </td>

                  <!-- Column 5: Reserved -->
                  <td class="text-center">
                     <span class="badge rounded-pill bg-light text-muted border px-2 py-1">{{ s.ReservedQty || 0 }}</span>
                  </td>

                  <!-- Column 6: Available (Current Stock) -->
                  <td class="text-center">
                     <span class="fw-bold fs-6" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty || 0 }}
                     </span>
                     <div class="x-small" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty > 0 ? 'In Stock' : 'Out of Stock' }}
                     </div>
                  </td>

                  <!-- Column 7: Action / Inspect -->
                  <td class="text-end pe-4" @click.stop>
                     <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" @click="inspectStock(s)">
                        <i class="bi bi-pin-map-fill me-1"></i> View Location
                     </button>
                  </td>
               </tr>

               <tr v-if="filteredStocks.length === 0">
                  <td colspan="7" class="text-center py-5 text-muted">
                     <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                     No inventory records found matching your filters.
                  </td>
               </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: Stock Location & Return Store Inspector -->
      <div class="modal fade" id="stockLocationModal" tabindex="-1" ref="stockLocationModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedStockItem">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-pin-map-fill text-primary me-2"></i> Stock Locations & Return Store
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeLocationModal()"></button>
            </div>
            <div class="modal-body p-4">
               <!-- Product Header Info -->
               <div class="card bg-light border-0 p-3 mb-4">
                  <div class="d-flex justify-content-between align-items-center">
                     <div>
                        <h5 class="fw-bold text-dark mb-1">{{ selectedStockItem.productName }}</h5>
                        <div class="small text-muted">
                           <strong>SKU:</strong> {{ selectedStockItem.sku }} | 
                           <strong>Specs:</strong> {{ selectedStockItem.specs || 'Standard' }} | 
                           <strong>UOM:</strong> {{ selectedStockItem.unit }}
                        </div>
                     </div>
                     <div class="text-end">
                        <div class="text-muted x-small text-uppercase fw-bold">Current Row Stock</div>
                        <h4 class="fw-bold text-success mb-0">{{ selectedStockItem.AvailableQty || 0 }} Units</h4>
                     </div>
                  </div>
               </div>

               <!-- SECTION 1: KAHA PAR HAI STOCK (All Current Locations) -->
               <div class="card border-0 shadow-sm location-card mb-4 p-3 bg-white">
                  <h6 class="fw-bold text-primary mb-3">
                     <i class="bi bi-geo-alt-fill me-1"></i> Kaha Par Hai Stock (Physical Locations)
                  </h6>
                  <div class="table-responsive">
                     <table class="table table-sm align-middle table-bordered mb-0">
                        <thead class="bg-light small">
                           <tr>
                              <th>Warehouse</th>
                              <th>Store</th>
                              <th>Shelf Code</th>
                              <th class="text-center">On Hand</th>
                              <th class="text-center">Available</th>
                              <th>Type</th>
                           </tr>
                        </thead>
                        <tbody>
                           <tr v-for="(loc, idx) in itemLocations" :key="idx" :class="loc.StoreID === selectedStockItem.StoreID ? 'table-primary' : ''">
                              <td class="fw-bold small">{{ loc.WarehouseName }}</td>
                              <td class="small">{{ loc.StoreName }}</td>
                              <td>
                                 <span class="badge bg-light text-primary border fw-bold">{{ loc.ShelfCode }}</span>
                              </td>
                              <td class="text-center fw-bold">{{ loc.OnHandQty }}</td>
                              <td class="text-center fw-bold" :class="loc.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                                 {{ loc.AvailableQty }}
                              </td>
                              <td>
                                 <span v-if="loc.IsReturnStore" class="badge bg-danger text-white">Return Store</span>
                                 <span v-else-if="loc.StoreType === 'Floor'" class="badge bg-success text-white">Floor Store</span>
                                 <span v-else class="badge bg-secondary text-white">{{ loc.StoreType || 'Standard' }}</span>
                                 <span v-if="loc.StoreID === selectedStockItem.StoreID" class="badge bg-primary ms-1">Current Row</span>
                              </td>
                           </tr>
                           <tr v-if="itemLocations.length === 0">
                              <td colspan="6" class="text-center py-3 text-muted small">
                                 No other stock locations found for this item.
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- SECTION 2: KOUNSA RETURN STORE HAI (Designated Return Store) -->
               <div class="card border-0 shadow-sm return-card p-3">
                  <h6 class="fw-bold text-danger mb-2">
                     <i class="bi bi-arrow-return-left me-1"></i> Designated Return Store (Kounsa Return Store Hai)
                  </h6>
                  <p class="small text-muted mb-3">
                     Any returned stock from customers or defective vendor items are stored in this warehouse's dedicated Return Store.
                  </p>

                  <div class="row g-3" v-if="selectedReturnStore">
                     <div class="col-md-4">
                        <div class="text-muted x-small text-uppercase fw-bold">Return Store Name</div>
                        <div class="fw-bold text-dark mt-1">
                           <i class="bi bi-shop me-1 text-danger"></i> {{ selectedReturnStore.StoreName }}
                        </div>
                        <div class="x-small text-muted">{{ selectedReturnStore.WarehouseName }}</div>
                     </div>
                     <div class="col-md-4">
                        <div class="text-muted x-small text-uppercase fw-bold">Return Shelf Location</div>
                        <div class="mt-1">
                           <span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-bold fs-7">
                              <i class="bi bi-geo-alt-fill me-1"></i> {{ selectedReturnStore.ShelfCode || 'RT01' }}
                           </span>
                        </div>
                     </div>
                     <div class="col-md-4">
                        <div class="text-muted x-small text-uppercase fw-bold">Current Stock in Return Store</div>
                        <div class="fw-bold fs-5 mt-1" :class="selectedReturnStore.ReturnStockQty > 0 ? 'text-danger' : 'text-success'">
                           {{ selectedReturnStore.ReturnStockQty || 0 }} Units
                        </div>
                        <div class="x-small text-muted">
                           {{ selectedReturnStore.ReturnStockQty > 0 ? '⚠️ Has pending returned units' : '✅ No returned units in storage' }}
                        </div>
                     </div>
                  </div>
                  <div v-else class="text-muted small">
                     No Return Store configured for this warehouse yet.
                  </div>
               </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary fw-bold" @click="closeLocationModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  data() {
    return {
      warehouses: [],
      stores: [],
      selectedWarehouseID: null,
      selectedStoreID: null,
      stocks: [],
      searchQuery: '',
      loading: false,
      
      // Modal
      selectedStockItem: null,
      itemLocations: [],
      selectedReturnStore: null,
      locationModalInstance: null
    };
  },
  computed: {
    filteredStores() {
      if (!this.selectedWarehouseID) return this.stores;
      return this.stores.filter(s => s.WarehouseID === this.selectedWarehouseID);
    },
    filteredStocks() {
      return this.stocks.filter(s => {
        // Warehouse filter
        if (this.selectedWarehouseID && s.warehouseId !== this.selectedWarehouseID) return false;
        // Store filter
        if (this.selectedStoreID && s.StoreID !== this.selectedStoreID) return false;

        // Search query filter
        if (!this.searchQuery) return true;
        const q = this.searchQuery.toLowerCase();
        return (s.productName || '').toLowerCase().includes(q) ||
               (s.sku || '').toLowerCase().includes(q) ||
               (s.specs || '').toLowerCase().includes(q) ||
               (s.storeName || '').toLowerCase().includes(q) ||
               (s.shelfCode || '').toLowerCase().includes(q);
      });
    }
  },
  async mounted() {
    if (this.$refs.stockLocationModal) {
      this.locationModalInstance = new bootstrap.Modal(this.$refs.stockLocationModal);
    }
    await this.init();
  },
  methods: {
    async init() {
      const token = localStorage.getItem('token');
      try {
        const q = `{
          allWarehouses { WarehouseID Name }
          allStores { StoreID StoreName Type WarehouseID }
        }`;
        const data = await graphqlRequest(q, {}, token);
        this.warehouses = data.allWarehouses || [];
        this.stores = data.allStores || [];
        
        // Default to first warehouse if available
        if (this.warehouses.length > 0) {
          this.selectedWarehouseID = this.warehouses[0].WarehouseID;
        }
        await this.fetchStock();
      } catch (e) {
        console.error("Error initializing inventory:", e);
      }
    },
    onWarehouseChange() {
      this.selectedStoreID = null;
      this.fetchStock();
    },
    async fetchStock() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query($wid: Int, $sid: Int) {
        allStocks(WarehouseID: $wid, StoreID: $sid) {
          StockID StoreID VariantID ShelfID OnHandQty ReservedQty AvailableQty
          WarehouseID WarehouseName StoreName StoreType ShelfCode
          variant {
            VariantID ProductID SKU Size Color Unit MRP
            product { ProductID ProductName }
          }
          ReturnStore {
            StoreID StoreName WarehouseID WarehouseName ShelfID ShelfCode ReturnStockQty
          }
          AllLocations {
            WarehouseID WarehouseName StoreID StoreName StoreType ShelfID ShelfCode OnHandQty AvailableQty ReservedQty IsReturnStore
          }
        }
      }`;
      try {
        const res = await graphqlRequest(query, {
          wid: this.selectedWarehouseID || null,
          sid: this.selectedStoreID || null
        }, token);

        const raw = res.allStocks || [];
        this.stocks = raw.map(s => {
          const v = s.variant || {};
          const p = v.product || {};
          const specsParts = [];
          if (v.Size) specsParts.push(v.Size);
          if (v.Color) specsParts.push(v.Color);
          
          return {
            StockID: s.StockID,
            StoreID: s.StoreID,
            VariantID: s.VariantID,
            ShelfID: s.ShelfID,
            OnHandQty: s.OnHandQty || 0,
            ReservedQty: s.ReservedQty || 0,
            AvailableQty: s.AvailableQty || 0,
            warehouseId: s.WarehouseID,
            warehouseName: s.WarehouseName || 'Main Hub',
            storeName: s.StoreName || 'Store',
            storeType: s.StoreType || 'Standard',
            shelfCode: s.ShelfCode || 'FL01',
            productName: p.ProductName || 'Unnamed Product',
            sku: v.SKU || ('VAR-' + s.VariantID),
            specs: specsParts.join(' • '),
            unit: v.Unit || 'PCS',
            returnStore: s.ReturnStore,
            allLocations: s.AllLocations || []
          };
        });
      } catch (e) {
        console.error("Error fetching stock:", e);
      } finally {
        this.loading = false;
      }
    },
    inspectStock(s) {
      this.selectedStockItem = s;
      this.itemLocations = s.allLocations && s.allLocations.length > 0 ? s.allLocations : [{
        WarehouseName: s.warehouseName,
        StoreName: s.storeName,
        StoreType: s.storeType,
        ShelfCode: s.shelfCode,
        OnHandQty: s.OnHandQty,
        AvailableQty: s.AvailableQty,
        ReservedQty: s.ReservedQty,
        IsReturnStore: (s.storeType || '').toLowerCase() === 'return',
        StoreID: s.StoreID
      }];
      this.selectedReturnStore = s.returnStore;
      if (this.locationModalInstance) {
        this.locationModalInstance.show();
      }
    },
    closeLocationModal() {
      if (this.locationModalInstance) {
        this.locationModalInstance.hide();
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminInventory; }
