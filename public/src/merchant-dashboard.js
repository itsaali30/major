const AdminMerchantDashboard = {
  template: `
    <div class="container my-5">
      <div class="row mb-4">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center">
            <h2>
              <i class="bi bi-shop text-primary me-2"></i> 
              {{ merchant ? merchant.Name : 'Merchant Dashboard' }}
            </h2>
            <router-link to="/admin/merchants" class="btn btn-outline-secondary">
              <i class="bi bi-arrow-left"></i> Back to Merchants
            </router-link>
          </div>
          <hr/>
        </div>
      </div>
      
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="text-muted mt-2">Loading merchant data...</p>
      </div>

      <div v-else-if="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div v-else class="row g-4 text-center">
        <!-- Contacts Button -->
        <div class="col-md-4">
          <router-link :to="'/admin/merchants/' + MerchantID + '/contacts'" class="text-decoration-none">
            <div class="card shadow-sm h-100 py-4 border-info card-hover">
              <div class="card-body">
                <i class="bi bi-people-fill text-info" style="font-size: 3rem;"></i>
                <h4 class="mt-3 text-dark">Contacts</h4>
                <p class="text-muted text-sm">Manage emergency contacts, sales reps, etc</p>
              </div>
            </div>
          </router-link>
        </div>

        <!-- Ledger Button -->
        <div class="col-md-4">
          <router-link :to="'/admin/merchants/' + MerchantID + '/ledger'" class="text-decoration-none">
            <div class="card shadow-sm h-100 py-4 border-secondary card-hover">
              <div class="card-body">
                <i class="bi bi-journal-text text-secondary" style="font-size: 3rem;"></i>
                <h4 class="mt-3 text-dark">Ledger</h4>
                <p class="text-muted text-sm">View accounting and payment records</p>
              </div>
            </div>
          </router-link>
        </div>

        <!-- Purchase Order Button -->
        <div class="col-md-4">
          <router-link :to="'/admin/merchants/' + MerchantID + '/purchase-orders'" class="text-decoration-none">
            <div class="card shadow-sm h-100 py-4 border-success card-hover">
              <div class="card-body">
                <i class="bi bi-cart-check-fill text-success" style="font-size: 3rem;"></i>
                <h4 class="mt-3 text-dark">Purchase Orders</h4>
                <p class="text-muted text-sm">Manage inventory purchase cycles</p>
              </div>
            </div>
          </router-link>
        </div>
      </div>
      
    </div>
  `,
  data() {
    return {
      MerchantID: this.$route.params.MerchantID,
      merchant: null,
      loading: true,
      error: null
    };
  },
  mounted() {
    this.fetchMerchant();
  },
  methods: {
    async fetchMerchant() {
      this.loading = true;
      const token = localStorage.getItem('token');
      if (!token) return this.$router.push('/login');

      const query = `query GetMerchant($MerchantID: Int!) { merchant(MerchantID: $MerchantID) { MerchantID Name GSTIN Contact Category Status } }`;
      
      try {
        const data = await graphqlRequest(query, { MerchantID: parseInt(this.MerchantID) }, token);
        this.merchant = data.merchant;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdminMerchantDashboard;
}
