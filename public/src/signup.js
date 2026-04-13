// Signup Component
const Signup = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h4 class="mb-0"><i class="bi bi-person-plus"></i> Sign Up</h4>
            </div>
            <div class="card-body">
              <div v-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-if="success" class="alert alert-success">{{ success }}</div>
              <form @submit.prevent="handleSignup">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">First Name</label>
                    <input type="text" class="form-control" v-model="form.UserNameFirst" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Last Name</label>
                    <input type="text" class="form-control" v-model="form.UserNameLast" required>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Date of Birth</label>
                    <input type="date" class="form-control" v-model="form.DOB" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Gender</label>
                    <select class="form-select" v-model="form.Gender" required>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" v-model="form.Email" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Mobile</label>
                  <input type="tel" class="form-control" v-model="form.Mobile" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" v-model="form.Password" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Role</label>
                  <select class="form-select" v-model="form.Role">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <optgroup label="Operations">
                      <option value="manager">Manager</option>
                      <option value="incharge">Incharge</option>
                      <option value="putter">Putter</option>
                      <option value="picker">Picker</option>
                    </optgroup>
                    <optgroup label="Accounts">
                      <option value="accountmanager">Account Manager</option>
                      <option value="accountant">Accountant</option>
                      <option value="audit">Audit</option>
                      <option value="purchase">Purchase</option>
                    </optgroup>
                    <optgroup label="Logistics">
                      <option value="cluster">Cluster Manager</option>
                      <option value="feltmanager">Felt Manager</option>
                      <option value="rider">Rider</option>
                      <option value="coach">Coach</option>
                    </optgroup>
                  </select>
                </div>
                <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="loading">
                  <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                  {{ loading ? 'Creating Account...' : 'Sign Up' }}
                </button>
              </form>
              <div class="text-center mb-3"><span class="text-muted">or</span></div>
              <div class="d-flex justify-content-center mb-3"><div id="googleSignUpButton"></div></div>
              <p class="text-center mt-3">Already have an account? <router-link to="/login">Login</router-link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      form: { UserNameFirst: '', UserNameLast: '', DOB: '', Gender: '', Email: '', Mobile: '', Password: '', Role: 'user' },
      loading: false, error: null, success: null
    };
  },
  mounted() { this.initGoogleButton(); },
  methods: {
    initGoogleButton() {
      if (window.google && window.google.accounts) {
        this.renderGoogleButton();
      } else {
        window.addEventListener('load', () => setTimeout(() => this.renderGoogleButton(), 500));
      }
    },
    renderGoogleButton() {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: '329273265898-s22m326kd3flkr7kbaehskfpudfg7ori.apps.googleusercontent.com',
          callback: this.handleGoogleResponse
        });
        window.google.accounts.id.renderButton(document.getElementById('googleSignUpButton'), { theme: 'outline', size: 'large', width: '100%' });
      }
    },
    async handleGoogleResponse(response) {
      this.error = null; this.success = null;
      const credential = response.credential;
      const payload = JSON.parse(atob(credential.split('.')[1]));
      const mutation = `mutation GoogleAuth($token: String!, $Email: String!, $name: String!, $GoogleID: String!, $picture: String) { googleAuth(token: $token, Email: $Email, name: $name, GoogleID: $GoogleID, picture: $picture) { token user { UserID UserNameFirst UserNameLast Email Role GoogleID Mobile } } }`;
      const variables = { token: credential, Email: payload.email, name: payload.name, GoogleID: payload.sub, picture: payload.picture };
      try {
        const data = await graphqlRequest(mutation, variables);
        if (!data.googleAuth.user.GoogleID) { this.error = 'Sign up failed. Please try again.'; return; }
        localStorage.setItem('token', data.googleAuth.token);
        localStorage.setItem('user', JSON.stringify(data.googleAuth.user));
        this.$root.updateAuthState();
        if (!data.googleAuth.user.Mobile) { this.$root.showMobileModal = true; this.$root.mobileModalInstance.show(); }
        this.success = 'Account created successfully! Redirecting...';
        setTimeout(() => this.$router.push('/profile'), 1500);
      } catch (err) { this.error = err.message; }
    },
    async handleSignup() {
      this.loading = true; this.error = null; this.success = null;
      const mutation = `mutation Signup($UserNameFirst: String!, $UserNameLast: String!, $DOB: String!, $Gender: String!, $Email: String!, $Mobile: String!, $Password: String!, $Role: String) { signup(UserNameFirst: $UserNameFirst, UserNameLast: $UserNameLast, DOB: $DOB, Gender: $Gender, Email: $Email, Mobile: $Mobile, Password: $Password, Role: $Role) { token user { UserID UserNameFirst UserNameLast Email Role } } }`;
      try {
        const data = await graphqlRequest(mutation, this.form);
        
        // Check if role requires approval - show pending message
        if (this.form.Role !== 'user') {
          this.success = `${this.form.Role.charAt(0).toUpperCase() + this.form.Role.slice(1)} account created successfully! Your account is pending approval from an authorized manager/admin. You will be able to login once approved.`;
          this.form = { UserNameFirst: '', UserNameLast: '', DOB: '', Gender: '', Email: '', Mobile: '', Password: '', Role: 'user' };
          setTimeout(() => this.$router.push('/login'), 3000);
          return;
        }
        
        localStorage.setItem('token', data.signup.token);
        localStorage.setItem('user', JSON.stringify(data.signup.user));
        this.$root.updateAuthState();
        this.success = 'Account created successfully! Redirecting...';
        setTimeout(() => this.$router.push('/profile'), 1500);
      } catch (err) { this.error = err.message; }
      finally { this.loading = false; }
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Signup;
}
