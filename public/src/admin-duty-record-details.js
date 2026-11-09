// Admin Duty Record Details Component (/admin/duty-records/:id, :id/putaway, :id/picking)
const AdminDutyRecordDetails = {
  template: `
    <div class="container-fluid my-4">
      <!-- Breadcrumb / Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <router-link to="/admin/duty-records" class="btn btn-sm btn-outline-secondary">
              <i class="bi bi-arrow-left"></i> Duty Records
            </router-link>
            <span class="text-muted">/</span>
            <span class="text-dark font-weight-bold">Staff Activity Details</span>
            <span v-if="activeTab !== 'overview'" class="badge bg-secondary text-uppercase">{{ activeTab }}</span>
          </div>
          <h3 class="mb-0 text-dark font-weight-bold">
            <i class="bi bi-person-workspace text-primary"></i>
            {{ employee?.name || 'Staff' }} — Live Duty & Work Activity
          </h3>
          <p class="text-muted small mb-0">
            Real-time tracking of warehouse staff tasks: Putaway, Picking, Returns, Shifting & Floor Progress.
          </p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button @click="fetchDetails" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-arrow-clockwise"></i> Refresh
          </button>
          <router-link to="/admin/putway-task" class="btn btn-outline-success btn-sm">
            <i class="bi bi-box-arrow-in-down-right"></i> All Putaway Tasks
          </router-link>
        </div>
      </div>

      <!-- Loading / Error States -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <div class="mt-2 text-muted">Loading employee duty & activity details...</div>
      </div>

      <div v-else-if="error" class="alert alert-danger shadow-sm">
        <i class="bi bi-exclamation-triangle-fill me-2"></i> {{ error }}
      </div>

      <div v-else>
        <!-- Employee Profile & Duty Status Card -->
        <div class="card shadow-sm border-0 mb-4 bg-white">
          <div class="card-body p-4">
            <div class="row align-items-center g-3">
              <!-- Left: Avatar + Details -->
              <div class="col-md-5 d-flex align-items-center gap-3">
                <div class="position-relative">
                  <img v-if="duty?.SelfieUrl" :src="duty.SelfieUrl" class="rounded-circle border border-2 border-primary shadow-sm" style="width: 72px; height: 72px; object-fit: cover;">
                  <div v-else class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center font-weight-bold shadow-sm" style="width: 72px; height: 72px; font-size: 26px;">
                    {{ employee?.name ? employee.name.charAt(0) : 'E' }}
                  </div>
                  <span class="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle" :class="employee?.isOnline ? 'bg-success' : 'bg-secondary'" title="Online Status"></span>
                </div>
                <div>
                  <div class="d-flex align-items-center gap-2">
                    <h4 class="mb-0 font-weight-bold text-dark">{{ employee?.name }}</h4>
                    <span class="badge" :class="getRoleBadge(employee?.role)">{{ employee?.role }}</span>
                  </div>
                  <div class="text-muted small mt-1">
                    <span class="me-2"><i class="bi bi-telephone"></i> {{ employee?.mobile || '—' }}</span>
                    <span><i class="bi bi-envelope"></i> {{ employee?.email || '—' }}</span>
                  </div>
                  <div class="small text-muted mt-0.5">
                    User ID: <span class="font-monospace fw-bold">#{{ employee?.userId }}</span> |
                    Account: <span :class="employee?.isActive ? 'text-success fw-bold' : 'text-danger fw-bold'">{{ employee?.isActive ? 'Active' : 'Disabled' }}</span>
                  </div>
                </div>
              </div>

              <!-- Center: Duty & Time Status ("Kab se hai") -->
              <div class="col-md-4 border-start border-end px-3">
                <small class="text-muted text-uppercase font-weight-bold d-block">Kab Se Hai (Duty Timing)</small>
                <div class="fs-5 font-weight-bold text-dark mt-1">
                  <i class="bi bi-clock-history text-primary me-1"></i>
                  {{ dutyDuration || 'Not on Duty' }}
                </div>
                <div class="small text-muted mt-1">
                  Punch-In: <span class="font-monospace fw-bold text-dark">{{ duty?.PunchInTime || 'Pending' }}</span>
                  <span v-if="duty?.PunchOutTime" class="ms-2">| Out: <span class="font-monospace fw-bold text-secondary">{{ duty.PunchOutTime }}</span></span>
                </div>
                <div class="mt-2 d-flex align-items-center gap-2">
                  <span class="badge" :class="getStatusBadge(duty?.ApprovalStatus)">{{ duty?.ApprovalStatus || 'OFF DUTY' }}</span>
                  <span v-if="duty?.ApprovalCode" class="badge bg-dark text-warning font-monospace">PIN: {{ duty.ApprovalCode }}</span>
                </div>
              </div>

              <!-- Right: Quick Manager Actions -->
              <div class="col-md-3 text-md-end">
                <div class="d-flex flex-wrap gap-1.5 justify-content-md-end">
                  <button v-if="duty?.ApprovalStatus === 'PENDING_APPROVAL'" @click="handleAction('forcecheckin')" class="btn btn-sm btn-success font-weight-bold">
                    <i class="bi bi-check-circle"></i> Force Check-In
                  </button>
                  <button v-if="duty?.ApprovalStatus === 'ACTIVE'" @click="handleAction('checkout')" class="btn btn-sm btn-outline-warning text-dark font-weight-bold">
                    <i class="bi bi-box-arrow-right"></i> Checkout
                  </button>
                  <button v-if="employee?.isActive" @click="handleAction('id-disable')" class="btn btn-sm btn-outline-danger">
                    <i class="bi bi-slash-circle"></i> Disable ID
                  </button>
                  <button v-else @click="handleAction('id-active')" class="btn btn-sm btn-outline-success">
                    <i class="bi bi-check2-circle"></i> Activate ID
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards: Putaway, Picking, Returns, Shifting -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
              <div class="card-body p-3 d-flex justify-content-between align-items-center cursor-pointer" @click="setTab('putaway')">
                <div>
                  <small class="text-white-50 text-uppercase font-weight-bold">Putaway Done</small>
                  <h3 class="mb-0 font-weight-bold">{{ putawayData?.totalPlacedUnits || putawayData?.totalQty || 0 }} <span class="fs-6 font-weight-normal">units</span></h3>
                  <small class="text-white-75">{{ putawayData?.totalPlacedItems || putawayData?.totalCount || 0 }} task operations</small>
                </div>
                <i class="bi bi-box-arrow-in-down-right fs-1 text-white-50"></i>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white;">
              <div class="card-body p-3 d-flex justify-content-between align-items-center cursor-pointer" @click="setTab('picking')">
                <div>
                  <small class="text-white-50 text-uppercase font-weight-bold">Picking Done</small>
                  <h3 class="mb-0 font-weight-bold">{{ pickingData?.totalPickedUnits || pickingData?.totalQty || 0 }} <span class="fs-6 font-weight-normal">units</span></h3>
                  <small class="text-white-75">{{ pickingData?.totalPickedItems || pickingData?.totalCount || 0 }} orders picked</small>
                </div>
                <i class="bi bi-cart-check fs-1 text-white-50"></i>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white;">
              <div class="card-body p-3 d-flex justify-content-between align-items-center cursor-pointer" @click="setTab('overview')">
                <div>
                  <small class="text-white-50 text-uppercase font-weight-bold">Returns Handled</small>
                  <h3 class="mb-0 font-weight-bold">{{ returnsData?.totalCount || 0 }}</h3>
                  <small class="text-white-75">Customer/RTV returns</small>
                </div>
                <i class="bi bi-arrow-counterclockwise fs-1 text-white-50"></i>
              </div>
            </div>
          </div>

          <div class="col-md-3">
            <div class="card border-0 shadow-sm" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
              <div class="card-body p-3 d-flex justify-content-between align-items-center cursor-pointer" @click="setTab('overview')">
                <div>
                  <small class="text-white-50 text-uppercase font-weight-bold">Transfers / Shifting</small>
                  <h3 class="mb-0 font-weight-bold">{{ transfersData?.totalCount || 0 }}</h3>
                  <small class="text-white-75">Inter-shelf stock movements</small>
                </div>
                <i class="bi bi-arrow-left-right fs-1 text-white-50"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs: Overview | Putaway | Picking -->
        <ul class="nav nav-pills mb-3 border-bottom pb-2">
          <li class="nav-item">
            <button class="nav-link font-weight-bold me-2" :class="{'active': activeTab === 'overview'}" @click="setTab('overview')">
              <i class="bi bi-grid-fill me-1"></i> Full Overview
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link font-weight-bold me-2" :class="{'active': activeTab === 'putaway'}" @click="setTab('putaway')">
              <i class="bi bi-box-arrow-in-down-right me-1"></i> Putaway Activity (Floor to Shelf)
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link font-weight-bold" :class="{'active': activeTab === 'picking'}" @click="setTab('picking')">
              <i class="bi bi-cart-check me-1"></i> Picking Activity (Orders)
            </button>
          </li>
        </ul>

        <!-- ==================== TAB 1: OVERVIEW ==================== -->
        <div v-if="activeTab === 'overview'" class="row g-4">
          <!-- Recent Putaway Quick Card -->
          <div class="col-md-6">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-light d-flex justify-content-between align-items-center py-2.5">
                <h6 class="mb-0 font-weight-bold text-dark">
                  <i class="bi bi-box-arrow-in-down-right text-success me-1"></i> Recent Putaway Tasks
                </h6>
                <button @click="setTab('putaway')" class="btn btn-sm btn-link p-0 text-decoration-none font-weight-bold">View All &rarr;</button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>Item</th>
                        <th>From &rarr; To</th>
                        <th>Qty</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!putawayData?.placedItems || putawayData.placedItems.length === 0">
                        <td colspan="4" class="text-center py-3 text-muted">No putaway movements recorded yet.</td>
                      </tr>
                      <tr v-for="item in (putawayData?.placedItems || []).slice(0, 5)" :key="item.movementId">
                        <td>
                          <div class="font-weight-bold text-dark">{{ item.productName || 'Item #' + item.variantId }}</div>
                          <small class="text-muted font-monospace">{{ item.sku || item.barcode || 'V#' + item.variantId }}</small>
                        </td>
                        <td>
                          <span class="badge bg-light text-dark border">{{ item.outShelf || item.fromShelf || 'FL01' }}</span>
                          <i class="bi bi-arrow-right mx-1 text-muted"></i>
                          <span class="badge bg-success-subtle text-success border border-success">{{ item.inShelf || item.toShelf }}</span>
                        </td>
                        <td><span class="font-monospace fw-bold text-success">+{{ item.qty }} {{ item.unit || '' }}</span></td>
                        <td><small class="text-muted font-monospace">{{ formatTime(item.timestamp || item.date) }}</small></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Picking Quick Card -->
          <div class="col-md-6">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-light d-flex justify-content-between align-items-center py-2.5">
                <h6 class="mb-0 font-weight-bold text-dark">
                  <i class="bi bi-cart-check text-primary me-1"></i> Recent Picking Tasks
                </h6>
                <button @click="setTab('picking')" class="btn btn-sm btn-link p-0 text-decoration-none font-weight-bold">View All &rarr;</button>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-sm table-hover mb-0 align-middle">
                    <thead class="table-light">
                      <tr>
                        <th>Order / Item</th>
                        <th>Shelf</th>
                        <th>Qty</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="!pickingData?.pickedItems || pickingData.pickedItems.length === 0">
                        <td colspan="4" class="text-center py-3 text-muted">No picking tasks completed yet.</td>
                      </tr>
                      <tr v-for="item in (pickingData?.pickedItems || []).slice(0, 5)" :key="item.taskId">
                        <td>
                          <div class="font-weight-bold text-dark">Order #{{ item.orderId }}</div>
                          <small class="text-muted">{{ item.itemName }}</small>
                        </td>
                        <td><span class="badge bg-light text-dark border">{{ item.shelfCode }}</span></td>
                        <td><span class="font-monospace fw-bold text-primary">{{ item.qty }}</span></td>
                        <td><span class="badge bg-success">{{ item.status }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== TAB 2: PUTAWAY (:id/putaway) ==================== -->
        <div v-if="activeTab === 'putaway'">
          <!-- Putaway Status & Processing Banner -->
          <div class="card bg-light border-0 shadow-sm mb-4">
            <div class="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Kab Se Hai (Punch-In Duration):</span>
                <div class="fs-5 font-weight-bold text-dark">
                  <i class="bi bi-clock-history text-success me-1"></i> {{ dutyDuration }}
                </div>
              </div>

              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Ab Kya Kara Processing Hai:</span>
                <span class="badge fs-6 mt-1" :class="putawayData?.placedItems?.length > 0 ? 'bg-success text-white' : 'bg-warning text-dark'">
                  <i class="bi bi-gear-wide-connected me-1"></i>
                  {{ putawayData?.processing || (putawayData?.placedItems?.length > 0 ? 'Active Putaway in Progress' : 'Idle / Ready for Floor Putaway') }}
                </span>
              </div>

              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Putaway Summary:</span>
                <span class="badge bg-dark text-white fs-6 mt-1">
                  {{ putawayData?.totalPlacedUnits || putawayData?.totalQty || 0 }} Units Placed
                </span>
              </div>
            </div>
          </div>

          <div class="row g-4">
            <!-- Table A: Kitne Item Rakha (Placed Items) -->
            <div class="col-lg-7">
              <div class="card shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h5 class="mb-0 font-weight-bold text-dark">
                    <i class="bi bi-check2-all text-success me-1"></i> Kitne Item Rakha (Placed Items)
                  </h5>
                  <span class="badge bg-success-subtle text-success border border-success font-monospace">
                    {{ (putawayData?.placedItems || []).length }} Records
                  </span>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Item & Variant</th>
                          <th>Out-Shelf (From)</th>
                          <th>In-Shelf (To)</th>
                          <th>Qty Placed</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!putawayData?.placedItems || putawayData.placedItems.length === 0">
                          <td colspan="5" class="text-center py-4 text-muted">
                            Is employee ne abhi tak koi putaway movement record nahi kiya hai.
                          </td>
                        </tr>
                        <tr v-for="item in putawayData?.placedItems" :key="item.movementId">
                          <td>
                            <div class="font-weight-bold text-dark">{{ item.productName || 'Variant #' + item.variantId }}</div>
                            <small class="text-muted font-monospace">{{ item.sku || item.barcode || 'V#' + item.variantId }}</small>
                          </td>
                          <td>
                            <span class="badge bg-secondary text-white font-monospace">
                              {{ item.outShelf || item.fromShelf || 'FL01' }}
                            </span>
                          </td>
                          <td>
                            <span class="badge bg-success font-monospace">
                              <i class="bi bi-box-arrow-in-down"></i> {{ item.inShelf || item.toShelf }}
                            </span>
                          </td>
                          <td>
                            <span class="font-monospace fw-bold text-success fs-6">+{{ item.qty }} {{ item.unit || '' }}</span>
                          </td>
                          <td>
                            <small class="text-muted font-monospace">{{ formatTime(item.timestamp || item.date) }}</small>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table B: Kitne Abhi Baqi Hai (Floor Stock Remaining) -->
            <div class="col-lg-5">
              <div class="card shadow-sm border-warning">
                <div class="card-header bg-warning-subtle text-warning-emphasis py-3 d-flex justify-content-between align-items-center">
                  <h5 class="mb-0 font-weight-bold">
                    <i class="bi bi-hourglass-split me-1"></i> Kitne Abhi Baqi Hai (Floor Stock)
                  </h5>
                  <span class="badge bg-warning text-dark font-monospace">
                    {{ (putawayData?.remainingFloorStock || []).length }} Items
                  </span>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Floor Item</th>
                          <th>Floor Shelf</th>
                          <th>Baqi Qty</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!putawayData?.remainingFloorStock || putawayData.remainingFloorStock.length === 0">
                          <td colspan="4" class="text-center py-4 text-muted">
                            🎉 Floor is completely clear! Koi pending putaway stock nahi hai.
                          </td>
                        </tr>
                        <tr v-for="stk in putawayData?.remainingFloorStock" :key="stk.stockId">
                          <td>
                            <div class="font-weight-bold text-dark">{{ stk.productName || 'Variant #' + stk.variantId }}</div>
                            <small class="text-muted font-monospace">{{ stk.sku || 'V#' + stk.variantId }}</small>
                          </td>
                          <td>
                            <span class="badge bg-dark text-white font-monospace">{{ stk.shelfCode || 'FL01' }}</span>
                          </td>
                          <td>
                            <span class="badge bg-danger-subtle text-danger font-monospace fs-6 fw-bold">
                              {{ stk.floorQty }} {{ stk.unit || 'units' }}
                            </span>
                          </td>
                          <td>
                            <span class="badge bg-warning text-dark">Pending Shelf Placement</span>
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

        <!-- ==================== TAB 3: PICKING (:id/picking) ==================== -->
        <div v-if="activeTab === 'picking'">
          <!-- Picking Status & Processing Banner -->
          <div class="card bg-light border-0 shadow-sm mb-4">
            <div class="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Kab Se Hai (Punch-In Duration):</span>
                <div class="fs-5 font-weight-bold text-dark">
                  <i class="bi bi-clock-history text-primary me-1"></i> {{ dutyDuration }}
                </div>
              </div>

              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Ab Kya Kara Processing Hai:</span>
                <span class="badge fs-6 mt-1" :class="pickingData?.pickedItems?.length > 0 ? 'bg-primary text-white' : 'bg-secondary text-white'">
                  <i class="bi bi-cart me-1"></i>
                  {{ pickingData?.processing || (pickingData?.pickedItems?.length > 0 ? 'Order Picking in Progress' : 'Idle / Waiting for Order Assignment') }}
                </span>
              </div>

              <div>
                <span class="text-muted small text-uppercase font-weight-bold d-block">Picking Summary:</span>
                <span class="badge bg-dark text-white fs-6 mt-1">
                  {{ pickingData?.totalQty || 0 }} Items Picked
                </span>
              </div>
            </div>
          </div>

          <div class="row g-4">
            <!-- Table A: Kitne Item Pick Kiya -->
            <div class="col-lg-7">
              <div class="card shadow-sm">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h5 class="mb-0 font-weight-bold text-dark">
                    <i class="bi bi-cart-check-fill text-primary me-1"></i> Kitne Item Pick Kiya
                  </h5>
                  <span class="badge bg-primary-subtle text-primary border border-primary font-monospace">
                    {{ (pickingData?.pickedItems || []).length }} Pick Tasks
                  </span>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Order #</th>
                          <th>Item Name</th>
                          <th>From Shelf</th>
                          <th>Qty Picked</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!pickingData?.pickedItems || pickingData.pickedItems.length === 0">
                          <td colspan="5" class="text-center py-4 text-muted">
                            Is employee ne abhi tak koi item pick nahi kiya hai.
                          </td>
                        </tr>
                        <tr v-for="item in pickingData?.pickedItems" :key="item.taskId">
                          <td>
                            <span class="font-monospace fw-bold text-dark">#{{ item.orderId }}</span>
                          </td>
                          <td>
                            <div class="font-weight-bold">{{ item.itemName }}</div>
                          </td>
                          <td>
                            <span class="badge bg-light text-dark border font-monospace">{{ item.shelfCode }}</span>
                          </td>
                          <td>
                            <span class="font-monospace fw-bold text-primary fs-6">{{ item.qty }}</span>
                          </td>
                          <td>
                            <span class="badge bg-success">{{ item.status || 'PICKED' }}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table B: Kitne Abhi Baqi Hai (Pending Picking Queue) -->
            <div class="col-lg-5">
              <div class="card shadow-sm border-info">
                <div class="card-header bg-info-subtle text-info-emphasis py-3 d-flex justify-content-between align-items-center">
                  <h5 class="mb-0 font-weight-bold">
                    <i class="bi bi-clock me-1"></i> Kitne Abhi Baqi Hai (Pending Orders)
                  </h5>
                  <span class="badge bg-info text-dark font-monospace">
                    {{ (pickingData?.pendingPicking || []).length }} Pending
                  </span>
                </div>
                <div class="card-body p-0">
                  <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Order ID</th>
                          <th>Item</th>
                          <th>Target Shelf</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!pickingData?.pendingPicking || pickingData.pendingPicking.length === 0">
                          <td colspan="4" class="text-center py-4 text-muted">
                            🎉 Picking queue is empty! Koi pending order nahi hai.
                          </td>
                        </tr>
                        <tr v-for="ord in pickingData?.pendingPicking" :key="ord.orderId">
                          <td><span class="font-monospace fw-bold">#{{ ord.orderId }}</span></td>
                          <td><div class="small fw-bold">{{ ord.itemName }}</div></td>
                          <td><span class="badge bg-light text-dark border">{{ ord.shelfCode }}</span></td>
                          <td><span class="badge bg-warning text-dark">{{ ord.status }}</span></td>
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
    </div>
  `,
  data() {
    return {
      id: null,
      activeTab: 'overview', // 'overview' | 'putaway' | 'picking'
      loading: true,
      error: null,
      employee: null,
      duty: null,
      dutyDuration: '',
      putawayData: null,
      pickingData: null,
      returnsData: null,
      transfersData: null
    };
  },
  mounted() {
    this.initFromRoute();
  },
  watch: {
    '$route.path': function() {
      this.initFromRoute();
    }
  },
  methods: {
    initFromRoute() {
      this.id = this.$route.params.id;
      const fullPath = this.$route.path;
      if (fullPath.endsWith('/putaway')) {
        this.activeTab = 'putaway';
      } else if (fullPath.endsWith('/picking')) {
        this.activeTab = 'picking';
      } else {
        this.activeTab = 'overview';
      }
      this.fetchDetails();
    },
    setTab(tab) {
      this.activeTab = tab;
      const base = `/admin/duty-records/${this.id}`;
      if (tab === 'putaway') {
        this.$router.push(`${base}/putaway`).catch(() => {});
      } else if (tab === 'picking') {
        this.$router.push(`${base}/picking`).catch(() => {});
      } else {
        this.$router.push(base).catch(() => {});
      }
    },
    async fetchDetails() {
      if (!this.id) return;
      this.loading = true;
      this.error = null;
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/admin/duty-records/${this.id}/details`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          this.employee = res.data.employee || res.data.user;
          this.duty = res.data.duty;
          this.dutyDuration = res.data.dutyDuration || res.data.putaway?.duration || res.data.duty?.durationText || 'Not on Duty';
          this.putawayData = res.data.putaway;
          this.pickingData = res.data.picking;
          this.returnsData = res.data.returns;
          this.transfersData = res.data.transfers;
        } else {
          this.error = res.data.message || 'Details not found';
        }
      } catch (err) {
        this.error = 'Failed to load details: ' + (err.response?.data?.message || err.message);
      } finally {
        this.loading = false;
      }
    },
    async handleAction(action) {
      if (!this.employee?.userId) return;
      const confirmMsg = `Kya aap sure hain '${action}' perform karne ke liye?`;
      if (!confirm(confirmMsg)) return;

      try {
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/admin/duty-action', {
          action,
          userId: this.employee.userId,
          dutyId: this.duty?.DutyID
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (res.data.success) {
          alert(`✅ ${res.data.message}`);
          this.fetchDetails();
        } else {
          alert('Action failed: ' + res.data.message);
        }
      } catch (err) {
        alert('Action error: ' + (err.response?.data?.message || err.message));
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
    formatTime(d) {
      if (!d) return '—';
      return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminDutyRecordDetails;
}
