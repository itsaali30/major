// Reset Password Component (for logged-in users)
const ResetPassword = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-info text-white">
              <h4 class="mb-0"><i class="bi bi-shield-lock"></i> Reset Password</h4>
            </div>
            <div class="card-body">
              <div v-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-if="success" class="alert alert-success">{{ success }}</div>
              
              <form @submit.prevent="resetPassword">
                <div class="mb-3">
                  <label class="form-label">Current Password</label>
                  <input type="password" class="form-control" v-model="form.currentPassword" placeholder="Enter current password" required>
                </div>
                <hr>
                <div class="mb-3">
                  <label class="form-label">New Password</label>
                  <input type="password" class="form-control" v-model="form.newPassword" placeholder="Enter new password" required>
                  <small class="text-muted">Minimum 6 characters</small>
                </div>
                <div class="mb-3">
                  <label class="form-label">Confirm New Password</label>
                  <input type="password" class="form-control" v-model="form.confirmPassword" placeholder="Confirm new password" required>
                </div>
                <button type="submit" class="btn btn-info w-100 text-white" :disabled="loading || !form.currentPassword || !form.newPassword || !form.confirmPassword">
                  <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                  {{ loading ? 'Updating...' : 'Update Password' }}
                </button>
              </form>

              <p class="text-center mt-3">
                <router-link to="/profile"><i class="bi bi-arrow-left"></i> Back to Profile</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      loading: false,
      error: null,
      success: null
    };
  },
  mounted() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.$router.push('/login');
    }
  },
  methods: {
    async resetPassword() {
      this.loading = true;
      this.error = null;
      this.success = null;

      // Validation
      if (this.form.newPassword !== this.form.confirmPassword) {
        this.error = 'New passwords do not match';
        this.loading = false;
        return;
      }

      if (this.form.newPassword.length < 6) {
        this.error = 'Password must be at least 6 characters';
        this.loading = false;
        return;
      }

      if (this.form.currentPassword === this.form.newPassword) {
        this.error = 'New password must be different from current password';
        this.loading = false;
        return;
      }

      const token = localStorage.getItem('token');
      const mutation = `
        mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
          changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
            success
            message
          }
        }
      `;

      const variables = {
        currentPassword: this.form.currentPassword,
        newPassword: this.form.newPassword
      };

      try {
        const data = await graphqlRequest(mutation, variables, token);
        if (data.changePassword.success) {
          this.success = data.changePassword.message;
          // Clear form
          this.form.currentPassword = '';
          this.form.newPassword = '';
          this.form.confirmPassword = '';
          setTimeout(() => {
            this.$router.push('/profile');
          }, 2000);
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResetPassword;
}
