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
        .filter-row th {
          background-color: #f8fafc !important;
          border-bottom: 2px solid #cbd5e1 !important;
          padding: 6px 8px !important;
        }
        .filter-row input, .filter-row select {
          font-size: 0.8rem !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
        }
        .current-stock-header {
          background-color: #065f46 !important;
          color: #ecfdf5 !important;
        }
        .kpi-card-inventory {
          border-radius: 12px;
          transition: transform 0.15s ease-in-out;
        }
        .kpi-card-inventory:hover {
          transform: translateY(-2px);
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
               <h4 class="mb-1 fw-bold text-dark"><i class="bi bi-stack me-2 text-primary"></i> Stock & Inventory Valuation Management</h4>
               <p class="text-muted small mb-0">Live stock valuation, Cost Value, Sale Value, Current Stock levels, and Return Store tracking.</p>
            </div>
            
            <div class="d-flex flex-wrap gap-3 align-items-center">
               <!-- Selected Warehouse -->
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

      <!-- 4 Prominent Valuation & Current Stock KPI Cards (Requested: CURRENT STOCK, COST VALUE, SALE VALUE) -->
      <div class="row g-3 mb-4">
         <!-- Card 1: CURRENT STOCK (Live Total Units) -->
         <div class="col-lg-3 col-md-6">
            <div class="card kpi-card-inventory border-0 shadow-sm bg-white p-3 border-start border-4 border-success h-100">
               <div class="d-flex justify-content-between align-items-center">
                  <div class="text-muted small text-uppercase fw-bold text-success">CURRENT STOCK (AVAILABLE)</div>
                  <i class="bi bi-box-seam-fill fs-4 text-success opacity-75"></i>
               </div>
               <h2 class="fw-bold text-success mt-2 mb-0">{{ summaryStats.totalCurrentStock }} <small class="fs-6 fw-normal text-muted">Units</small></h2>
               <div class="x-small text-muted mt-2">
                  Total On-Hand: <strong>{{ summaryStats.totalOnHand }}</strong> | Reserved: <strong>{{ summaryStats.totalReserved }}</strong>
               </div>
            </div>
         </div>

         <!-- Card 2: TOTAL COST VALUE -->
         <div class="col-lg-3 col-md-6">
            <div class="card kpi-card-inventory border-0 shadow-sm bg-white p-3 border-start border-4 border-warning h-100">
               <div class="d-flex justify-content-between align-items-center">
                  <div class="text-muted small text-uppercase fw-bold text-dark">TOTAL COST VALUE</div>
                  <i class="bi bi-cash-stack fs-4 text-warning opacity-75"></i>
               </div>
               <h2 class="fw-bold text-dark mt-2 mb-0">₹{{ summaryStats.totalCostValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h2>
               <div class="x-small text-muted mt-2">
                  Calculated based on actual procurement/GRN cost
               </div>
            </div>
         </div>

         <!-- Card 3: TOTAL SALE VALUE -->
         <div class="col-lg-3 col-md-6">
            <div class="card kpi-card-inventory border-0 shadow-sm bg-white p-3 border-start border-4 border-primary h-100">
               <div class="d-flex justify-content-between align-items-center">
                  <div class="text-muted small text-uppercase fw-bold text-primary">TOTAL SALE VALUE</div>
                  <i class="bi bi-tags-fill fs-4 text-primary opacity-75"></i>
               </div>
               <h2 class="fw-bold text-primary mt-2 mb-0">₹{{ summaryStats.totalSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h2>
               <div class="x-small text-muted mt-2">
                  Retail valuation at catalog selling price
               </div>
            </div>
         </div>

         <!-- Card 4: EXPECTED PROFIT MARGIN -->
         <div class="col-lg-3 col-md-6">
            <div class="card kpi-card-inventory border-0 shadow-sm bg-white p-3 border-start border-4 border-info h-100">
               <div class="d-flex justify-content-between align-items-center">
                  <div class="text-muted small text-uppercase fw-bold text-info">EXPECTED MARGIN / PROFIT</div>
                  <i class="bi bi-graph-up-arrow fs-4 text-info opacity-75"></i>
               </div>
               <h2 class="fw-bold text-info mt-2 mb-0">₹{{ summaryStats.totalProfitValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</h2>
               <div class="x-small text-muted mt-2">
                  Estimated Gross Margin: <strong>{{ summaryStats.marginPercent }}%</strong>
               </div>
            </div>
         </div>
      </div>

      <!-- Main Inventory Table with Filter Heading Row -->
      <div class="card border-0 shadow-sm overflow-hidden mb-5">
        <div class="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
           <div class="d-flex align-items-center gap-2">
              <h5 class="mb-0 fw-bold text-dark"><i class="bi bi-table me-2 text-primary"></i> Stock Valuation & Inventory Matrix</h5>
              <span class="badge bg-primary ms-2">{{ filteredStocks.length }} Displayed Items</span>
           </div>
           <div class="d-flex gap-2 align-items-center">
              <button class="btn btn-sm btn-outline-secondary" @click="resetFilters" v-if="hasActiveFilters">
                 <i class="bi bi-x-circle me-1"></i> Clear Filters
              </button>
              <div class="text-secondary small">
                 <i class="bi bi-info-circle me-1"></i> Click row to inspect location & return store
              </div>
           </div>
        </div>

        <div v-if="loading" class="text-center py-5">
           <div class="spinner-border text-primary" role="status"></div>
           <p class="text-muted mt-2">Calculating stock values & locations...</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table align-middle mb-0 table-hover">
            <!-- Table Main Header Row -->
            <thead class="bg-dark text-white small text-uppercase">
               <tr>
                  <th class="ps-3" style="min-width: 200px;">Product & Specs</th>
                  <th style="min-width: 140px;">Store</th>
                  <th style="min-width: 100px;">Shelf</th>
                  <th class="text-end" style="min-width: 100px;">Unit Cost</th>
                  <th class="text-end" style="min-width: 110px;">Cost Value</th>
                  <th class="text-end" style="min-width: 100px;">Sale Price</th>
                  <th class="text-end" style="min-width: 110px;">Sale Value</th>
                  <th class="text-center" style="min-width: 90px;">On Hand</th>
                  <!-- CURRENT STOCK HEADING (Requested) -->
                  <th class="text-center current-stock-header fw-bold" style="min-width: 140px;">
                     <i class="bi bi-box-seam me-1"></i> CURRENT STOCK
                  </th>
                  <th class="text-end pe-3" style="min-width: 140px;">Location & Return</th>
               </tr>

               <!-- FILTER HEADING ROW (Requested: "fitter heading row hona add karoyeh") -->
               <tr class="filter-row">
                  <!-- Product filter -->
                  <th class="ps-3">
                     <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white border-end-0 py-0 px-2"><i class="bi bi-search x-small"></i></span>
                        <input type="text" class="form-control form-control-sm border-start-0" placeholder="Filter product / SKU..." v-model="filterProduct">
                     </div>
                  </th>
                  <!-- Store filter -->
                  <th>
                     <select class="form-select form-select-sm" v-model="filterStore">
                        <option value="">All Stores</option>
                        <option v-for="st in uniqueStores" :key="st" :value="st">{{ st }}</option>
                     </select>
                  </th>
                  <!-- Shelf filter -->
                  <th>
                     <input type="text" class="form-control form-control-sm" placeholder="Shelf code..." v-model="filterShelf">
                  </th>
                  <!-- Cost filters -->
                  <th colspan="2" class="text-end">
                     <span class="x-small text-muted">Cost Valued</span>
                  </th>
                  <!-- Sale filters -->
                  <th colspan="2" class="text-end">
                     <span class="x-small text-muted">Sale Valued</span>
                  </th>
                  <!-- On Hand header -->
                  <th></th>
                  <!-- Current Stock / Status filter -->
                  <th>
                     <select class="form-select form-select-sm fw-bold" v-model="filterStockStatus">
                        <option value="">All Status</option>
                        <option value="in_stock">In Stock (>0)</option>
                        <option value="low_stock">Low Stock (≤10)</option>
                        <option value="out_of_stock">Out of Stock (=0)</option>
                     </select>
                  </th>
                  <!-- Reset / Actions -->
                  <th class="text-end pe-3">
                     <button class="btn btn-sm btn-link text-muted p-0 x-small text-decoration-none" @click="resetFilters" v-if="hasActiveFilters">
                        Reset
                     </button>
                  </th>
               </tr>
            </thead>

            <tbody>
               <tr v-for="s in filteredStocks" :key="s.StockID ? s.StockID : (s.StoreID + '-' + s.VariantID)" class="stock-row" @click="inspectStock(s)" title="Click to inspect where this stock is located & return store">
                  <!-- 1. Product & Specs -->
                  <td class="ps-3">
                     <div class="fw-bold text-dark">{{ s.productName }}</div>
                     <div class="small text-muted d-flex align-items-center gap-1 mt-1">
                        <span class="badge bg-light text-dark border">SKU: {{ s.sku }}</span>
                        <span v-if="s.specs" class="text-secondary fw-semibold">{{ s.specs }}</span>
                        <span class="badge bg-secondary-subtle text-secondary">{{ s.unit }}</span>
                     </div>
                  </td>

                  <!-- 2. Store -->
                  <td>
                     <div class="fw-bold small text-dark">{{ s.storeName }}</div>
                     <div class="x-small text-muted">{{ s.warehouseName }}</div>
                     <span class="badge x-small" :class="s.storeType === 'Return' ? 'bg-danger text-white' : (s.storeType === 'Floor' ? 'bg-success text-white' : 'bg-secondary text-white')">
                        {{ s.storeType || 'Store' }}
                     </span>
                  </td>

                  <!-- 3. Shelf -->
                  <td>
                     <span class="badge bg-light text-primary border px-2 py-1 fw-bold fs-7">
                        <i class="bi bi-geo-alt-fill me-1"></i> {{ s.shelfCode }}
                     </span>
                  </td>

                  <!-- 4. Unit Cost (₹) -->
                  <td class="text-end fw-semibold text-muted small">
                     ₹{{ s.unitCost.toFixed(2) }}
                  </td>

                  <!-- 5. COST VALUE (₹) (Requested) -->
                  <td class="text-end fw-bold text-dark">
                     ₹{{ s.costValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>

                  <!-- 6. Unit Sale Price (₹) -->
                  <td class="text-end fw-semibold text-primary small">
                     ₹{{ s.unitSalePrice.toFixed(2) }}
                  </td>

                  <!-- 7. SALE VALUE (₹) (Requested) -->
                  <td class="text-end fw-bold text-primary">
                     ₹{{ s.saleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>

                  <!-- 8. On Hand -->
                  <td class="text-center fw-bold text-dark">
                     {{ s.OnHandQty || 0 }}
                  </td>

                  <!-- 9. CURRENT STOCK (Available) (Requested: CURRENT STOCK HEADING) -->
                  <td class="text-center bg-success-subtle border-start border-end">
                     <span class="fw-bold fs-6" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty || 0 }}
                     </span>
                     <div class="x-small fw-bold" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty > 0 ? 'In Stock' : 'Out of Stock' }}
                     </div>
                  </td>

                  <!-- 10. Location & Return Store Action -->
                  <td class="text-end pe-3" @click.stop>
                     <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" @click="inspectStock(s)">
                        <i class="bi bi-pin-map-fill me-1"></i> View Location
                     </button>
                  </td>
               </tr>

               <tr v-if="filteredStocks.length === 0">
                  <td colspan="10" class="text-center py-5 text-muted">
                     <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                     No inventory records found matching your filters.
                  </td>
               </tr>
            </tbody>

            <!-- Table Footer with Column Totals -->
            <tfoot class="bg-light fw-bold" v-if="filteredStocks.length > 0">
               <tr>
                  <td colspan="3" class="ps-3 text-uppercase">Page Totals ({{ filteredStocks.length }} Items):</td>
                  <td class="text-end text-muted small">-</td>
                  <td class="text-end text-dark">₹{{ summaryStats.totalCostValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                  <td class="text-end text-muted small">-</td>
                  <td class="text-end text-primary">₹{{ summaryStats.totalSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                  <td class="text-center text-dark">{{ summaryStats.totalOnHand }}</td>
                  <td class="text-center bg-success-subtle text-success fs-6">{{ summaryStats.totalCurrentStock }} Units</td>
                  <td></td>
               </tr>
            </tfoot>
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
                        <div class="small text-muted mt-1">
                           <strong>Unit Cost:</strong> ₹{{ selectedStockItem.unitCost.toFixed(2) }} | 
                           <strong>Sale Price:</strong> ₹{{ selectedStockItem.unitSalePrice.toFixed(2) }}
                        </div>
                     </div>
                     <div class="text-end">
                        <div class="text-muted x-small text-uppercase fw-bold">CURRENT STOCK</div>
                        <h3 class="fw-bold text-success mb-0">{{ selectedStockItem.AvailableQty || 0 }} Units</h3>
                        <div class="x-small text-muted">Cost Value: ₹{{ selectedStockItem.costValue.toFixed(2) }}</div>
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
                              <th class="text-center">Available (Current Stock)</th>
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
      loading: false,

      // Column Filters (Requested: "fitter heading row hona add karoyeh")
      filterProduct: '',
      filterStore: '',
      filterShelf: '',
      filterStockStatus: '', // '', 'in_stock', 'low_stock', 'out_of_stock'
      
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
    uniqueStores() {
      const names = this.stocks.map(s => s.storeName).filter(Boolean);
      return Array.from(new Set(names)).sort();
    },
    hasActiveFilters() {
      return !!(this.filterProduct || this.filterStore || this.filterShelf || this.filterStockStatus);
    },
    filteredStocks() {
      return this.stocks.filter(s => {
        // Top Warehouse filter
        if (this.selectedWarehouseID && s.warehouseId !== this.selectedWarehouseID) return false;
        // Top Store filter
        if (this.selectedStoreID && s.StoreID !== this.selectedStoreID) return false;

        // Filter Heading Row: Product filter
        if (this.filterProduct) {
          const q = this.filterProduct.toLowerCase();
          const match = (s.productName || '').toLowerCase().includes(q) ||
                        (s.sku || '').toLowerCase().includes(q) ||
                        (s.specs || '').toLowerCase().includes(q);
          if (!match) return false;
        }

        // Filter Heading Row: Store filter
        if (this.filterStore && s.storeName !== this.filterStore) return false;

        // Filter Heading Row: Shelf filter
        if (this.filterShelf) {
          const sh = this.filterShelf.toLowerCase();
          if (!(s.shelfCode || '').toLowerCase().includes(sh)) return false;
        }

        // Filter Heading Row: Stock Status filter
        if (this.filterStockStatus === 'in_stock' && (s.AvailableQty || 0) <= 0) return false;
        if (this.filterStockStatus === 'low_stock' && ((s.AvailableQty || 0) <= 0 || (s.AvailableQty || 0) > 10)) return false;
        if (this.filterStockStatus === 'out_of_stock' && (s.AvailableQty || 0) > 0) return false;

        return true;
      });
    },
    summaryStats() {
      let currentStock = 0;
      let onHand = 0;
      let reserved = 0;
      let costVal = 0;
      let saleVal = 0;

      for (const s of this.filteredStocks) {
        currentStock += (s.AvailableQty || 0);
        onHand += (s.OnHandQty || 0);
        reserved += (s.ReservedQty || 0);
        costVal += (s.costValue || 0);
        saleVal += (s.saleValue || 0);
      }

      const profit = Math.max(0, saleVal - costVal);
      const margin = saleVal > 0 ? ((profit / saleVal) * 100).toFixed(1) : '0.0';

      return {
        totalCurrentStock: currentStock,
        totalOnHand: onHand,
        totalReserved: reserved,
        totalCostValue: costVal,
        totalSaleValue: saleVal,
        totalProfitValue: profit,
        marginPercent: margin
      };
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
    resetFilters() {
      this.filterProduct = '';
      this.filterStore = '';
      this.filterShelf = '';
      this.filterStockStatus = '';
    },
    async fetchStock() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query($wid: Int, $sid: Int) {
        allStocks(WarehouseID: $wid, StoreID: $sid) {
          StockID StoreID VariantID ShelfID OnHandQty ReservedQty AvailableQty
          WarehouseID WarehouseName StoreName StoreType ShelfCode
          UnitCost UnitSalePrice CostValue SaleValue
          variant {
            VariantID ProductID SKU Size Color Unit MRP SalePrice Cost
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

          const uCost = (s.UnitCost !== undefined && s.UnitCost !== null) ? s.UnitCost : (v.Cost || 0);
          const uSale = (s.UnitSalePrice !== undefined && s.UnitSalePrice !== null) ? s.UnitSalePrice : (v.SalePrice || (v.MRP ? parseFloat(v.MRP) : 0));
          const cVal = (s.CostValue !== undefined && s.CostValue !== null) ? s.CostValue : ((s.OnHandQty || 0) * uCost);
          const sVal = (s.SaleValue !== undefined && s.SaleValue !== null) ? s.SaleValue : ((s.OnHandQty || 0) * uSale);

          return {
            StockID: s.StockID,
            StoreID: s.StoreID,
            VariantID: s.VariantID,
            ShelfID: s.ShelfID,
            OnHandQty: s.OnHandQty || 0,
            ReservedQty: s.ReservedQty || 0,
            AvailableQty: s.AvailableQty || 0,
            unitCost: uCost,
            unitSalePrice: uSale,
            costValue: cVal,
            saleValue: sVal,
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
