// Login Component
const Login = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h4 class="mb-0"><i class="bi bi-box-arrow-in-right"></i> Login</h4>
            </div>
            <div class="card-body">
              <div v-if="error" class="alert alert-danger">{{ error }}</div>
              <form @submit.prevent="handleLogin">
                <div class="mb-3">
                  <label class="form-label">Mobile</label>
                  <input type="tel" class="form-control" v-model="form.Mobile" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" v-model="form.Password" required>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <router-link to="/forgot-password" class="text-decoration-none small">Forgot Password?</router-link>
                </div>
                <button type="submit" class="btn btn-success w-100 mb-3" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                  {{ loading ? 'Logging in...' : 'Login' }}
                </button>
              </form>
              <div class="text-center mb-3"><span class="text-muted">or</span></div>
              <div class="d-flex justify-content-center mb-3"><div id="googleSignInButton"></div></div>
              <p class="text-center mt-3">Don't have an account? <router-link to="/signup">Sign Up</router-link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() { return { form: { Mobile: '', Password: '' }, loading: false, error: null }; },
  mounted() { this.initGoogleButton(); },
  methods: {
    initGoogleButton() {
      if (window.google && window.google.accounts) { this.renderGoogleButton(); }
      else { window.addEventListener('load', () => setTimeout(() => this.renderGoogleButton(), 500)); }
    },
    renderGoogleButton() {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({ client_id: '329273265898-s22m326kd3flkr7kbaehskfpudfg7ori.apps.googleusercontent.com', callback: this.handleGoogleResponse });
        window.google.accounts.id.renderButton(document.getElementById('googleSignInButton'), { theme: 'outline', size: 'large', width: '100%' });
      }
    },
    async handleGoogleResponse(response) {
      this.error = null;
      const credential = response.credential;
      const payload = JSON.parse(atob(credential.split('.')[1]));
      const mutation = `mutation GoogleAuth($token: String!, $Email: String!, $name: String!, $GoogleID: String!, $picture: String) { googleAuth(token: $token, Email: $Email, name: $name, GoogleID: $GoogleID, picture: $picture) { token user { UserID UserNameFirst UserNameLast Email Role GoogleID Mobile } } }`;
      const variables = { token: credential, Email: payload.email, name: payload.name, GoogleID: payload.sub, picture: payload.picture };
      try {
        const data = await graphqlRequest(mutation, variables);
        if (!data.googleAuth.user.GoogleID) { this.error = 'Login failed. Please try again or use regular login.'; return; }
        localStorage.setItem('token', data.googleAuth.token);
        localStorage.setItem('user', JSON.stringify(data.googleAuth.user));
        this.$root.updateAuthState();
        if (!data.googleAuth.user.Mobile) { this.$root.showMobileModal = true; this.$root.mobileModalInstance.show(); }
        this.$router.push('/profile');
      } catch (err) { this.error = err.message; }
    },
    async handleLogin() {
      this.loading = true; this.error = null;
      const mutation = `mutation Login($Mobile: String!, $Password: String!) { login(Mobile: $Mobile, Password: $Password) { token user { UserID UserNameFirst UserNameLast Email Role Mobile } } }`;
      try {
        const data = await graphqlRequest(mutation, this.form);
        localStorage.setItem('token', data.login.token);
        localStorage.setItem('user', JSON.stringify(data.login.user));
        this.$root.updateAuthState();
        if (!data.login.user.Mobile) { this.$root.showMobileModal = true; this.$root.mobileModalInstance.show(); }
        this.$router.push('/profile');
      } catch (err) { this.error = err.message; }
      finally { this.loading = false; }
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Login;
}
