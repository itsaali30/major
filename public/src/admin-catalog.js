const AdminCatalog = {
  template: `
    <div class="container-fluid my-4 pb-5">
      <!-- Notification Alerts -->
      <div v-if="successMessage" class="alert alert-success alert-dismissible fade show shadow-sm d-flex align-items-center" role="alert">
         <i class="bi bi-check-circle-fill fs-5 me-2"></i>
         <div class="flex-grow-1 fw-bold">{{ successMessage }}</div>
         <button type="button" class="btn-close" @click="successMessage = ''"></button>
      </div>
      <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show shadow-sm d-flex align-items-center" role="alert">
         <i class="bi bi-exclamation-triangle-fill fs-5 me-2"></i>
         <div class="flex-grow-1 fw-bold">{{ errorMessage }}</div>
         <button type="button" class="btn-close" @click="errorMessage = ''"></button>
      </div>

      <!-- Page Header & Quick Creation Actions -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
           <h4 class="mb-0 fw-bold"><i class="bi bi-box-seam me-2"></i> Catalog & Inventory Manager</h4>
           <p class="text-muted small mb-0">Organize categories, brands, products, and sellable variants</p>
        </div>
        <div class="btn-group shadow-sm">
           <button class="btn btn-dark btn-sm" @click="openModal('category', null)"><i class="bi bi-plus-lg me-1"></i> Category</button>
           <button class="btn btn-dark btn-sm" @click="openModal('subcategory', null)"><i class="bi bi-plus-lg me-1"></i> Sub-Cat</button>
           <button class="btn btn-dark btn-sm" @click="openModal('brand', null)"><i class="bi bi-plus-lg me-1"></i> Brand</button>
           <button class="btn btn-primary btn-sm fw-bold border-start border-light" @click="openModal('product', null)"><i class="bi bi-box me-1"></i> Product</button>
           <button class="btn btn-success btn-sm fw-bold" @click="openModal('variant', null)"><i class="bi bi-tag me-1"></i> New Variant</button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <ul class="nav nav-pills mb-4 bg-white p-2 rounded-3 shadow-sm border">
        <li class="nav-item">
          <button class="nav-link fw-bold px-4 py-2" :class="{'active bg-dark': activeTab === 'products'}" @click="activeTab = 'products'">
             <i class="bi bi-boxes me-2"></i> Products & Variants
             <span class="badge bg-secondary ms-2">{{ allProductsFlattened.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link fw-bold px-4 py-2" :class="{'active bg-dark': activeTab === 'categories'}" @click="activeTab = 'categories'">
             <i class="bi bi-folder2-open me-2"></i> Categories & Subcategories
             <span class="badge bg-secondary ms-2">{{ categories.length }}</span>
          </button>
        </li>
        <li class="nav-item">
          <button class="nav-link fw-bold px-4 py-2" :class="{'active bg-dark': activeTab === 'brands'}" @click="activeTab = 'brands'">
             <i class="bi bi-award me-2"></i> Brands
             <span class="badge bg-secondary ms-2">{{ brands.length }}</span>
          </button>
        </li>
      </ul>

      <!-- ================= TAB 1: PRODUCTS & VARIANTS ================= -->
      <div v-show="activeTab === 'products'">
        <!-- Advanced Filter Bar -->
        <div class="card border-0 shadow-sm mb-4 sticky-top bg-white" style="top: 0; z-index: 1020;">
          <div class="card-body p-3">
            <div class="row g-2">
              <div class="col-md-4">
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                  <input type="text" class="form-control border-start-0" placeholder="Search Product, SKU, Color or Size..." v-model="filters.search" @input="debouncedFetch">
                </div>
              </div>
              <div class="col-md-2">
                <select class="form-select border-0 bg-light" v-model="filters.categoryID" @change="onCategoryChange">
                  <option :value="null">All Categories</option>
                  <option v-for="c in categories" :key="c.CategoryID" :value="c.CategoryID">{{ c.CategoryName }}</option>
                </select>
              </div>
              <div class="col-md-2">
                <select class="form-select border-0 bg-light" v-model="filters.subCategoryID" @change="onSubCategoryChange" :disabled="!filters.categoryID">
                  <option :value="null">All Sub-Cats</option>
                  <option v-for="sc in subCategories" :key="sc.SubCategoryID" :value="sc.SubCategoryID">{{ sc.CategorySubName }}</option>
                </select>
              </div>
              <div class="col-md-2">
                <select class="form-select border-0 bg-light" v-model="filters.brandID" @change="debouncedFetch">
                  <option :value="null">All Brands</option>
                  <option v-for="b in brands" :key="b.BrandID" :value="b.BrandID">{{ b.BrandName }}</option>
                </select>
              </div>
              <div class="col-md-2">
                 <button class="btn btn-outline-secondary w-100" @click="resetFilters" title="Reset Filters"><i class="bi bi-arrow-counterclockwise me-1"></i> Reset</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Action Floating Bar -->
        <div v-if="selectedVariants.length > 0" class="card border-0 shadow-lg bg-primary text-white mb-4 floating-bulk-bar">
           <div class="card-body py-2 px-4 d-flex justify-content-between align-items-center">
              <div class="fw-bold fs-5">
                 <input type="checkbox" class="form-check-input me-3" checked @change="selectAll(false)">
                 {{ selectedVariants.length }} Items Selected
              </div>
              <div class="btn-group shadow">
                 <button class="btn btn-primary border-white fw-bold" @click="bulkStatusUpdate(true)"><i class="bi bi-check-circle me-1"></i> Active</button>
                 <button class="btn btn-primary border-white fw-bold" @click="bulkStatusUpdate(false)"><i class="bi bi-slash-circle me-1"></i> OFS</button>
                 <button class="btn btn-white text-danger fw-bold ms-2" @click="bulkDelete"><i class="bi bi-trash"></i> Delete</button>
              </div>
           </div>
        </div>

        <!-- Main Grouped Catalog Table -->
        <div class="card border-0 shadow-sm overflow-hidden mb-5">
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead class="bg-dark text-white small text-uppercase fw-bold">
                <tr>
                  <th style="width: 50px;" class="ps-3"><input type="checkbox" class="form-check-input" @change="toggleFullCatalogSelection($event.target.checked)"></th>
                  <th style="min-width: 250px;">Product & Branding</th>
                  <th style="min-width: 150px;">SKU / Specs</th>
                  <th style="min-width: 120px;">Pricing</th>
                  <th style="min-width: 130px;">Status</th>
                  <th class="text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Product Groups (Shows products with or without variants) -->
                <template v-for="group in groupedVariants" :key="group.product.ProductID">
                  <!-- Product Header Row -->
                  <tr class="product-header-row bg-light border-bottom">
                    <td class="ps-3 border-start border-4 border-primary">
                       <input v-if="group.variants.length > 0" type="checkbox" class="form-check-input" :checked="isProductSelected(group.product.ProductID)" @change="toggleProductSelection(group.product.ProductID, $event.target.checked)">
                       <i v-else class="bi bi-dot text-muted fs-4"></i>
                    </td>
                    <td colspan="5">
                       <div class="d-flex flex-wrap align-items-center gap-3 py-1">
                          <img :src="group.product.ImageURL || 'https://placehold.co/40x40?text=P'" class="rounded border shadow-sm" style="width: 44px; height: 44px; object-fit: cover;">
                          <div>
                             <div class="fw-bold text-dark fs-6">
                                {{ group.product.ProductName }}
                                <span class="badge bg-secondary-subtle text-secondary small ms-2">ID: #{{ group.product.ProductID }}</span>
                             </div>
                             <div class="small">
                                <span class="text-muted"><i class="bi bi-tag-fill me-1"></i>{{ getCategoryNameFromIds(group.product.SubCategoryID) }}</span>
                                <span class="mx-2 text-muted">|</span>
                                <span class="text-primary fw-bold">{{ getBrandNameFromId(group.product.BrandID) }}</span>
                                <span v-if="group.product.TaxRate" class="badge bg-light text-dark border ms-2">Tax: {{ group.product.TaxRate }}%</span>
                             </div>
                          </div>
                          <div class="ms-auto d-flex align-items-center gap-2 pe-3">
                             <span class="badge rounded-pill px-3 py-2" :class="group.variants.length > 0 ? 'bg-info-subtle text-info-emphasis' : 'bg-warning-subtle text-warning-emphasis'">
                                {{ group.variants.length }} Variant{{ group.variants.length === 1 ? '' : 's' }}
                             </span>
                             <button class="btn btn-sm btn-outline-success fw-bold py-1 px-2" @click="openModal('variant', { ProductID: group.product.ProductID, ShelfID: 1, IsActive: true, Status: 'Active' })" title="Add Variant to this product">
                                <i class="bi bi-plus-lg me-1"></i> Add Variant
                             </button>
                             <button class="btn btn-sm btn-outline-secondary py-1 px-2" @click="openModal('product', group.product)" title="Edit Product details">
                                <i class="bi bi-pencil"></i>
                             </button>
                             <button class="btn btn-sm btn-outline-danger py-1 px-2" @click="deleteItem('product', group.product.ProductID)" title="Delete Product and its variants">
                                <i class="bi bi-trash"></i>
                             </button>
                          </div>
                       </div>
                    </td>
                  </tr>

                  <!-- Zero Variants Notice for empty product -->
                  <tr v-if="group.variants.length === 0" class="variant-row">
                    <td class="ps-4 text-muted small text-center">-</td>
                    <td colspan="5" class="py-3 ps-3 bg-white">
                       <div class="d-flex align-items-center gap-3">
                          <span class="badge bg-warning-subtle text-warning-emphasis p-2"><i class="bi bi-exclamation-circle me-1"></i> No variants created yet</span>
                          <span class="text-muted small">This product is created, but it requires at least one variant (size/color/price) to appear on the storefront.</span>
                          <button class="btn btn-sm btn-success fw-bold py-1 px-3 shadow-sm ms-auto me-3" @click="openModal('variant', { ProductID: group.product.ProductID, ShelfID: 1, IsActive: true, Status: 'Active' })">
                             <i class="bi bi-plus-circle me-1"></i> Create First Variant
                          </button>
                       </div>
                    </td>
                  </tr>

                  <!-- Variant Rows for populated product -->
                  <tr v-for="v in group.variants" :key="v.VariantID" class="variant-row" :class="{'table-active': isSelected(v.VariantID)}">
                    <td class="ps-4">
                       <input type="checkbox" class="form-check-input" :value="v.VariantID" v-model="selectedVariants">
                    </td>
                    <td>
                       <div class="d-flex align-items-center ps-3">
                          <img :src="v.ImageURL || group.product.ImageURL || 'https://placehold.co/40x40?text=V'" class="rounded-circle border me-3" style="width: 32px; height: 32px; object-fit: cover;" onerror="this.src='https://placehold.co/40x40?text=V'">
                          <div>
                             <div class="small fw-bold">{{ group.product.ProductName }} - {{ v.Size || v.Color || 'Default' }}</div>
                             <div class="x-small text-muted" v-if="v.Unit">Unit: {{ v.Unit }}</div>
                          </div>
                       </div>
                    </td>
                    <td>
                       <div class="small fw-bold text-primary">{{ v.SKU }}</div>
                       <div class="small text-muted" v-if="v.Size || v.Color">{{ v.Size || '-' }} / {{ v.Color || '-' }} / {{ v.Weight ? v.Weight+'kg' : '-' }}</div>
                       <div class="x-small text-muted">Shelf: #{{ v.ShelfID }}</div>
                    </td>
                    <td>
                       <div class="text-decoration-line-through text-muted small" style="font-size: 0.75rem;">₹{{ v.MRP }}</div>
                       <div class="fw-bold text-success">₹{{ v.SalePrice }}</div>
                    </td>
                    <td>
                       <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" :checked="v.IsActive" @change="toggleInstant(v)">
                          <label class="small fw-bold ms-1" :class="v.IsActive ? 'text-success' : 'text-danger'">{{ v.IsActive ? 'Active' : 'OFS' }}</label>
                       </div>
                    </td>
                    <td class="text-end pe-3">
                       <div class="btn-group btn-group-sm rounded shadow-sm bg-white">
                          <button class="btn btn-outline-light border text-primary" @click="openModal('variant', v)" title="Edit Variant"><i class="bi bi-pencil"></i></button>
                          <button class="btn btn-outline-light border text-danger" @click="deleteItem('variant', v.VariantID)" title="Delete Variant"><i class="bi bi-trash"></i></button>
                       </div>
                    </td>
                  </tr>
                </template>

                <!-- Loading / Empty states -->
                <tr v-if="groupedVariants.length === 0 && !loading">
                   <td colspan="6" class="text-center py-5 text-muted">
                      <i class="bi bi-search display-3 opacity-25"></i>
                      <p class="mt-3 fw-bold fs-5">No products or variants found</p>
                      <p class="small">Click "+ Product" above to create your first catalog item or adjust filters.</p>
                      <button class="btn btn-primary fw-bold mt-2" @click="openModal('product', null)"><i class="bi bi-plus-lg me-1"></i> Create Product</button>
                   </td>
                </tr>
                <tr v-if="loading">
                   <td colspan="6" class="text-center py-5">
                      <div class="spinner-grow text-primary" role="status"></div>
                      <p class="mt-3 text-muted fw-bold">Syncing catalog with central repository...</p>
                   </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= TAB 2: CATEGORIES & SUBCATEGORIES ================= -->
      <div v-show="activeTab === 'categories'">
        <div class="d-flex justify-content-between align-items-center mb-3">
           <h5 class="fw-bold mb-0"><i class="bi bi-folder2-open me-2"></i> Categories Hierarchy</h5>
           <div class="btn-group">
              <button class="btn btn-dark btn-sm fw-bold" @click="openModal('category', null)"><i class="bi bi-plus-lg me-1"></i> New Category</button>
              <button class="btn btn-outline-dark btn-sm fw-bold" @click="openModal('subcategory', null)"><i class="bi bi-plus-lg me-1"></i> New Sub-Category</button>
           </div>
        </div>

        <div class="row g-4">
           <div class="col-md-6 col-lg-4" v-for="c in categoriesWithSubCats" :key="c.CategoryID">
              <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                 <div class="card-header bg-light d-flex align-items-center justify-content-between py-3">
                    <div class="d-flex align-items-center gap-2">
                       <img :src="c.CategoryImageURL || 'https://placehold.co/40x40?text=C'" class="rounded border" style="width: 36px; height: 36px; object-fit: cover;">
                       <div>
                          <div class="fw-bold text-dark">{{ c.CategoryName }}</div>
                          <div class="x-small text-muted">ID: #{{ c.CategoryID }} • {{ (c.subCategories || []).length }} Subcategories</div>
                       </div>
                    </div>
                    <div class="btn-group btn-group-sm">
                       <button class="btn btn-outline-secondary btn-sm" @click="openModal('category', c)" title="Edit Category"><i class="bi bi-pencil"></i></button>
                       <button class="btn btn-outline-danger btn-sm" @click="deleteItem('category', c.CategoryID)" title="Delete Category"><i class="bi bi-trash"></i></button>
                    </div>
                 </div>
                 <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                       <span class="x-small fw-bold text-muted text-uppercase">Subcategories</span>
                       <button class="btn btn-xs btn-outline-primary" @click="openModal('subcategory', { CategoryID: c.CategoryID })">
                          <i class="bi bi-plus"></i> Add
                       </button>
                    </div>
                    <ul class="list-group list-group-flush small" v-if="(c.subCategories || []).length > 0">
                       <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-2" v-for="sc in c.subCategories" :key="sc.SubCategoryID">
                          <div class="d-flex align-items-center gap-2">
                             <img :src="sc.SubCategoryImageURL || 'https://placehold.co/24x24?text=S'" class="rounded" style="width: 24px; height: 24px; object-fit: cover;">
                             <span>{{ sc.CategorySubName }}</span>
                          </div>
                          <div class="btn-group btn-group-sm">
                             <button class="btn btn-link text-primary p-0 me-2" @click="openModal('subcategory', sc)"><i class="bi bi-pencil"></i></button>
                             <button class="btn btn-link text-danger p-0" @click="deleteItem('subcategory', sc.SubCategoryID)"><i class="bi bi-trash"></i></button>
                          </div>
                       </li>
                    </ul>
                    <div v-else class="text-center py-3 text-muted small">
                       <em>No subcategories yet</em>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- ================= TAB 3: BRANDS ================= -->
      <div v-show="activeTab === 'brands'">
        <div class="d-flex justify-content-between align-items-center mb-3">
           <h5 class="fw-bold mb-0"><i class="bi bi-award me-2"></i> Brands Directory</h5>
           <button class="btn btn-dark btn-sm fw-bold" @click="openModal('brand', null)"><i class="bi bi-plus-lg me-1"></i> New Brand</button>
        </div>

        <div class="row g-4">
           <div class="col-md-4 col-lg-3" v-for="b in brands" :key="b.BrandID">
              <div class="card h-100 border-0 shadow-sm rounded-3 p-3 text-center">
                 <div class="d-flex justify-content-center mb-3">
                    <img :src="b.LogoURL || 'https://placehold.co/70x70?text=BRAND'" class="rounded-circle border shadow-sm" style="width: 70px; height: 70px; object-fit: cover;">
                 </div>
                 <h6 class="fw-bold text-dark mb-1">{{ b.BrandName }}</h6>
                 <div class="x-small text-muted mb-2">ID: #{{ b.BrandID }} • {{ getProductsCountForBrand(b.BrandID) }} Products</div>
                 <p class="small text-muted flex-grow-1 text-truncate" :title="b.Description">{{ b.Description || 'No description provided' }}</p>
                 <div class="btn-group btn-group-sm w-100 mt-2">
                    <button class="btn btn-outline-secondary" @click="openModal('brand', b)"><i class="bi bi-pencil me-1"></i> Edit</button>
                    <button class="btn btn-outline-danger" @click="deleteItem('brand', b.BrandID)"><i class="bi bi-trash me-1"></i> Delete</button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- ================= UNIFIED MODAL FOR CATALOG ENTITIES ================= -->
      <div class="modal fade" id="catalogModal" tabindex="-1" ref="catalogModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg overflow-hidden">
            <div class="modal-header bg-dark text-white border-0 py-3">
              <h5 class="modal-title fw-bold">
                 <i class="bi bi-pencil-square me-2"></i> {{ isEditing ? 'Edit' : 'New' }} {{ modalTypeTitle }}
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body p-4 bg-white">
              <form @submit.prevent="saveItem">
                <div class="row g-3">
                  <!-- Category Form -->
                  <template v-if="modalType === 'category'">
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Category Name *</label>
                        <input type="text" class="form-control" v-model="formData.CategoryName" required placeholder="e.g. Dairy, Bread & Eggs">
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Category Image</label>
                        <div class="input-group">
                           <input type="file" class="form-control" @change="handleImageUpload($event, 'CategoryImageURL')" accept="image/*">
                           <input type="text" class="form-control" v-model="formData.CategoryImageURL" placeholder="or paste image URL">
                        </div>
                     </div>
                  </template>

                  <!-- SubCategory Form -->
                  <template v-if="modalType === 'subcategory'">
                     <div class="col-12" v-if="!isEditing">
                        <label class="form-label fw-bold text-muted small">Parent Category *</label>
                        <div class="input-group input-group-sm mb-2">
                           <span class="input-group-text border-end-0 bg-transparent"><i class="bi bi-search"></i></span>
                           <input type="text" class="form-control border-start-0" placeholder="Filter category..." v-model="modalCategorySearch">
                        </div>
                        <select class="form-select" v-model="formData.CategoryID" required>
                           <option :value="undefined" disabled>-- Select Category --</option>
                           <option v-for="c in filteredCategoriesForModal" :key="c.CategoryID" :value="c.CategoryID">{{ c.CategoryName }}</option>
                        </select>
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Sub-Category Name *</label>
                        <input type="text" class="form-control" v-model="formData.CategorySubName" required placeholder="e.g. Fresh Milk">
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Sub-Category Image</label>
                        <div class="input-group">
                           <input type="file" class="form-control" @change="handleImageUpload($event, 'SubCategoryImageURL')" accept="image/*">
                           <input type="text" class="form-control" v-model="formData.SubCategoryImageURL" placeholder="or paste image URL">
                        </div>
                     </div>
                  </template>

                  <!-- Brand Form -->
                  <template v-if="modalType === 'brand'">
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Brand Name *</label>
                        <input type="text" class="form-control" v-model="formData.BrandName" required placeholder="e.g. Nestlé">
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">Brand Logo</label>
                        <div class="input-group">
                           <input type="file" class="form-control" @change="handleImageUpload($event, 'LogoURL')" accept="image/*">
                           <input type="text" class="form-control" v-model="formData.LogoURL" placeholder="or paste logo URL">
                        </div>
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold text-muted small">About Brand / Description</label>
                        <textarea class="form-control" rows="2" v-model="formData.Description" placeholder="Short description of this brand"></textarea>
                     </div>
                  </template>

                  <!-- Product Form -->
                  <template v-if="modalType === 'product'">
                     <div class="col-md-6" v-if="!isEditing">
                        <label class="form-label fw-bold small text-muted">Sub-Category *</label>
                        <select class="form-select" v-model="formData.SubCategoryID" required>
                           <option :value="undefined" disabled>-- Select Sub-Category --</option>
                           <option v-for="sc in allSubCatsFlattened" :key="sc.SubCategoryID" :value="sc.SubCategoryID">{{ sc.CategorySubName }}</option>
                        </select>
                     </div>
                     <div class="col-md-6" v-if="!isEditing">
                        <label class="form-label fw-bold small text-muted">Brand *</label>
                        <div class="input-group input-group-sm mb-1">
                           <span class="input-group-text border-end-0 bg-transparent py-0"><i class="bi bi-search" style="font-size: 0.7rem;"></i></span>
                           <input type="text" class="form-control border-start-0 py-0" style="font-size: 0.75rem;" placeholder="Filter brand..." v-model="modalBrandSearch">
                        </div>
                        <select class="form-select" v-model="formData.BrandID" required>
                           <option :value="undefined" disabled>-- Select Brand --</option>
                           <option v-for="b in filteredBrandsForModal" :key="b.BrandID" :value="b.BrandID">{{ b.BrandName }}</option>
                        </select>
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold small text-muted">Product Name *</label>
                        <input type="text" class="form-control" v-model="formData.ProductName" required placeholder="e.g. Amul Taaza Toned Milk">
                     </div>
                     <div class="col-12">
                        <label class="form-label fw-bold small text-muted">Description</label>
                        <textarea class="form-control" v-model="formData.ProductDescription" rows="2" placeholder="Key highlights, product details"></textarea>
                     </div>
                     <div class="col-md-8">
                        <label class="form-label fw-bold small text-muted">Default Product Image</label>
                        <div class="card p-2 bg-light border-0 shadow-sm d-flex flex-row align-items-center gap-3">
                           <div class="flex-shrink-0" v-if="formData.ImageURL">
                              <img :src="formData.ImageURL" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                           </div>
                           <div class="flex-grow-1">
                              <input type="file" class="form-control form-control-sm mb-1" @change="handleImageUpload($event, 'ImageURL')" accept="image/*">
                              <input type="text" class="form-control form-control-sm" v-model="formData.ImageURL" placeholder="or paste URL">
                           </div>
                        </div>
                     </div>
                     <div class="col-md-4">
                        <label class="form-label fw-bold small text-muted">Tax Rate %</label>
                        <input type="number" step="0.1" class="form-control" v-model="formData.TaxRate" placeholder="e.g. 5 or 18">
                     </div>
                  </template>

                  <!-- Variant Form -->
                  <template v-if="modalType === 'variant'">
                     <div class="col-12" v-if="!isEditing">
                        <label class="form-label fw-bold small text-muted">Select Parent Product *</label>
                        <div class="input-group input-group-sm mb-2 shadow-sm">
                           <span class="input-group-text bg-light border-end-0"><i class="bi bi-search"></i></span>
                           <input type="text" class="form-control border-start-0" placeholder="Filter product by Name or ID..." v-model="modalProductSearch">
                        </div>
                        <select class="form-select border-primary-subtle" v-model="formData.ProductID" required>
                           <option :value="undefined" disabled>-- Select Product ({{ filteredProductsForVariant.length }} found) --</option>
                           <option v-for="p in filteredProductsForVariant" :key="p.ProductID" :value="p.ProductID">
                              [ID: #{{ p.ProductID }}] {{ p.ProductName }}
                           </option>
                        </select>
                     </div>
                     <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted">Stock ID (SKU) *</label>
                        <input type="text" class="form-control shadow-none" v-model="formData.SKU" required placeholder="e.g. AML-TZ-500ML">
                     </div>
                     <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted">Unit</label>
                        <input type="text" class="form-control shadow-none" v-model="formData.Unit" placeholder="e.g. PACK, PCS, BOX, BOTTLE">
                     </div>
                     <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted">Label Price (MRP) *</label>
                        <div class="input-group">
                           <span class="input-group-text">₹</span>
                           <input type="text" class="form-control fw-bold" v-model="formData.MRP" required placeholder="e.g. 30">
                        </div>
                     </div>
                     <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted">Deal / Sale Price *</label>
                        <div class="input-group border border-success rounded">
                           <span class="input-group-text border-0 bg-transparent text-success">₹</span>
                           <input type="number" step="0.01" class="form-control border-0 fw-bold text-success shadow-none" v-model="formData.SalePrice" required placeholder="e.g. 28">
                        </div>
                     </div>
                     <div class="col-md-4">
                        <label class="form-label fw-bold small text-muted">Size Specs</label>
                        <input type="text" class="form-control" v-model="formData.Size" placeholder="e.g. 500ml, 1kg, XL">
                     </div>
                     <div class="col-md-4">
                        <label class="form-label fw-bold small text-muted">Color</label>
                        <input type="text" class="form-control" v-model="formData.Color" placeholder="e.g. Blue, Red">
                     </div>
                     <div class="col-md-4">
                        <label class="form-label fw-bold small text-muted">Gross Wt (KG)</label>
                        <input type="number" step="0.01" class="form-control" v-model="formData.Weight" placeholder="e.g. 0.5">
                     </div>
                     <div class="col-md-6">
                        <label class="form-label fw-bold small text-muted">Shelf / Rack ID *</label>
                        <input type="number" class="form-control border-warning-subtle shadow-none" v-model="formData.ShelfID" required placeholder="1">
                     </div>
                     <div class="col-12 p-3 bg-light rounded-3 d-flex align-items-center gap-4">
                        <div class="border shadow-sm rounded-3 overflow-hidden bg-white" style="width: 70px; height: 70px;">
                           <img :src="formData.ImageURL || 'https://placehold.co/70x70?text=IMG'" class="w-100 h-100 object-fit-cover">
                        </div>
                        <div class="flex-grow-1">
                           <label class="form-label fw-bold small mb-1">Variant Specific Photo</label>
                           <input type="file" class="form-control form-control-sm mb-1" @change="handleImageUpload($event, 'ImageURL')" accept="image/*">
                           <input type="text" class="form-control form-control-sm" v-model="formData.ImageURL" placeholder="or paste image URL">
                        </div>
                     </div>
                  </template>

                  <!-- Active Switch -->
                  <div class="col-12 py-2 border-top mt-3">
                     <div class="form-check form-switch d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-3">
                        <label class="form-check-label fw-bold text-dark" for="modalActive">Show in Sales Catalog / Active Status</label>
                        <input class="form-check-input" type="checkbox" id="modalActive" v-model="formData.IsActive" style="transform: scale(1.3);">
                     </div>
                  </div>
                </div>

                <div class="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" class="btn btn-light px-4 fw-bold" @click="closeModal">Cancel</button>
                  <button type="submit" class="btn btn-dark px-5 fw-bold shadow" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                    {{ isEditing ? 'Update Entry' : 'Create Entry' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      activeTab: 'products',
      variants: [],
      categories: [],
      subCategories: [],
      brands: [],
      products: [],
      
      allSubCatsFlattened: [],
      allProductsFlattened: [],
      
      filters: { search: '', categoryID: null, subCategoryID: null, brandID: null, productID: null },
      modalProductSearch: '',
      modalBrandSearch: '',
      modalCategorySearch: '',
      selectedVariants: [],
      
      loading: false, 
      saving: false, 
      debounceTimer: null,
      modalInstance: null, 
      modalType: 'product', 
      isEditing: false, 
      formData: {},
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    modalTypeTitle() {
       const map = { category: 'Category', subcategory: 'Sub-Category', product: 'Product', variant: 'Variant', brand: 'Brand' };
       return map[this.modalType] || 'Item';
    },
    categoriesWithSubCats() {
       return this.categories.map(c => ({
          ...c,
          subCategories: this.allSubCatsFlattened.filter(sc => sc.CategoryID === c.CategoryID)
       }));
    },
    filteredProductsForVariant() {
       if (!this.modalProductSearch) return this.allProductsFlattened;
       const s = this.modalProductSearch.toLowerCase().trim();
       return this.allProductsFlattened.filter(p => 
          (p.ProductName && p.ProductName.toLowerCase().includes(s)) || 
          p.ProductID.toString().includes(s)
       );
    },
    filteredBrandsForModal() {
       if (!this.modalBrandSearch) return this.brands;
       const s = this.modalBrandSearch.toLowerCase().trim();
       return this.brands.filter(b => b.BrandName && b.BrandName.toLowerCase().includes(s));
    },
    filteredCategoriesForModal() {
       if (!this.modalCategorySearch) return this.categories;
       const s = this.modalCategorySearch.toLowerCase().trim();
       return this.categories.filter(c => c.CategoryName && c.CategoryName.toLowerCase().includes(s));
    },
    groupedVariants() {
       const groups = {};
       
       // Filter products according to active filters
       let filteredProducts = [...this.allProductsFlattened];
       if (this.filters.categoryID) {
          const scIds = this.allSubCatsFlattened
             .filter(sc => sc.CategoryID === parseInt(this.filters.categoryID))
             .map(sc => sc.SubCategoryID);
          filteredProducts = filteredProducts.filter(p => scIds.includes(p.SubCategoryID));
       }
       if (this.filters.subCategoryID) {
          filteredProducts = filteredProducts.filter(p => p.SubCategoryID === parseInt(this.filters.subCategoryID));
       }
       if (this.filters.brandID) {
          filteredProducts = filteredProducts.filter(p => p.BrandID === parseInt(this.filters.brandID));
       }
       if (this.filters.search) {
          const s = this.filters.search.toLowerCase().trim();
          const matchingVariantPids = this.variants
             .filter(v => (v.SKU && v.SKU.toLowerCase().includes(s)) || (v.Color && v.Color.toLowerCase().includes(s)) || (v.Size && v.Size.toLowerCase().includes(s)))
             .map(v => v.ProductID);
          filteredProducts = filteredProducts.filter(p => 
             (p.ProductName && p.ProductName.toLowerCase().includes(s)) ||
             matchingVariantPids.includes(p.ProductID)
          );
       }

       // Initialize groups for all matching products so products with 0 variants are visible!
       filteredProducts.forEach(p => {
          groups[p.ProductID] = {
             product: p,
             variants: []
          };
       });

       // Assign variants to product groups
       this.variants.forEach(v => {
          if (groups[v.ProductID]) {
             groups[v.ProductID].variants.push(v);
          } else if (!this.filters.categoryID && !this.filters.subCategoryID && !this.filters.brandID && !this.filters.search) {
             const prod = this.allProductsFlattened.find(p => p.ProductID === v.ProductID) || { ProductName: 'Product #' + v.ProductID, ProductID: v.ProductID };
             groups[v.ProductID] = { product: prod, variants: [v] };
          }
       });

       return Object.values(groups).sort((a, b) => (a.product.ProductName || '').localeCompare(b.product.ProductName || ''));
    }
  },
  mounted() {
    this.initData();
    if (this.$refs.catalogModal) {
      this.modalInstance = new bootstrap.Modal(this.$refs.catalogModal);
    }
  },
  methods: {
    async initData() { 
       await this.refreshStaticData(); 
       await this.fetchVariants(); 
    },
    async refreshStaticData() {
       const query = `{
          allCategories { CategoryID CategoryName CategoryImageURL Status }
          allBrands { BrandID BrandName LogoURL Description Status }
          allSubCategories { SubCategoryID CategoryID CategorySubName SubCategoryImageURL Status }
          allProducts { ProductID SubCategoryID BrandID ProductName ProductDescription ImageURL TaxRate IsActive }
       }`;
       try {
          const data = await graphqlRequest(query, {}, localStorage.getItem('token'));
          this.categories = data.allCategories || [];
          this.brands = data.allBrands || [];
          this.allSubCatsFlattened = data.allSubCategories || [];
          this.allProductsFlattened = data.allProducts || [];
          this.onCategoryChange();
       } catch (e) { 
          console.error('Error refreshing static catalog data:', e); 
       }
    },
    async fetchVariants() {
       this.loading = true;
       const query = `query($cid: Int, $scid: Int, $bid: Int, $pid: Int, $s: String) { 
          allVariants(CategoryID: $cid, SubCategoryID: $scid, BrandID: $bid, ProductID: $pid, Search: $s) { 
             VariantID ProductID SKU Weight Size Color MRP SalePrice Status IsActive ImageURL Unit ShelfID
          } 
       }`;
       const vars = { 
          cid: this.filters.categoryID ? parseInt(this.filters.categoryID) : null, 
          scid: this.filters.subCategoryID ? parseInt(this.filters.subCategoryID) : null, 
          bid: this.filters.brandID ? parseInt(this.filters.brandID) : null, 
          pid: this.filters.productID ? parseInt(this.filters.productID) : null, 
          s: this.filters.search ? this.filters.search.trim() : null 
       };
       try {
          const data = await graphqlRequest(query, vars, localStorage.getItem('token'));
          this.variants = data.allVariants || [];
          this.selectedVariants = [];
       } catch (e) { 
          console.error('Error fetching variants:', e); 
       } finally { 
          this.loading = false; 
       }
    },
    debouncedFetch() { 
       clearTimeout(this.debounceTimer); 
       this.debounceTimer = setTimeout(() => this.fetchVariants(), 350); 
    },
    onCategoryChange() {
       this.subCategories = this.allSubCatsFlattened.filter(sc => !this.filters.categoryID || sc.CategoryID === parseInt(this.filters.categoryID));
       this.filters.subCategoryID = null;
       this.onSubCategoryChange();
    },
    onSubCategoryChange() {
       this.products = this.allProductsFlattened.filter(p => !this.filters.subCategoryID || p.SubCategoryID === parseInt(this.filters.subCategoryID));
       this.filters.productID = null;
       this.debouncedFetch();
    },
    resetFilters() {
       this.filters = { search: '', categoryID: null, subCategoryID: null, brandID: null, productID: null };
       this.onCategoryChange();
    },

    // Helpers
    getCategoryNameFromIds(scid) {
       const sc = this.allSubCatsFlattened.find(x => x.SubCategoryID === scid); 
       if (!sc) return 'N/A';
       const c = this.categories.find(x => x.CategoryID === sc.CategoryID); 
       return c ? c.CategoryName : sc.CategorySubName || 'N/A';
    },
    getBrandNameFromId(bid) { 
       const b = this.brands.find(x => x.BrandID === bid); 
       return b ? b.BrandName : 'No Brand'; 
    },
    getProductsCountForBrand(bid) {
       return this.allProductsFlattened.filter(p => p.BrandID === bid).length;
    },

    // Selection
    isSelected(id) { return this.selectedVariants.includes(id); },
    isProductSelected(pid) {
       const productVariants = this.variants.filter(v => v.ProductID === pid);
       return productVariants.length > 0 && productVariants.every(v => this.selectedVariants.includes(v.VariantID));
    },
    toggleProductSelection(pid, checked) {
       const productVariants = this.variants.filter(v => v.ProductID === pid).map(v => v.VariantID);
       if (checked) {
          this.selectedVariants = [...new Set([...this.selectedVariants, ...productVariants])];
       } else {
          this.selectedVariants = this.selectedVariants.filter(id => !productVariants.includes(id));
       }
    },
    toggleFullCatalogSelection(checked) {
       if (checked) this.selectedVariants = this.variants.map(v => v.VariantID);
       else this.selectedVariants = [];
    },
    selectAll(checked) { this.toggleFullCatalogSelection(checked); },

    // Instant status toggle
    async toggleInstant(v) {
       const newActive = !v.IsActive; 
       const token = localStorage.getItem('token');
       const mutation = `mutation($id: Int!, $active: Boolean, $st: String) { updateVariant(VariantID: $id, IsActive: $active, Status: $st) { VariantID } }`;
       try { 
          await graphqlRequest(mutation, { id: v.VariantID, active: newActive, st: newActive ? 'Active' : 'OFS' }, token); 
          v.IsActive = newActive; 
          this.successMessage = `Variant status updated to ${newActive ? 'Active' : 'OFS'}`;
          setTimeout(() => { this.successMessage = ''; }, 3000);
       } catch (e) { 
          this.errorMessage = e.message; 
       }
    },

    // Bulk actions
    async bulkStatusUpdate(active) {
       if (!confirm(`Update ${this.selectedVariants.length} items to ${active ? 'Active' : 'OFS'}?`)) return;
       const token = localStorage.getItem('token'); 
       const status = active ? 'Active' : 'OFS';
       try {
          for (const id of this.selectedVariants) {
             const mutation = `mutation($id: Int!, $active: Boolean, $st: String) { updateVariant(VariantID: $id, IsActive: $active, Status: $st) { VariantID } }`;
             await graphqlRequest(mutation, { id, active, st: status }, token);
          }
          this.successMessage = `Updated ${this.selectedVariants.length} variants successfully.`;
          setTimeout(() => { this.successMessage = ''; }, 4000);
          await this.fetchVariants();
       } catch (e) { 
          this.errorMessage = e.message; 
       }
    },
    async bulkDelete() {
       if (!confirm(`Permanently delete ${this.selectedVariants.length} selected variants?`)) return;
       const token = localStorage.getItem('token');
       try {
          for (const id of this.selectedVariants) { 
             await graphqlRequest(`mutation($id: Int!) { deleteVariant(VariantID: $id) }`, { id }, token); 
          }
          this.successMessage = `Deleted ${this.selectedVariants.length} variants.`;
          setTimeout(() => { this.successMessage = ''; }, 4000);
          await this.fetchVariants();
       } catch (e) { 
          this.errorMessage = e.message; 
       }
    },

    // Modal & CRUD Operations
    openModal(type, item) {
       this.modalType = type; 
       this.isEditing = !!item && (item.ProductID || item.CategoryID || item.SubCategoryID || item.BrandID || item.VariantID);
       this.modalProductSearch = '';
       this.modalBrandSearch = '';
       this.modalCategorySearch = '';

       if (item) {
          this.formData = { ...item };
       } else {
          // Pre-populate sensible defaults so selects are never blank
          this.formData = { 
             IsActive: true, 
             Status: 'Active', 
             CategoryID: this.filters.categoryID || (this.categories[0]?.CategoryID || null), 
             SubCategoryID: this.filters.subCategoryID || (this.allSubCatsFlattened[0]?.SubCategoryID || null), 
             ProductID: this.filters.productID || (this.allProductsFlattened[0]?.ProductID || null), 
             BrandID: this.filters.brandID || (this.brands[0]?.BrandID || null), 
             ShelfID: 1 
          };
       }
       if (this.modalInstance) this.modalInstance.show();
    },
    closeModal() { 
       if (this.modalInstance) this.modalInstance.hide(); 
    },
    async saveItem() {
       this.saving = true; 
       this.errorMessage = '';
       const token = localStorage.getItem('token');
       let entityTitle = this.modalTypeTitle;
       let entityName = '';

       try {
          let mutation = ""; 
          let vars = {};

          if (this.modalType === 'category') {
             entityName = this.formData.CategoryName;
             if (!entityName || !entityName.trim()) throw new Error("Category Name is required");
             if (this.isEditing) {
                mutation = `mutation($id: Int!, $n: String!, $i: String) { updateCategory(CategoryID: $id, CategoryName: $n, CategoryImageURL: $i) { CategoryID CategoryName } }`;
                vars = { id: parseInt(this.formData.CategoryID), n: entityName.trim(), i: this.formData.CategoryImageURL || null };
             } else {
                mutation = `mutation($n: String!, $i: String) { createCategory(CategoryName: $n, CategoryImageURL: $i) { CategoryID CategoryName } }`;
                vars = { n: entityName.trim(), i: this.formData.CategoryImageURL || null };
             }
          }
          else if (this.modalType === 'subcategory') {
             entityName = this.formData.CategorySubName;
             if (!entityName || !entityName.trim()) throw new Error("Sub-Category Name is required");
             const cid = parseInt(this.formData.CategoryID);
             if (!cid) throw new Error("Please select a parent Category");
             if (this.isEditing) {
                mutation = `mutation($id: Int!, $n: String!, $i: String) { updateSubCategory(SubCategoryID: $id, CategorySubName: $n, SubCategoryImageURL: $i) { SubCategoryID CategorySubName } }`;
                vars = { id: parseInt(this.formData.SubCategoryID), n: entityName.trim(), i: this.formData.SubCategoryImageURL || null };
             } else {
                mutation = `mutation($cid: Int!, $n: String!, $i: String) { createSubCategory(CategoryID: $cid, CategorySubName: $n, SubCategoryImageURL: $i) { SubCategoryID CategorySubName } }`;
                vars = { cid, n: entityName.trim(), i: this.formData.SubCategoryImageURL || null };
             }
          }
          else if (this.modalType === 'brand') {
             entityName = this.formData.BrandName;
             if (!entityName || !entityName.trim()) throw new Error("Brand Name is required");
             if (this.isEditing) {
                mutation = `mutation($id: Int!, $n: String, $log: String, $d: String) { updateBrand(BrandID: $id, BrandName: $n, LogoURL: $log, Description: $d) { BrandID BrandName } }`;
                vars = { id: parseInt(this.formData.BrandID), n: entityName.trim(), log: this.formData.LogoURL || null, d: this.formData.Description || null };
             } else {
                mutation = `mutation($n: String!, $log: String, $d: String) { createBrand(BrandName: $n, LogoURL: $log, Description: $d) { BrandID BrandName } }`;
                vars = { n: entityName.trim(), log: this.formData.LogoURL || null, d: this.formData.Description || null };
             }
          }
          else if (this.modalType === 'product') {
             entityName = this.formData.ProductName;
             if (!entityName || !entityName.trim()) throw new Error("Product Name is required");
             const scid = parseInt(this.formData.SubCategoryID);
             const bid = parseInt(this.formData.BrandID);
             if (!scid) throw new Error("Please select a Sub-Category");
             if (!bid) throw new Error("Please select a Brand");

             if (this.isEditing) {
                mutation = `mutation($id: Int!, $n: String, $d: String, $i: String, $t: Float, $a: Boolean) { updateProduct(ProductID: $id, ProductName: $n, ProductDescription: $d, ImageURL: $i, TaxRate: $t, IsActive: $a) { ProductID ProductName } }`;
                vars = { 
                   id: parseInt(this.formData.ProductID), 
                   n: entityName.trim(), 
                   d: this.formData.ProductDescription || null, 
                   i: this.formData.ImageURL || null, 
                   t: this.formData.TaxRate !== undefined && this.formData.TaxRate !== '' && this.formData.TaxRate !== null ? parseFloat(this.formData.TaxRate) : null, 
                   a: !!this.formData.IsActive 
                };
             } else {
                mutation = `mutation($scid: Int!, $bid: Int!, $n: String!, $d: String, $i: String, $t: Float, $a: Boolean) { createProduct(SubCategoryID: $scid, BrandID: $bid, ProductName: $n, ProductDescription: $d, ImageURL: $i, TaxRate: $t, IsActive: $a) { ProductID ProductName } }`;
                vars = { 
                   scid, 
                   bid, 
                   n: entityName.trim(), 
                   d: this.formData.ProductDescription || null, 
                   i: this.formData.ImageURL || null, 
                   t: this.formData.TaxRate !== undefined && this.formData.TaxRate !== '' && this.formData.TaxRate !== null ? parseFloat(this.formData.TaxRate) : null, 
                   a: !!this.formData.IsActive 
                };
             }
          }
          else if (this.modalType === 'variant') {
             entityName = this.formData.SKU;
             if (!entityName || !entityName.trim()) throw new Error("Stock ID (SKU) is required");
             const pid = parseInt(this.formData.ProductID || this.filters.productID);
             if (!pid) throw new Error("Please select a parent Product for this variant");
             if (this.formData.MRP === undefined || this.formData.MRP === '') throw new Error("Label Price (MRP) is required");
             if (this.formData.SalePrice === undefined || this.formData.SalePrice === '') throw new Error("Deal / Sale Price is required");

             if (this.isEditing) {
                mutation = `mutation($id: Int!, $sku: String, $unit: String, $mrp: String, $price: Float, $size: String, $color: String, $weight: Float, $img: String, $active: Boolean, $st: String, $shelf: Int) { updateVariant(VariantID: $id, SKU: $sku, Unit: $unit, MRP: $mrp, SalePrice: $price, Size: $size, Color: $color, Weight: $weight, ImageURL: $img, IsActive: $active, Status: $st, ShelfID: $shelf) { VariantID SKU } }`;
                vars = { 
                   id: parseInt(this.formData.VariantID), 
                   sku: entityName.trim(), 
                   unit: this.formData.Unit || null, 
                   mrp: String(this.formData.MRP), 
                   price: parseFloat(this.formData.SalePrice), 
                   size: this.formData.Size || null, 
                   color: this.formData.Color || null, 
                   weight: this.formData.Weight !== undefined && this.formData.Weight !== '' && this.formData.Weight !== null ? parseFloat(this.formData.Weight) : null, 
                   img: this.formData.ImageURL || null, 
                   active: !!this.formData.IsActive, 
                   st: this.formData.IsActive ? 'Active' : 'OFS', 
                   shelf: parseInt(this.formData.ShelfID || 1) 
                };
             } else {
                mutation = `mutation($pid: Int!, $sku: String, $unit: String, $mrp: String, $price: Float, $size: String, $color: String, $weight: Float, $img: String, $active: Boolean, $st: String, $shelf: Int) { createVariant(ProductID: $pid, SKU: $sku, Unit: $unit, MRP: $mrp, SalePrice: $price, Size: $size, Color: $color, Weight: $weight, ImageURL: $img, IsActive: $active, Status: $st, ShelfID: $shelf) { VariantID SKU } }`;
                vars = { 
                   pid, 
                   sku: entityName.trim(), 
                   unit: this.formData.Unit || null, 
                   mrp: String(this.formData.MRP), 
                   price: parseFloat(this.formData.SalePrice), 
                   size: this.formData.Size || null, 
                   color: this.formData.Color || null, 
                   weight: this.formData.Weight !== undefined && this.formData.Weight !== '' && this.formData.Weight !== null ? parseFloat(this.formData.Weight) : null, 
                   img: this.formData.ImageURL || null, 
                   active: !!this.formData.IsActive, 
                   st: this.formData.IsActive ? 'Active' : 'OFS', 
                   shelf: parseInt(this.formData.ShelfID || 1) 
                };
             }
          }

          const res = await graphqlRequest(mutation, vars, token); 
          this.closeModal(); 
          await this.refreshStaticData(); 
          await this.fetchVariants();

          const createdOrUpdated = this.isEditing ? 'updated' : 'created';
          this.successMessage = `✅ ${entityTitle} "${entityName}" ${createdOrUpdated} successfully!`;
          setTimeout(() => { this.successMessage = ''; }, 5000);

          // If a product was created, stay on the products tab
          if (this.modalType === 'product') {
             this.activeTab = 'products';
          }
       } catch (e) { 
          this.errorMessage = 'Save failed: ' + e.message; 
       } finally { 
          this.saving = false; 
       }
    },
    async deleteItem(type, id) {
       const typeNames = { category: 'Category', subcategory: 'Sub-Category', brand: 'Brand', product: 'Product', variant: 'Variant' };
       if (!confirm(`Are you sure you want to delete this ${typeNames[type] || type}? All associated child records will be safely cleaned up.`)) return; 
       
       const token = localStorage.getItem('token');
       try { 
          let mutation = "";
          if (type === 'category') mutation = `mutation($id: Int!) { deleteCategory(CategoryID: $id) }`;
          else if (type === 'subcategory') mutation = `mutation($id: Int!) { deleteSubCategory(SubCategoryID: $id) }`;
          else if (type === 'brand') mutation = `mutation($id: Int!) { deleteBrand(BrandID: $id) }`;
          else if (type === 'product') mutation = `mutation($id: Int!) { deleteProduct(ProductID: $id) }`;
          else mutation = `mutation($id: Int!) { deleteVariant(VariantID: $id) }`;

          await graphqlRequest(mutation, { id: parseInt(id) }, token); 
          this.successMessage = `Deleted ${typeNames[type] || type} successfully.`;
          setTimeout(() => { this.successMessage = ''; }, 4000);

          await this.refreshStaticData();
          await this.fetchVariants(); 
       } catch (e) { 
          this.errorMessage = 'Delete failed: ' + e.message; 
       }
    },
    async handleImageUpload(event, targetField) {
       const file = event.target.files[0]; 
       if (!file) return; 
       const fd = new FormData(); 
       fd.append('image', file); 
       this.saving = true;
       try {
          const res = await fetch('/upload-catalog-image', { 
             method: 'POST', 
             headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, 
             body: fd 
          });
          const result = await res.json(); 
          if (result.success) {
             this.formData[targetField] = result.imageUrl; 
          } else {
             alert('Upload failed: ' + (result.error || 'Server rejected file'));
          }
       } catch (e) { 
          alert('Upload network error: ' + e.message); 
       } finally { 
          this.saving = false; 
       }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { 
  module.exports = AdminCatalog; 
}
