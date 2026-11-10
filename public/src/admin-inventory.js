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
        .audit-card {
          border-left: 4px solid #198754;
          background-color: #f0fdf4;
        }
      </style>

      <!-- Header & Warehouse / Store Selectors -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
               <h4 class="mb-1 fw-bold text-dark"><i class="bi bi-stack me-2 text-primary"></i> Stock & Inventory Valuation Management</h4>
               <p class="text-muted small mb-0">Live stock valuation, Cost Value, Sale Value, UOM, Sold Qty, Current Stock levels, and Physical Inventory Auditing.</p>
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

      <!-- 4 Prominent Valuation & Current Stock KPI Cards -->
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
                  Total On-Hand: <strong>{{ summaryStats.totalOnHand }}</strong> | Sold: <strong>{{ summaryStats.totalSold }}</strong>
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
              <span class="badge bg-primary ms-2">{{ filteredStocks.length }} Items</span>
           </div>
           <div class="d-flex gap-2 align-items-center">
              <button class="btn btn-sm btn-outline-secondary" @click="resetFilters" v-if="hasActiveFilters">
                 <i class="bi bi-x-circle me-1"></i> Clear Filters
              </button>
              <div class="text-secondary small">
                 <i class="bi bi-info-circle me-1"></i> Click row to see movement history (kaha se kaha gaya) or click <strong>Inventory</strong> to count physical stock.
              </div>
           </div>
        </div>

        <div v-if="loading" class="text-center py-5">
           <div class="spinner-border text-primary" role="status"></div>
           <p class="text-muted mt-2">Calculating stock values & movements...</p>
        </div>

        <div v-else class="table-responsive">
          <table class="table align-middle mb-0 table-hover">
            <!-- Table Main Header Row -->
            <!-- Required: Product & Specs | Unit Cost | Cost Value | Sale Price | Sale Value | UOM | On Hand | Sold Qty | CURRENT STOCK | Location & Return | Inventory Btn -->
            <thead class="bg-dark text-white small text-uppercase">
               <tr>
                  <th class="ps-3" style="min-width: 220px;">Product & Specs</th>
                  <th class="text-end" style="min-width: 100px;">Unit Cost</th>
                  <th class="text-end" style="min-width: 110px;">Cost Value</th>
                  <th class="text-end" style="min-width: 100px;">Sale Price</th>
                  <th class="text-end" style="min-width: 110px;">Sale Value</th>
                  <th class="text-center" style="min-width: 80px;">UOM</th>
                  <th class="text-center" style="min-width: 90px;">On Hand</th>
                  <th class="text-center" style="min-width: 90px;">Sold Qty</th>
                  <th class="text-center current-stock-header fw-bold" style="min-width: 130px;">
                     <i class="bi bi-box-seam me-1"></i> CURRENT STOCK
                  </th>
                  <th style="min-width: 160px;">Location & Return</th>
                  <th class="text-end pe-3" style="min-width: 150px;">Actions</th>
               </tr>

               <!-- FILTER HEADING ROW -->
               <tr class="filter-row">
                  <!-- Product filter -->
                  <th class="ps-3">
                     <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white border-end-0 py-0 px-2"><i class="bi bi-search x-small"></i></span>
                        <input type="text" class="form-control form-control-sm border-start-0" placeholder="Filter product / SKU..." v-model="filterProduct">
                     </div>
                  </th>
                  <!-- Cost filters -->
                  <th></th>
                  <th></th>
                  <!-- Sale filters -->
                  <th></th>
                  <th></th>
                  <!-- UOM filter -->
                  <th>
                     <select class="form-select form-select-sm" v-model="filterUOM">
                        <option value="">All UOM</option>
                        <option v-for="u in uniqueUOMs" :key="u" :value="u">{{ u }}</option>
                     </select>
                  </th>
                  <!-- On Hand header -->
                  <th></th>
                  <!-- Sold Qty -->
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
                  <!-- Store / Shelf filter -->
                  <th>
                     <select class="form-select form-select-sm" v-model="filterStore">
                        <option value="">All Stores</option>
                        <option v-for="st in uniqueStores" :key="st" :value="st">{{ st }}</option>
                     </select>
                  </th>
                  <!-- Reset -->
                  <th class="text-end pe-3">
                     <button class="btn btn-sm btn-link text-muted p-0 x-small text-decoration-none" @click="resetFilters" v-if="hasActiveFilters">
                        Reset
                     </button>
                  </th>
               </tr>
            </thead>

            <tbody>
               <tr v-for="s in filteredStocks" :key="s.StockID ? s.StockID : (s.StoreID + '-' + s.VariantID)" class="stock-row" @click="inspectStock(s)" title="Click row to inspect where this stock moved (sale/transfer) & physical shelves">
                  <!-- 1. Product & Specs -->
                  <td class="ps-3">
                     <div class="fw-bold text-dark">{{ s.productName }}</div>
                     <div class="small text-muted d-flex align-items-center gap-1 mt-1 flex-wrap">
                        <span class="badge bg-light text-dark border">SKU: {{ s.sku }}</span>
                        <span v-if="s.specs" class="text-secondary fw-semibold">{{ s.specs }}</span>
                     </div>
                  </td>

                  <!-- 2. Unit Cost (₹) -->
                  <td class="text-end fw-semibold text-muted small">
                     ₹{{ s.unitCost.toFixed(2) }}
                  </td>

                  <!-- 3. COST VALUE (₹) -->
                  <td class="text-end fw-bold text-dark">
                     ₹{{ s.costValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>

                  <!-- 4. Sale Price (₹) -->
                  <td class="text-end fw-semibold text-primary small">
                     ₹{{ s.unitSalePrice.toFixed(2) }}
                  </td>

                  <!-- 5. SALE VALUE (₹) -->
                  <td class="text-end fw-bold text-primary">
                     ₹{{ s.saleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                  </td>

                  <!-- 6. Unit of Measurement (UOM) -->
                  <td class="text-center">
                     <span class="badge bg-secondary-subtle text-secondary fw-bold px-2 py-1">{{ s.unit }}</span>
                  </td>

                  <!-- 7. On Hand -->
                  <td class="text-center fw-bold text-dark">
                     {{ s.OnHandQty || 0 }}
                  </td>

                  <!-- 8. Sold Qty -->
                  <td class="text-center">
                     <span class="badge bg-info-subtle text-info fw-bold px-2 py-1">
                        {{ s.SoldQty || 0 }}
                     </span>
                  </td>

                  <!-- 9. CURRENT STOCK (Available) -->
                  <td class="text-center bg-success-subtle border-start border-end">
                     <span class="fw-bold fs-6" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty || 0 }}
                     </span>
                     <div class="x-small fw-bold" :class="s.AvailableQty > 0 ? 'text-success' : 'text-danger'">
                        {{ s.AvailableQty > 0 ? 'In Stock' : 'Out of Stock' }}
                     </div>
                  </td>

                  <!-- 10. Location & Return -->
                  <td>
                     <div class="small fw-bold text-dark">{{ s.storeName }}</div>
                     <div class="d-flex align-items-center gap-1 mt-1">
                        <span class="badge bg-light text-primary border px-2 py-0 x-small fw-bold">
                           <i class="bi bi-geo-alt-fill me-1"></i> {{ s.shelfCode }}
                        </span>
                        <span v-if="s.returnStore" class="badge bg-danger-subtle text-danger x-small" title="Return Store Shelf">
                           Ret: {{ s.returnStore.ShelfCode || 'RT01' }}
                        </span>
                     </div>
                  </td>

                  <!-- 11. Actions: Row Inspection & Inventory Audit Button -->
                  <td class="text-end pe-3" @click.stop>
                     <div class="d-flex justify-content-end gap-1">
                        <button class="btn btn-sm btn-outline-primary" @click="inspectStock(s)" title="Kaha se kaha gaya (Sales/Transfer trail) & Shelves">
                           <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="btn btn-sm btn-success fw-bold shadow-sm" @click="openInventoryAuditModal(s)" title="Porana stock kitna hai check karke input dalna">
                           <i class="bi bi-clipboard-check me-1"></i> Inventory
                        </button>
                     </div>
                  </td>
               </tr>

               <tr v-if="filteredStocks.length === 0">
                  <td colspan="11" class="text-center py-5 text-muted">
                     <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                     No inventory records found matching your filters.
                  </td>
               </tr>
            </tbody>

            <!-- Table Footer with Column Totals -->
            <tfoot class="bg-light fw-bold" v-if="filteredStocks.length > 0">
               <tr>
                  <td class="ps-3 text-uppercase">Page Totals:</td>
                  <td class="text-end text-muted small">-</td>
                  <td class="text-end text-dark">₹{{ summaryStats.totalCostValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                  <td class="text-end text-muted small">-</td>
                  <td class="text-end text-primary">₹{{ summaryStats.totalSaleValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</td>
                  <td class="text-center">-</td>
                  <td class="text-center text-dark">{{ summaryStats.totalOnHand }}</td>
                  <td class="text-center text-info">{{ summaryStats.totalSold }}</td>
                  <td class="text-center bg-success-subtle text-success fs-6">{{ summaryStats.totalCurrentStock }} Units</td>
                  <td colspan="2"></td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- MODAL 1: Row Click -> Stock Location & Movement History ("Kaha se kaha gaya sale ya transfer & koun se store ke shelf me kitna hai") -->
      <div class="modal fade" id="stockLocationModal" tabindex="-1" ref="stockLocationModal">
        <div class="modal-dialog modal-xl modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="selectedStockItem">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-clock-history text-primary me-2"></i> Item Movement & Shelf Location Trail
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeLocationModal()"></button>
            </div>
            <div class="modal-body p-4">
               <!-- Product Header Info -->
               <div class="card bg-light border-0 p-3 mb-4">
                  <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
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
                     <div class="d-flex gap-3 text-end">
                        <div class="p-2 bg-white rounded border">
                           <div class="text-muted x-small text-uppercase fw-bold">ON HAND</div>
                           <h4 class="fw-bold text-dark mb-0">{{ selectedStockItem.OnHandQty || 0 }}</h4>
                        </div>
                        <div class="p-2 bg-white rounded border">
                           <div class="text-muted x-small text-uppercase fw-bold text-info">TOTAL SOLD</div>
                           <h4 class="fw-bold text-info mb-0">{{ selectedStockItem.SoldQty || 0 }}</h4>
                        </div>
                        <div class="p-2 bg-white rounded border border-success">
                           <div class="text-muted x-small text-uppercase fw-bold text-success">CURRENT STOCK</div>
                           <h4 class="fw-bold text-success mb-0">{{ selectedStockItem.AvailableQty || 0 }}</h4>
                        </div>
                     </div>
                  </div>
               </div>

               <!-- NAV TABS: 1. Kaha Se Kaha Gaya (Movements) | 2. Shelf Locations | 3. Return Store -->
               <ul class="nav nav-tabs mb-3" role="tablist">
                  <li class="nav-item">
                     <button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#tab-movements" type="button">
                        <i class="bi bi-arrow-left-right text-primary me-1"></i> Kaha Se Kaha Gaya (Sale ya Transfer Audit Trail)
                     </button>
                  </li>
                  <li class="nav-item">
                     <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tab-locations" type="button">
                        <i class="bi bi-geo-alt-fill text-success me-1"></i> Shelf Locations (Koun Se Store Ke Shelf Me Hai Kitna Hai)
                     </button>
                  </li>
                  <li class="nav-item">
                     <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tab-returns" type="button">
                        <i class="bi bi-arrow-return-left text-danger me-1"></i> Return Store Location
                     </button>
                  </li>
               </ul>

               <div class="tab-content">
                  <!-- TAB 1: KAHA SE KAHA GAYA (Movements Trail) -->
                  <div class="tab-pane fade show active" id="tab-movements">
                     <div v-if="loadingAudit" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary"></div>
                        <span class="ms-2 text-muted">Loading movement logs...</span>
                     </div>
                     <div v-else class="table-responsive">
                        <table class="table table-sm align-middle table-hover border">
                           <thead class="bg-light small text-uppercase">
                              <tr>
                                 <th>Date & Time</th>
                                 <th>Movement Type</th>
                                 <th>From (Store / Shelf)</th>
                                 <th>To (Store / Shelf)</th>
                                 <th class="text-center">Qty</th>
                                 <th>Performed By (Officer)</th>
                                 <th>Remarks</th>
                              </tr>
                           </thead>
                           <tbody>
                              <tr v-for="m in auditMovements" :key="m.movementId">
                                 <td class="small text-muted">{{ m.date }}</td>
                                 <td>
                                    <span class="badge" :class="getMovementBadge(m.type)">{{ m.type }}</span>
                                 </td>
                                 <td class="small fw-semibold text-danger">{{ m.from }}</td>
                                 <td class="small fw-semibold text-success">{{ m.to }}</td>
                                 <td class="text-center fw-bold fs-7">{{ m.qty }}</td>
                                 <td class="small">
                                    <i class="bi bi-person-badge me-1 text-primary"></i> {{ m.officer }}
                                 </td>
                                 <td class="small text-muted">{{ m.remarks || '—' }}</td>
                              </tr>
                              <tr v-if="auditMovements.length === 0">
                                 <td colspan="7" class="text-center py-4 text-muted">
                                    <i class="bi bi-inbox me-1"></i> No movement records found for this product yet.
                                 </td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <!-- TAB 2: SHELF LOCATIONS (Koun se store ke shelf me hai kitna hai) -->
                  <div class="tab-pane fade" id="tab-locations">
                     <div class="table-responsive">
                        <table class="table table-sm align-middle table-bordered mb-0">
                           <thead class="bg-light small">
                              <tr>
                                 <th>Warehouse</th>
                                 <th>Store</th>
                                 <th>Shelf Code</th>
                                 <th class="text-center">On Hand Qty</th>
                                 <th class="text-center">Available (Current Stock)</th>
                                 <th>Store Type</th>
                                 <th class="text-end">Quick Action</th>
                              </tr>
                           </thead>
                           <tbody>
                              <tr v-for="(loc, idx) in itemLocations" :key="idx" :class="loc.StoreID === selectedStockItem.StoreID ? 'table-primary' : ''">
                                 <td class="fw-bold small">{{ loc.WarehouseName || loc.warehouseName }}</td>
                                 <td class="small">{{ loc.StoreName || loc.storeName }}</td>
                                 <td>
                                    <span class="badge bg-light text-primary border fw-bold fs-7">
                                       <i class="bi bi-geo-alt-fill me-1"></i> {{ loc.ShelfCode || loc.shelfCode }}
                                    </span>
                                 </td>
                                 <td class="text-center fw-bold">{{ loc.OnHandQty !== undefined ? loc.OnHandQty : loc.onHandQty }}</td>
                                 <td class="text-center fw-bold" :class="(loc.AvailableQty || loc.availableQty) > 0 ? 'text-success' : 'text-danger'">
                                    {{ loc.AvailableQty !== undefined ? loc.AvailableQty : loc.availableQty }}
                                 </td>
                                 <td>
                                    <span v-if="loc.IsReturnStore || loc.storeType === 'Return'" class="badge bg-danger text-white">Return Store</span>
                                    <span v-else-if="(loc.StoreType || loc.storeType) === 'Floor'" class="badge bg-success text-white">Floor Store</span>
                                    <span v-else class="badge bg-secondary text-white">{{ loc.StoreType || loc.storeType || 'Standard' }}</span>
                                    <span v-if="loc.StoreID === selectedStockItem.StoreID" class="badge bg-primary ms-1">Selected Store</span>
                                 </td>
                                 <td class="text-end">
                                    <button class="btn btn-sm btn-outline-success fw-bold py-0 px-2" @click="openInventoryAuditForShelf(loc)">
                                       <i class="bi bi-clipboard-check me-1"></i> Audit Shelf
                                    </button>
                                 </td>
                              </tr>
                              <tr v-if="itemLocations.length === 0">
                                 <td colspan="7" class="text-center py-3 text-muted small">
                                    No physical stock locations found for this item.
                                 </td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <!-- TAB 3: DESIGNATED RETURN STORE -->
                  <div class="tab-pane fade" id="tab-returns">
                     <div class="card border-0 shadow-sm return-card p-3">
                        <h6 class="fw-bold text-danger mb-2">
                           <i class="bi bi-arrow-return-left me-1"></i> Designated Return Store
                        </h6>
                        <p class="small text-muted mb-3">
                           Returned customer items or rejected stock are placed in this store's return shelf.
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
                           </div>
                        </div>
                        <div v-else class="text-muted small">
                           No Return Store configured for this warehouse yet.
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="modal-footer bg-light">
              <button type="button" class="btn btn-secondary fw-bold" @click="closeLocationModal()">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL 2: INVENTORY AUDIT / PHYSICAL COUNT MODAL ("jab inventory click kare tu porana stock kitna hai kaha kaha hai ab kitna check karke input dalna or check koun karta tha") -->
      <div class="modal fade" id="inventoryAuditModal" tabindex="-1" ref="inventoryAuditModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow" v-if="auditTargetItem">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-clipboard-check me-2"></i> Physical Stock Audit & Verification (Inventory Check)
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeInventoryAuditModal()"></button>
            </div>

            <div class="modal-body p-4">
               <!-- Product Summary Banner -->
               <div class="alert alert-light border d-flex justify-content-between align-items-center mb-4">
                  <div>
                     <h6 class="fw-bold text-dark mb-1">{{ auditTargetItem.productName }}</h6>
                     <div class="small text-muted">
                        SKU: <strong>{{ auditTargetItem.sku }}</strong> | 
                        Specs: <strong>{{ auditTargetItem.specs || 'Standard' }}</strong> | 
                        UOM: <strong>{{ auditTargetItem.unit }}</strong>
                     </div>
                  </div>
                  <div class="text-end">
                     <span class="badge bg-success-subtle text-success fs-7 px-3 py-2 fw-bold">
                        Current System Stock: {{ auditTargetItem.OnHandQty || 0 }} {{ auditTargetItem.unit }}
                     </span>
                  </div>
               </div>

               <!-- Shelf Selection & Porana Stock Info -->
               <div class="row g-3 mb-3">
                  <div class="col-md-6">
                     <label class="form-label fw-bold small text-muted text-uppercase">
                        <i class="bi bi-shop me-1 text-primary"></i> Target Store:
                     </label>
                     <select class="form-select fw-bold" v-model.number="auditForm.storeId" @change="onAuditStoreChange">
                        <option v-for="st in auditTargetItemLocations" :key="st.storeId || st.StoreID" :value="st.storeId || st.StoreID">
                           {{ st.storeName || st.StoreName }} ({{ st.shelfCode || st.ShelfCode }})
                        </option>
                     </select>
                  </div>

                  <div class="col-md-6">
                     <label class="form-label fw-bold small text-muted text-uppercase">
                        <i class="bi bi-geo-alt me-1 text-primary"></i> Shelf Location:
                     </label>
                     <input type="text" class="form-control bg-light fw-bold" :value="currentAuditLocation ? (currentAuditLocation.shelfCode || currentAuditLocation.ShelfCode) : 'FL01'" readonly>
                  </div>
               </div>

               <!-- Porana Stock vs Ab Kitna Check Kiya Input -->
               <div class="card border-0 shadow-sm audit-card p-3 mb-4">
                  <div class="row g-3 align-items-center">
                     <!-- Porana Stock (System Stock) -->
                     <div class="col-md-5 text-center border-end">
                        <div class="text-muted x-small text-uppercase fw-bold">Porana Stock (System On-Hand)</div>
                        <h3 class="fw-bold text-dark mt-2 mb-0">
                           {{ currentAuditOldQty }} <small class="fs-6 text-muted">{{ auditTargetItem.unit }}</small>
                        </h3>
                        <div class="x-small text-muted mt-1">Recorded in database for this shelf</div>
                     </div>

                     <!-- Ab Kitna Check Kiya (Physical Count Input) -->
                     <div class="col-md-7">
                        <label class="form-label fw-bold text-success text-uppercase small mb-1">
                           <i class="bi bi-input-cursor-text me-1"></i> Ab Kitna Check Kiya (Physical Count Input):
                        </label>
                        <div class="input-group">
                           <input type="number" class="form-control form-control-lg fw-bold border-success text-success" 
                                  v-model.number="auditForm.newQty" 
                                  min="0" step="any" placeholder="Enter physical counted qty...">
                           <span class="input-group-text bg-success text-white fw-bold">{{ auditTargetItem.unit }}</span>
                        </div>
                        <div class="x-small mt-1" :class="auditQtyDiff === 0 ? 'text-success' : (auditQtyDiff > 0 ? 'text-primary' : 'text-danger')">
                           Difference: <strong>{{ auditQtyDiff > 0 ? '+' : '' }}{{ auditQtyDiff }} {{ auditTargetItem.unit }}</strong>
                           <span v-if="auditQtyDiff !== 0"> (Stock will be adjusted automatically)</span>
                           <span v-else> (Exact match - no variance)</span>
                        </div>
                     </div>
                  </div>
               </div>

               <!-- Check Koun Karta Tha (Auditor Officer Name & Staff ID) -->
               <div class="row g-3 mb-3">
                  <div class="col-md-6">
                     <label class="form-label fw-bold small text-muted text-uppercase">
                        <i class="bi bi-person-badge-fill me-1 text-primary"></i> Check Koun Karta Tha (Officer Name):
                     </label>
                     <input type="text" class="form-control" v-model="auditForm.auditorName" placeholder="Enter officer / auditor name (e.g. Rahul Sharma)">
                  </div>

                  <div class="col-md-6">
                     <label class="form-label fw-bold small text-muted text-uppercase">
                        <i class="bi bi-card-text me-1 text-primary"></i> Officer / Staff ID:
                     </label>
                     <input type="text" class="form-control" v-model="auditForm.auditorId" placeholder="Enter Staff ID (e.g. OFF-042)">
                  </div>
               </div>

               <!-- Audit Notes / Reason -->
               <div class="mb-3">
                  <label class="form-label fw-bold small text-muted text-uppercase">
                     <i class="bi bi-chat-left-text me-1 text-primary"></i> Verification Notes / Audit Remarks:
                  </label>
                  <input type="text" class="form-control" v-model="auditForm.notes" placeholder="e.g. Physical inventory count verified on shelf">
               </div>

               <!-- Error / Success Alert -->
               <div v-if="auditAlert.show" class="alert alert-dismissible" :class="auditAlert.type === 'success' ? 'alert-success' : 'alert-danger'">
                  <i class="bi" :class="auditAlert.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
                  {{ auditAlert.message }}
               </div>
            </div>

            <div class="modal-footer bg-light">
               <button type="button" class="btn btn-secondary fw-bold" @click="closeInventoryAuditModal()">Cancel</button>
               <button type="button" class="btn btn-success fw-bold px-4 shadow-sm" :disabled="submittingAudit || auditForm.newQty === null" @click="submitAuditAdjustment">
                  <span v-if="submittingAudit" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="bi bi-check-all me-1"></i> Confirm & Reconcile Stock
               </button>
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

      // Column Filters
      filterProduct: '',
      filterStore: '',
      filterUOM: '',
      filterStockStatus: '', // '', 'in_stock', 'low_stock', 'out_of_stock'
      
      // Modal 1: Location & Movement History
      selectedStockItem: null,
      itemLocations: [],
      selectedReturnStore: null,
      auditMovements: [],
      loadingAudit: false,
      locationModalInstance: null,

      // Modal 2: Physical Inventory Count & Verification
      auditTargetItem: null,
      auditTargetItemLocations: [],
      auditForm: {
        storeId: null,
        shelfId: null,
        newQty: null,
        auditorName: 'Warehouse Auditor',
        auditorId: 'OFF-001',
        notes: 'Routine Physical Stock Count'
      },
      submittingAudit: false,
      auditAlert: { show: false, message: '', type: 'success' },
      inventoryModalInstance: null
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
    uniqueUOMs() {
      const uoms = this.stocks.map(s => s.unit).filter(Boolean);
      return Array.from(new Set(uoms)).sort();
    },
    hasActiveFilters() {
      return !!(this.filterProduct || this.filterStore || this.filterUOM || this.filterStockStatus);
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

        // Filter Heading Row: UOM filter
        if (this.filterUOM && s.unit !== this.filterUOM) return false;

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
      let sold = 0;
      let costVal = 0;
      let saleVal = 0;

      for (const s of this.filteredStocks) {
        currentStock += (s.AvailableQty || 0);
        onHand += (s.OnHandQty || 0);
        sold += (s.SoldQty || 0);
        costVal += (s.costValue || 0);
        saleVal += (s.saleValue || 0);
      }

      const profit = Math.max(0, saleVal - costVal);
      const margin = saleVal > 0 ? ((profit / saleVal) * 100).toFixed(1) : '0.0';

      return {
        totalCurrentStock: currentStock,
        totalOnHand: onHand,
        totalSold: sold,
        totalCostValue: costVal,
        totalSaleValue: saleVal,
        totalProfitValue: profit,
        marginPercent: margin
      };
    },
    currentAuditLocation() {
      if (!this.auditTargetItemLocations || this.auditTargetItemLocations.length === 0) return null;
      return this.auditTargetItemLocations.find(l => (l.storeId || l.StoreID) === this.auditForm.storeId) || this.auditTargetItemLocations[0];
    },
    currentAuditOldQty() {
      const loc = this.currentAuditLocation;
      if (!loc) return 0;
      return loc.onHandQty !== undefined ? loc.onHandQty : (loc.OnHandQty || 0);
    },
    auditQtyDiff() {
      if (this.auditForm.newQty === null || this.auditForm.newQty === undefined) return 0;
      return this.auditForm.newQty - this.currentAuditOldQty;
    }
  },
  async mounted() {
    if (this.$refs.stockLocationModal) {
      this.locationModalInstance = new bootstrap.Modal(this.$refs.stockLocationModal);
    }
    if (this.$refs.inventoryAuditModal) {
      this.inventoryModalInstance = new bootstrap.Modal(this.$refs.inventoryAuditModal);
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
      this.filterUOM = '';
      this.filterStockStatus = '';
    },
    async fetchStock() {
      this.loading = true;
      const token = localStorage.getItem('token');
      const query = `query($wid: Int, $sid: Int) {
        allStocks(WarehouseID: $wid, StoreID: $sid) {
          StockID StoreID VariantID ShelfID OnHandQty ReservedQty AvailableQty
          WarehouseID WarehouseName StoreName StoreType ShelfCode
          UnitCost UnitSalePrice CostValue SaleValue SoldQty
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
            SoldQty: s.SoldQty || 0,
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

    // Row Click Action -> Inspect Locations & Movement Audit Trail (Kaha se kaha gaya)
    async inspectStock(s) {
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
      this.auditMovements = [];
      this.loadingAudit = true;

      if (this.locationModalInstance) {
        this.locationModalInstance.show();
      }

      // Fetch Movement Audit from backend
      try {
        const resp = await fetch(`/api/admin/inventory/movement-audit/${s.VariantID}`);
        const data = await resp.json();
        if (data.success) {
          this.auditMovements = data.movements || [];
          if (data.locations && data.locations.length > 0) {
            this.itemLocations = data.locations;
          }
        }
      } catch (err) {
        console.error("Error fetching movement audit:", err);
      } finally {
        this.loadingAudit = false;
      }
    },

    closeLocationModal() {
      if (this.locationModalInstance) {
        this.locationModalInstance.hide();
      }
    },

    getMovementBadge(type) {
      const t = (type || '').toUpperCase();
      if (t === 'SALE' || t === 'OUTBOUND') return 'bg-danger text-white';
      if (t === 'TRANSFER' || t === 'PUTAWAY') return 'bg-primary text-white';
      if (t === 'INWARD' || t === 'GRN') return 'bg-success text-white';
      if (t === 'AUDIT' || t === 'ADJUSTMENT') return 'bg-warning text-dark';
      return 'bg-secondary text-white';
    },

    // Inventory Button Click -> Open Physical Audit Modal
    openInventoryAuditModal(s) {
      this.auditTargetItem = s;
      this.auditAlert.show = false;

      // Populate locations list
      if (s.allLocations && s.allLocations.length > 0) {
        this.auditTargetItemLocations = s.allLocations;
      } else {
        this.auditTargetItemLocations = [{
          storeId: s.StoreID,
          storeName: s.storeName,
          shelfId: s.ShelfID,
          shelfCode: s.shelfCode,
          onHandQty: s.OnHandQty,
          availableQty: s.AvailableQty
        }];
      }

      this.auditForm.storeId = s.StoreID;
      this.auditForm.shelfId = s.ShelfID;
      this.auditForm.newQty = s.OnHandQty || 0;
      this.auditForm.auditorName = localStorage.getItem('userName') || 'Warehouse Officer';
      this.auditForm.auditorId = localStorage.getItem('userId') ? `OFF-${localStorage.getItem('userId')}` : 'OFF-001';
      this.auditForm.notes = 'Routine Physical Stock Count';

      if (this.inventoryModalInstance) {
        this.inventoryModalInstance.show();
      }
    },

    openInventoryAuditForShelf(loc) {
      if (this.locationModalInstance) {
        this.locationModalInstance.hide();
      }
      this.openInventoryAuditModal(this.selectedStockItem);
      this.auditForm.storeId = loc.storeId || loc.StoreID;
      this.auditForm.shelfId = loc.shelfId || loc.ShelfID;
      this.auditForm.newQty = loc.onHandQty !== undefined ? loc.onHandQty : loc.OnHandQty;
    },

    onAuditStoreChange() {
      const loc = this.currentAuditLocation;
      if (loc) {
        this.auditForm.shelfId = loc.shelfId || loc.ShelfID;
        this.auditForm.newQty = loc.onHandQty !== undefined ? loc.onHandQty : (loc.OnHandQty || 0);
      }
    },

    closeInventoryAuditModal() {
      if (this.inventoryModalInstance) {
        this.inventoryModalInstance.hide();
      }
    },

    async submitAuditAdjustment() {
      if (!this.auditTargetItem || this.auditForm.newQty === null) return;
      this.submittingAudit = true;
      this.auditAlert.show = false;

      try {
        const payload = {
          variantId: this.auditTargetItem.VariantID,
          storeId: this.auditForm.storeId,
          shelfId: this.auditForm.shelfId || (this.currentAuditLocation ? (this.currentAuditLocation.shelfId || this.currentAuditLocation.ShelfID) : null),
          oldQty: this.currentAuditOldQty,
          newQty: this.auditForm.newQty,
          auditorName: this.auditForm.auditorName,
          auditorId: this.auditForm.auditorId,
          notes: this.auditForm.notes
        };

        const resp = await fetch('/api/admin/inventory/audit-adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await resp.json();
        if (data.success) {
          this.auditAlert = {
            show: true,
            type: 'success',
            message: `Stock successfully reconciled for ${this.auditTargetItem.productName}! New On-Hand: ${data.stock.onHandQty} ${this.auditTargetItem.unit}`
          };
          // Refresh table
          setTimeout(() => {
            this.closeInventoryAuditModal();
            this.fetchStock();
          }, 1200);
        } else {
          this.auditAlert = {
            show: true,
            type: 'danger',
            message: data.message || 'Failed to adjust stock'
          };
        }
      } catch (err) {
        console.error("Error submitting stock audit:", err);
        this.auditAlert = {
          show: true,
          type: 'danger',
          message: err.message || 'Server error while adjusting stock'
        };
      } finally {
        this.submittingAudit = false;
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminInventory; }
