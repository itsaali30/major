const AdminCatalog = {
  template: `
    <div class="container-fluid my-4 pb-5">
      <!-- Page Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0 fw-bold"><i class="bi bi-box-seam me-2"></i> Catalog Hierarchy Manager</h4>
        <div class="btn-group shadow-sm">
           <button class="btn btn-dark btn-sm" @click="openModal('category', null)">+ Category</button>
           <button class="btn btn-dark btn-sm" @click="openModal('subcategory', null)">+ Sub-Cat</button>
           <button class="btn btn-dark btn-sm" @click="openModal('brand', null)">+ Brand</button>
           <button class="btn btn-dark btn-sm border-start border-secondary" @click="openModal('product', null)">+ Product</button>
           <button class="btn btn-success btn-sm fw-bold" @click="openModal('variant', null)"><i class="bi bi-plus-lg me-1"></i> New Variant</button>
        </div>
      </div>

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

      <!-- Bulk Action Header (Floating) -->
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
              <!-- Product Groups -->
              <template v-for="group in groupedVariants" :key="group.product.ProductID">
                <!-- Product Header Row -->
                <tr class="product-header-row bg-light">
                  <td class="ps-3 border-start border-4 border-primary">
                     <input type="checkbox" class="form-check-input" :checked="isProductSelected(group.product.ProductID)" @change="toggleProductSelection(group.product.ProductID, $event.target.checked)">
                  </td>
                  <td colspan="5">
                     <div class="d-flex align-items-center">
                        <img :src="group.product.ImageURL || 'https://placehold.co/40x40?text=P'" class="rounded border shadow-sm me-3" style="width: 40px; height: 40px; object-fit: cover;">
                        <div>
                           <div class="fw-bold text-dark fs-6">{{ group.product.ProductName }}</div>
                           <div class="small">
                              <span class="text-muted"><i class="bi bi-tag-fill me-1"></i>{{ getCategoryNameFromIds(group.product.SubCategoryID) }}</span>
                              <span class="mx-2 text-muted">|</span>
                              <span class="text-primary fw-bold small">{{ getBrandNameFromId(group.product.BrandID) }}</span>
                           </div>
                        </div>
                        <div class="ms-auto pe-4 fw-bold text-muted small">
                           {{ group.variants.length }} Variant{{ group.variants.length > 1 ? 's' : '' }}
                        </div>
                     </div>
                  </td>
                </tr>

                <!-- Variant Rows -->
                <tr v-for="v in group.variants" :key="v.VariantID" class="variant-row" :class="{'table-active': isSelected(v.VariantID)}">
                  <td class="ps-4">
                     <input type="checkbox" class="form-check-input" :value="v.VariantID" v-model="selectedVariants">
                  </td>
                  <td>
                     <div class="d-flex align-items-center ps-3">
                        <img :src="v.ImageURL || group.product.ImageURL || 'https://placehold.co/40x40?text=V'" class="rounded-circle border me-3" style="width: 32px; height: 32px; object-fit: cover;" onerror="this.src='https://placehold.co/40x40?text=V'">
                        <div class="small fw-bold">{{ group.product.ProductName }} - {{ v.Size || v.Color || 'Default' }}</div>
                     </div>
                  </td>
                  <td>
                     <div class="small fw-bold text-primary">{{ v.SKU }}</div>
                     <div class="small text-muted" v-if="v.Size || v.Color">{{ v.Size || '-' }} / {{ v.Color || '-' }} / {{ v.Weight ? v.Weight+'kg' : '-' }}</div>
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
                        <button class="btn btn-outline-light border text-primary" @click="openModal('variant', v)"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-light border text-danger" @click="deleteItem('variant', v.VariantID)"><i class="bi bi-trash"></i></button>
                     </div>
                  </td>
                </tr>
              </template>

              <!-- Loading / Empty states -->
              <tr v-if="variants.length === 0 && !loading">
                 <td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-search display-3 opacity-25"></i>
                    <p class="mt-3 fw-bold fs-5">No catalog items found matching your filters</p>
                    <p class="small">Try adjusting your search or filters to see more results</p>
                 </td>
              </tr>
              <tr v-if="loading">
                 <td colspan="6" class="text-center py-5">
                    <div class="spinner-grow text-primary" role="status"></div>
                    <p class="mt-3 text-muted fw-bold">Syncing with Central Repository...</p>
                 </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Integrated Item Form Modal (Kept same logic but better styles) -->
      <div class="modal fade" id="catalogModal" tabindex="-1" ref="catalogModal">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg overflow-hidden">
            <div class="modal-header bg-dark text-white border-0 py-3">
              <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i> {{ isEditing ? 'Edit' : 'New' }} {{ modalTypeTitle }}</h5>
              <button type="button" class="btn-close btn-close-white" @click="closeModal"></button>
            </div>
            <div class="modal-body p-4 bg-white">
              <form @submit.prevent="saveItem">
                <div class="row g-3">
                  <!-- Category/SubCat/Brand Forms -->
                  <div class="col-12" v-if="['category', 'subcategory', 'brand', 'product'].includes(modalType)">
                     <div class="card border border-light-subtle shadow-none p-3 bg-light-subtle rounded-3">
                        <!-- Category Fields -->
                        <template v-if="modalType === 'category'">
                           <div class="mb-3">
                               <label class="form-label fw-bold text-muted small">Category Name</label>
                               <input type="text" class="form-control" v-model="formData.CategoryName" required>
                           </div>
                           <label class="form-label fw-bold text-muted small">Image Link</label>
                           <div class="input-group">
                              <input type="file" class="form-control" @change="handleImageUpload($event, 'CategoryImageURL')" accept="image/*">
                              <input type="text" class="form-control" v-model="formData.CategoryImageURL" placeholder="or paste URL">
                           </div>
                        </template>

                        <!-- SubCategory Fields -->
                        <template v-if="modalType === 'subcategory'">
                           <label class="form-label fw-bold text-muted small">Parent Category</label>
                           <div class="input-group input-group-sm mb-2">
                              <span class="input-group-text border-end-0 bg-transparent"><i class="bi bi-search"></i></span>
                              <input type="text" class="form-control border-start-0" placeholder="Search category..." v-model="modalCategorySearch">
                           </div>
                           <select class="form-select mb-3" v-model="formData.CategoryID" v-if="!isEditing" required>
                              <option v-for="c in filteredCategoriesForModal" :value="c.CategoryID">{{ c.CategoryName }}</option>
                           </select>
                           <label class="form-label fw-bold text-muted small">Sub-Category Name</label>
                           <input type="text" class="form-control mb-3" v-model="formData.CategorySubName" required>
                           <label class="form-label fw-bold text-muted small">Image</label>
                           <input type="file" class="form-control mb-2" @change="handleImageUpload($event, 'SubCategoryImageURL')">
                           <input type="text" class="form-control" v-model="formData.SubCategoryImageURL" placeholder="or paste URL">
                        </template>

                        <!-- Product Fields -->
                        <template v-if="modalType === 'product'">
                           <div class="row g-2 mb-3" v-if="!isEditing">
                              <div class="col-6">
                                 <label class="small fw-bold text-muted">Sub-Category</label>
                                 <select class="form-select" v-model="formData.SubCategoryID" required>
                                    <option v-for="sc in allSubCatsFlattened" :value="sc.SubCategoryID">{{ sc.CategorySubName }}</option>
                                 </select>
                              </div>
                                 <label class="small fw-bold text-muted">Brand</label>
                                 <div class="input-group input-group-sm mb-1">
                                    <span class="input-group-text border-end-0 bg-transparent py-0"><i class="bi bi-search" style="font-size: 0.7rem;"></i></span>
                                    <input type="text" class="form-control border-start-0 py-0" style="font-size: 0.75rem;" placeholder="Search brand..." v-model="modalBrandSearch">
                                 </div>
                                 <select class="form-select" v-model="formData.BrandID" required>
                                    <option v-for="b in filteredBrandsForModal" :key="b.BrandID" :value="b.BrandID">{{ b.BrandName }}</option>
                                 </select>
                              </div>
                           </div>
                           <label class="form-label fw-bold small text-muted">Product Name</label>
                           <input type="text" class="form-control mb-3" v-model="formData.ProductName" required>
                           <label class="form-label fw-bold small text-muted">Description</label>
                           <textarea class="form-control mb-3" v-model="formData.ProductDescription" rows="2"></textarea>
                           <div class="mb-3">
                              <label class="form-label fw-bold small text-muted">Product Image</label>
                              <div class="card p-2 bg-light border-0 shadow-sm d-flex flex-row align-items-center gap-3">
                                 <div class="flex-shrink-0" v-if="formData.ImageURL">
                                    <img :src="formData.ImageURL" class="rounded" style="width: 50px; height: 50px; object-fit: cover;">
                                 </div>
                                 <div class="flex-grow-1">
                                    <input type="file" class="form-control form-control-sm mb-1" @change="handleImageUpload($event, 'ImageURL')" accept="image/*">
                                    <input type="text" class="form-control form-control-sm" v-model="formData.ImageURL" placeholder="or paste URL here">
                                 </div>
                              </div>
                           </div>
                           <div class="row g-2">
                              <div class="col-6"><label class="small fw-bold text-muted">Tax Rate %</label><input type="number" class="form-control" v-model="formData.TaxRate"></div>
                              <div class="col-12 mt-2">
                                <p class="x-small text-muted mb-0"><i class="bi bi-info-circle me-1"></i> This image will be the default for all variants of this product unless overridden.</p>
                              </div>
                           </div>
                        </template>

                        <!-- Brand Fields -->
                        <template v-if="modalType === 'brand'">
                           <label class="form-label fw-bold small text-muted">Brand Name</label>
                           <input type="text" class="form-control mb-3" v-model="formData.BrandName" required>
                           <label class="form-label fw-bold small text-muted">Brand Image (Logo)</label>
                           <input type="file" class="form-control mb-2" @change="handleImageUpload($event, 'LogoURL')">
                           <label class="form-label fw-bold small text-muted text-uppercase">About Brand</label>
                           <textarea class="form-control" v-model="formData.Description"></textarea>
                        </template>
                     </div>
                  </div>

                  <div class="col-12" v-if="modalType === 'variant'">
                     <div class="row g-3">
                        <div class="col-md-12" v-if="!isEditing">
                            <label class="form-label fw-bold small text-muted">Select Parent Product</label>
                            <div class="input-group input-group-sm mb-2 shadow-sm">
                               <span class="input-group-text bg-light border-end-0"><i class="bi bi-search"></i></span>
                               <input type="text" class="form-control border-start-0" placeholder="Search product by Name or ID..." v-model="modalProductSearch">
                            </div>
                            <select class="form-select border-primary-subtle" v-model="formData.ProductID" required>
                               <option :value="undefined" disabled>-- Select Product ({{ filteredProductsForVariant.length }} found) --</option>
                               <option v-for="p in filteredProductsForVariant" :key="p.ProductID" :value="p.ProductID">
                                  [ID: {{ p.ProductID }}] {{ p.ProductName }}
                               </option>
                            </select>
                            <div class="small text-muted mt-1 px-1" v-if="modalProductSearch && filteredProductsForVariant.length === 0">
                               No products found matching "{{ modalProductSearch }}"
                            </div>
                        </div>
                        <div class="col-md-6">
                           <label class="form-label fw-bold small text-muted">Stock ID (SKU)</label>
                           <input type="text" class="form-control shadow-none" v-model="formData.SKU" required placeholder="e.g. LAP-MAC-PRO-13">
                        </div>
                        <div class="col-md-6">
                           <label class="form-label fw-bold small text-muted">Unit</label>
                           <input type="text" class="form-control shadow-none" v-model="formData.Unit" placeholder="e.g. PCS, PACK, BOX">
                        </div>
                        <div class="col-md-6">
                           <label class="form-label fw-bold small text-muted">Label Price (MRP)</label>
                           <div class="input-group">
                              <span class="input-group-text border-0">₹</span>
                              <input type="text" class="form-control fw-bold" v-model="formData.MRP" required>
                           </div>
                        </div>
                        <div class="col-md-6">
                           <label class="form-label fw-bold small text-muted">Deal Price (Store)</label>
                           <div class="input-group border border-success rounded">
                              <span class="input-group-text border-0 bg-transparent text-success">₹</span>
                              <input type="number" step="0.01" class="form-control border-0 fw-bold text-success shadow-none" v-model="formData.SalePrice" required>
                           </div>
                        </div>
                        <div class="col-md-4">
                           <label class="form-label fw-bold small text-muted">Size Specs</label>
                           <input type="text" class="form-control" v-model="formData.Size" placeholder="e.g. XL, 44cm">
                        </div>
                        <div class="col-md-4">
                           <label class="form-label fw-bold small text-muted">Color Palette</label>
                           <input type="text" class="form-control" v-model="formData.Color" placeholder="e.g. Matte Black">
                        </div>
                        <div class="col-md-4">
                           <label class="form-label fw-bold small text-muted">Gross Wt (KG)</label>
                           <input type="number" step="0.01" class="form-control" v-model="formData.Weight">
                        </div>
                        <div class="col-md-6">
                           <label class="form-label fw-bold small text-muted">Shelf / Rack ID</label>
                           <input type="number" class="form-control border-warning-subtle shadow-none" v-model="formData.ShelfID" required>
                        </div>
                        <div class="col-12 p-3 bg-light rounded-3 d-flex align-items-center gap-4">
                            <div class="variant-img-preview border shadow-sm rounded-3 overflow-hidden bg-white" style="width: 80px; height: 80px;">
                               <img :src="formData.ImageURL || 'https://placehold.co/80x80?text=IMG'" class="w-100 h-100 object-fit-cover">
                            </div>
                            <div class="flex-grow-1">
                               <label class="form-label fw-bold small mb-1">Variant Specific Photo</label>
                               <input type="file" class="form-control form-control-sm mb-2" @change="handleImageUpload($event, 'ImageURL')">
                               <input type="text" class="form-control form-control-sm" v-model="formData.ImageURL" placeholder="or paste image URL">
                            </div>
                        </div>
                     </div>
                  </div>
                  
                  <div class="col-12 py-3 border-top mt-3">
                     <div class="form-check form-switch d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-3">
                        <label class="form-check-label fw-bold text-dark" for="modalActive">Show in Sales Catalog / Active Status</label>
                        <input class="form-check-input" type="checkbox" id="modalActive" v-model="formData.IsActive" style="transform: scale(1.4);">
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

    <style>
      .product-header-row td { vertical-align: middle !important; border-top: 1px solid #eee; }
      .variant-row td { background-color: #fff; border-top: 1px dashed #f0f0f0; }
      .variant-row:hover td { background-color: #fafafa !important; }
      .floating-bulk-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: auto; min-width: 500px; z-index: 1100; }
      .form-select, .form-control { border: 1px solid #e2e8f0; }
      .form-select:focus, .form-control:focus { border-color: #3182ce; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1); }
      .form-check-input:checked { background-color: #0d6efd; border-color: #0d6efd; }
    </style>
  `,
  data() {
    return {
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
      
      loading: false, saving: false, debounceTimer: null,
      modalInstance: null, modalType: 'variant', isEditing: false, formData: {}
    };
  },
  computed: {
    modalTypeTitle() {
       const map = { category: 'Category', subcategory: 'Sub-Category', product: 'Product', variant: 'Variant', brand: 'Brand' };
       return map[this.modalType];
    },
    filteredProductsForVariant() {
       if (!this.modalProductSearch) return this.allProductsFlattened;
       const s = this.modalProductSearch.toLowerCase();
       return this.allProductsFlattened.filter(p => 
          p.ProductName.toLowerCase().includes(s) || 
          p.ProductID.toString().includes(s)
       );
    },
    filteredBrandsForModal() {
       if (!this.modalBrandSearch) return this.brands;
       const s = this.modalBrandSearch.toLowerCase();
       return this.brands.filter(b => b.BrandName.toLowerCase().includes(s));
    },
    filteredCategoriesForModal() {
       if (!this.modalCategorySearch) return this.categories;
       const s = this.modalCategorySearch.toLowerCase();
       return this.categories.filter(c => c.CategoryName.toLowerCase().includes(s));
    },
    groupedVariants() {
       const groups = {};
       this.variants.forEach(v => {
          if (!groups[v.ProductID]) {
             groups[v.ProductID] = {
                product: this.allProductsFlattened.find(p => p.ProductID === v.ProductID) || { ProductName: 'Unknown Product', ProductID: v.ProductID },
                variants: []
             };
          }
          groups[v.ProductID].variants.push(v);
       });
       return Object.values(groups).sort((a, b) => (a.product.ProductName || '').localeCompare(b.product.ProductName || ''));
    }
  },
  mounted() {
    this.initData();
    this.modalInstance = new bootstrap.Modal(this.$refs.catalogModal);
  },
  methods: {
    async initData() { await this.refreshStaticData(); this.fetchVariants(); },
    async refreshStaticData() {
       const query = `{
          allCategories { CategoryID CategoryName }
          allBrands { BrandID BrandName }
          allSubCategories { SubCategoryID CategoryID CategorySubName }
          allProducts { ProductID SubCategoryID BrandID ProductName ProductDescription ImageURL TaxRate }
       }`;
       try {
          const data = await graphqlRequest(query, {}, localStorage.getItem('token'));
          this.categories = data.allCategories;
          this.brands = data.allBrands;
          this.allSubCatsFlattened = data.allSubCategories;
          this.allProductsFlattened = data.allProducts;
          this.onCategoryChange();
       } catch (e) { console.error(e); }
    },
    async fetchVariants() {
       this.loading = true;
       const query = `query($cid: Int, $scid: Int, $bid: Int, $pid: Int, $s: String) { 
          allVariants(CategoryID: $cid, SubCategoryID: $scid, BrandID: $bid, ProductID: $pid, Search: $s) { 
             VariantID ProductID SKU Weight Size Color MRP SalePrice Status IsActive ImageURL Unit ShelfID
          } 
       }`;
       const vars = { cid: this.filters.categoryID, scid: this.filters.subCategoryID, bid: this.filters.brandID, pid: this.filters.productID, s: this.filters.search };
       try {
          const data = await graphqlRequest(query, vars, localStorage.getItem('token'));
          this.variants = data.allVariants;
          this.selectedVariants = [];
       } catch (e) { console.error(e); }
       finally { this.loading = false; }
    },
    debouncedFetch() { clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => this.fetchVariants(), 400); },
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

    // Lookup Helpers
    getCategoryNameFromIds(scid) {
       const sc = this.allSubCatsFlattened.find(x => x.SubCategoryID === scid); if (!sc) return 'N/A';
       const c = this.categories.find(x => x.CategoryID === sc.CategoryID); return c ? c.CategoryName : 'N/A';
    },
    getBrandNameFromId(bid) { const b = this.brands.find(x => x.BrandID === bid); return b ? b.BrandName : 'No Brand'; },

    // Selection Logic
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

    // Instant Actions
    async toggleInstant(v) {
       const newActive = !v.IsActive; const token = localStorage.getItem('token');
       const mutation = `mutation($id: Int!, $active: Boolean, $st: String) { updateVariant(VariantID: $id, IsActive: $active, Status: $st) { VariantID } }`;
       try { await graphqlRequest(mutation, { id: v.VariantID, active: newActive, st: newActive ? 'Active' : 'OFS' }, token); v.IsActive = newActive; } catch (e) { alert(e.message); }
    },

    // Bulk Actions
    async bulkStatusUpdate(active) {
       if (!confirm(`Update ${this.selectedVariants.length} items to ${active ? 'Active' : 'OFS'}?`)) return;
       const token = localStorage.getItem('token'); const status = active ? 'Active' : 'OFS';
       try {
          for (const id of this.selectedVariants) {
             const mutation = `mutation($id: Int!, $active: Boolean, $st: String) { updateVariant(VariantID: $id, IsActive: $active, Status: $st) { VariantID } }`;
             await graphqlRequest(mutation, { id, active, st: status }, token);
          }
          this.fetchVariants();
       } catch (e) { alert(e.message); }
    },
    async bulkDelete() {
       if (!confirm(`Delete ${this.selectedVariants.length} items?`)) return;
       const token = localStorage.getItem('token');
       try {
          for (const id of this.selectedVariants) { await graphqlRequest(`mutation($id: Int!) { deleteVariant(VariantID: $id) }`, { id }, token); }
          this.fetchVariants();
       } catch (e) { alert(e.message); }
    },

    // Modal & CRUD (Same robust logic as before)
    openModal(type, item) {
       this.modalType = type; this.isEditing = !!item;
       this.modalProductSearch = '';
       this.modalBrandSearch = '';
       this.modalCategorySearch = '';
       this.formData = item ? { ...item } : { IsActive: true, Status: 'Active', CategoryID: this.filters.categoryID, SubCategoryID: this.filters.subCategoryID, ProductID: this.filters.productID, BrandID: this.filters.brandID, ShelfID: 1 };
       this.modalInstance.show();
    },
    closeModal() { this.modalInstance.hide(); },
    async saveItem() {
       this.saving = true; const token = localStorage.getItem('token');
       try {
          let mutation = ""; let vars = { ...this.formData };
          if (this.modalType === 'category') {
             if (this.isEditing) mutation = `mutation($id: Int!, $n: String, $i: String) { updateCategory(CategoryID: $id, CategoryName: $n, CategoryImageURL: $i) { CategoryID } }`;
             else mutation = `mutation($n: String!, $i: String) { createCategory(CategoryName: $n, CategoryImageURL: $i) { CategoryID } }`;
             vars = { id: vars.CategoryID, n: vars.CategoryName, i: vars.CategoryImageURL };
          }
          else if (this.modalType === 'subcategory') {
             if (this.isEditing) mutation = `mutation($id: Int!, $n: String, $i: String) { updateSubCategory(SubCategoryID: $id, CategorySubName: $n, SubCategoryImageURL: $i) { SubCategoryID } }`;
             else mutation = `mutation($cid: Int!, $n: String!, $i: String) { createSubCategory(CategoryID: $cid, CategorySubName: $n, SubCategoryImageURL: $i) { SubCategoryID } }`;
             vars = { id: vars.SubCategoryID, cid: vars.CategoryID, n: vars.CategorySubName, i: vars.SubCategoryImageURL };
          }
          else if (this.modalType === 'product') {
             const args = { id: vars.ProductID, scid: vars.SubCategoryID, bid: vars.BrandID, n: vars.ProductName, d: vars.ProductDescription, i: vars.ImageURL, t: parseFloat(vars.TaxRate||0), a: !!vars.IsActive };
             if (this.isEditing) mutation = `mutation($id: Int!, $n: String, $d: String, $i: String, $t: Float, $a: Boolean) { updateProduct(ProductID: $id, ProductName: $n, ProductDescription: $d, ImageURL: $i, TaxRate: $t, IsActive: $a) { ProductID } }`;
             else mutation = `mutation($scid: Int!, $bid: Int!, $n: String!, $d: String, $i: String, $t: Float, $a: Boolean) { createProduct(SubCategoryID: $scid, BrandID: $bid, ProductName: $n, ProductDescription: $d, ImageURL: $i, TaxRate: $t, IsActive: $a) { ProductID } }`;
             vars = args;
          }
          else if (this.modalType === 'variant') {
             const vargs = { id: vars.VariantID?parseInt(vars.VariantID):undefined, pid: parseInt(this.formData.ProductID||this.filters.productID), sku: vars.SKU, unit: vars.Unit, mrp: vars.MRP, price: parseFloat(vars.SalePrice||0), size: vars.Size, color: vars.Color, weight: vars.Weight?parseFloat(vars.Weight):null, img: vars.ImageURL, active: !!vars.IsActive, st: vars.IsActive?'Active':'OFS', shelf: parseInt(vars.ShelfID||1) };
             if (this.isEditing) mutation = `mutation($id: Int!, $sku: String, $unit: String, $mrp: String, $price: Float, $size: String, $color: String, $weight: Float, $img: String, $active: Boolean, $st: String, $shelf: Int) { updateVariant(VariantID: $id, SKU: $sku, Unit: $unit, MRP: $mrp, SalePrice: $price, Size: $size, Color: $color, Weight: $weight, ImageURL: $img, IsActive: $active, Status: $st, ShelfID: $shelf) { VariantID } }`;
             else mutation = `mutation($pid: Int!, $sku: String, $unit: String, $mrp: String, $price: Float, $size: String, $color: String, $weight: Float, $img: String, $active: Boolean, $st: String, $shelf: Int) { createVariant(ProductID: $pid, SKU: $sku, Unit: $unit, MRP: $mrp, SalePrice: $price, Size: $size, Color: $color, Weight: $weight, ImageURL: $img, IsActive: $active, Status: $st, ShelfID: $shelf) { VariantID } }`;
             vars = vargs;
          }
          else if (this.modalType === 'brand') {
             if (this.isEditing) mutation = `mutation($id: Int!, $n: String, $log: String, $d: String) { updateBrand(BrandID: $id, BrandName: $n, LogoURL: $log, Description: $d) { BrandID } }`;
             else mutation = `mutation($n: String!, $log: String, $d: String) { createBrand(BrandName: $n, LogoURL: $log, Description: $d) { BrandID } }`;
             vars = { id: vars.BrandID, n: vars.BrandName, log: vars.LogoURL, d: vars.Description };
          }
          await graphqlRequest(mutation, vars, token); this.closeModal(); this.fetchVariants(); this.refreshStaticData();
       } catch (e) { alert('Error: ' + e.message); } finally { this.saving = false; }
    },
    async deleteItem(type, id) {
       if (!confirm(`Delete this ${type}?`)) return; const token = localStorage.getItem('token');
       try { await graphqlRequest(`mutation($id: Int!) { deleteVariant(VariantID: $id) }`, { id: parseInt(id) }, token); this.fetchVariants(); } catch (e) { alert(e.message); }
    },
    async handleImageUpload(event, targetField) {
       const file = event.target.files[0]; if (!file) return; const fd = new FormData(); fd.append('image', file); this.saving = true;
       try {
          const res = await fetch('/upload-catalog-image', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: fd });
          const result = await res.json(); if (result.success) this.formData[targetField] = result.imageUrl; else alert('Upload failed');
       } catch (e) { alert(e.message); } finally { this.saving = false; }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminCatalog; }
