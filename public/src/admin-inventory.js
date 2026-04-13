const AdminInventory = {
  template: `
    <div class="container-fluid my-4">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h4 class="mb-1 fw-bold text-dark"><i class="bi bi-stack me-2 text-primary"></i> Stock Management</h4>
           <p class="text-muted small mb-0">Control physical inventory levels for all product variants across your stores.</p>
        </div>
        <div class="d-flex gap-2 align-items-center">
           <label class="fw-bold small text-muted text-uppercase mb-0 me-2">Selected Store:</label>
           <select class="form-select border-0 shadow-sm bg-white fw-bold" style="min-width: 200px;" v-model="selectedStoreID" @change="fetchStock">
              <option :value="null" disabled>-- Select Store --</option>
              <option v-for="s in stores" :key="s.StoreID" :value="s.StoreID">{{ s.StoreName }}</option>
           </select>
        </div>
      </div>

      <!-- Inventory Table -->
      <div v-if="selectedStoreID" class="card border-0 shadow-sm overflow-hidden">
        <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
           <div class="input-group w-50">
              <span class="input-group-text bg-light border-0"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control bg-light border-0" placeholder="Filter by product or SKU..." v-model="searchQuery">
           </div>
           <div class="text-muted small">
              Showing {{ filteredGroups.length }} unique products
           </div>
        </div>

        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="bg-light text-muted small text-uppercase">
               <tr>
                  <th class="ps-4">Product & Specs</th>
                  <th>Shelf</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th class="text-end pe-4">Action</th>
               </tr>
            </thead>
            <tbody>
               <template v-for="group in filteredGroups" :key="group.ProductID">
                  <!-- Product Row -->
                  <tr class="bg-light-subtle">
                     <td colspan="6" class="ps-4 py-2 border-start border-4 border-primary">
                        <span class="fw-bold text-dark">{{ group.ProductName }}</span>
                        <span class="badge bg-white text-dark border ms-2 small fw-normal">{{ group.variants.length }} items</span>
                     </td>
                  </tr>
                  <!-- Variant Rows -->
                  <tr v-for="s in group.variants" :key="s.VariantID">
                     <td class="ps-5">
                        <div class="fw-bold small">{{ s.variant.SKU }}</div>
                        <div class="text-muted x-small" v-if="s.variant.Size || s.variant.Color">
                           {{ s.variant.Size || '-' }} • {{ s.variant.Color || '-' }}
                        </div>
                     </td>
                     <td>
                        <input type="number" class="form-control form-control-sm border-0 bg-light text-center" style="width: 70px;" v-model="s.ShelfID" @change="markChanged(s)">
                     </td>
                     <td style="width: 150px;">
                        <div class="input-group input-group-sm">
                           <button class="btn btn-outline-secondary border-0 bg-light px-2" @click="adjust(s, -1)">-</button>
                           <input type="number" class="form-control border-0 bg-light text-center fw-bold" v-model.number="s.OnHandQty" @change="markChanged(s)">
                           <button class="btn btn-outline-secondary border-0 bg-light px-2" @click="adjust(s, 1)">+</button>
                        </div>
                     </td>
                     <td>
                        <span class="badge rounded-pill bg-light text-muted fw-normal">{{ s.ReservedQty || 0 }}</span>
                     </td>
                     <td>
                        <span class="fw-bold" :class="s.OnHandQty > 0 ? 'text-success' : 'text-danger'">
                           {{ (s.OnHandQty || 0) - (s.ReservedQty || 0) }}
                        </span>
                     </td>
                     <td class="text-end pe-4">
                        <button class="btn btn-sm" :class="isChanged(s) ? 'btn-primary shadow-sm' : 'btn-outline-light text-muted'" @click="saveStock(s)" :disabled="!isChanged(s) || saving === s.VariantID">
                           <span v-if="saving === s.VariantID" class="spinner-border spinner-border-sm me-1"></span>
                           <i v-else class="bi bi-cloud-arrow-up me-1"></i>
                           {{ isChanged(s) ? 'Update' : 'Synced' }}
                        </button>
                     </td>
                  </tr>
               </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-5">
         <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style="width: 100px; height: 100px;">
            <i class="bi bi-shop display-4 text-muted opacity-50"></i>
         </div>
         <h5 class="fw-bold">No Store Selected</h5>
         <p class="text-muted">Please select a store from the dropdown above to manage its stock levels.</p>
      </div>
    </div>
  `,
  data() {
    return {
      stores: [],
      selectedStoreID: null,
      stocks: [], // Flat list of stock items
      productsFlattened: [],
      searchQuery: '',
      changedItems: new Set(),
      loading: false,
      saving: null // VariantID of item being saved
    };
  },
  computed: {
    filteredGroups() {
      // 1. Group stocks by product
      const groups = {};
      this.stocks.forEach(s => {
        const p = this.productsFlattened.find(prod => prod.ProductID === s.variant.ProductID) || { ProductName: 'Unnamed Product', ProductID: s.variant.ProductID };
        
        // Search Filter
        constMatches = !this.searchQuery || 
                       p.ProductName.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                       s.variant.SKU.toLowerCase().includes(this.searchQuery.toLowerCase());
        
        if (constMatches) {
          if (!groups[p.ProductID]) {
            groups[p.ProductID] = { ...p, variants: [] };
          }
          groups[p.ProductID].variants.push(s);
        }
      });
      return Object.values(groups).sort((a, b) => a.ProductName.localeCompare(b.ProductName));
    }
  },
  mounted() {
    this.init();
  },
  methods: {
    async init() {
       const query = `{
          allStores { StoreID StoreName }
          allProducts { ProductID ProductName }
       }`;
       try {
          const data = await graphqlRequest(query, {}, localStorage.getItem('token'));
          this.stores = data.allStores;
          this.productsFlattened = data.allProducts;
          if (this.stores.length > 0) {
             this.selectedStoreID = this.stores[0].StoreID;
             this.fetchStock();
          }
       } catch (e) { console.error(e); }
    },
    async fetchStock() {
       if (!this.selectedStoreID) return;
       this.loading = true;
       const query = `query($sid: Int!) {
          allStocks(StoreID: $sid) {
             StockID StoreID VariantID ShelfID OnHandQty ReservedQty AvailableQty
             variant { VariantID ProductID SKU Size Color }
          }
       }`;
       try {
          const data = await graphqlRequest(query, { sid: this.selectedStoreID }, localStorage.getItem('token'));
          this.stocks = data.allStocks;
          this.changedItems.clear();
       } catch (e) { console.error(e); }
       finally { this.loading = false; }
    },
    markChanged(s) {
       this.changedItems.add(s.VariantID);
       this.$forceUpdate();
    },
    isChanged(s) {
       return this.changedItems.has(s.VariantID);
    },
    adjust(s, val) {
       s.OnHandQty = Math.max(0, (s.OnHandQty || 0) + val);
       this.markChanged(s);
    },
    async saveStock(s) {
       this.saving = s.VariantID;
       const mutation = `mutation($sid: Int!, $vid: Int!, $qty: Int!, $shelf: Int) {
          updateStock(StoreID: $sid, VariantID: $vid, OnHandQty: $qty, ShelfID: $shelf) {
             StockID OnHandQty AvailableQty
          }
       }`;
       try {
          await graphqlRequest(mutation, {
             sid: this.selectedStoreID,
             vid: s.VariantID,
             qty: parseInt(s.OnHandQty),
             shelf: parseInt(s.ShelfID)
          }, localStorage.getItem('token'));
          this.changedItems.delete(s.VariantID);
          this.$forceUpdate();
       } catch (e) { 
          alert('Error updating stock: ' + e.message); 
       } finally { 
          this.saving = null; 
       }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AdminInventory; }
