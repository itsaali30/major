// Forgot Password Component
const ForgotPassword = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-warning text-dark">
              <h4 class="mb-0"><i class="bi bi-key"></i> Forgot Password</h4>
            </div>
            <div class="card-body">
              <!-- Step 1: Send OTP -->
              <div v-if="step === 1">
                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                <div v-if="success" class="alert alert-success">{{ success }}</div>
                <p class="text-muted">Enter your email or mobile to receive OTP</p>
                <form @submit.prevent="sendOTP">
                  <div class="mb-3">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" v-model="form.Email" placeholder="Enter your email">
                  </div>
                  <div class="text-center mb-3"><span class="text-muted">- OR -</span></div>
                  <div class="mb-3">
                    <label class="form-label">Mobile</label>
                    <input type="tel" class="form-control" v-model="form.Mobile" placeholder="Enter your mobile">
                  </div>
                  <button type="submit" class="btn btn-warning w-100" :disabled="loading || (!form.Email && !form.Mobile)">
                    <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                    {{ loading ? 'Sending...' : 'Send OTP' }}
                  </button>
                </form>
              </div>

              <!-- Step 2: Verify OTP -->
              <div v-if="step === 2">
                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                <div v-if="success" class="alert alert-success">{{ success }}</div>
                <div class="alert alert-info">
                  <i class="bi bi-info-circle"></i> OTP sent to: <strong>{{ form.Email || form.Mobile }}</strong>
                  <br><small class="text-muted">(Check console for OTP)</small>
                </div>
                <form @submit.prevent="verifyOTP">
                  <div class="mb-3">
                    <label class="form-label">Enter OTP</label>
                    <input type="text" class="form-control text-center" v-model="form.otp" placeholder="Enter 6-digit OTP" maxlength="6" style="font-size: 1.5rem; letter-spacing: 0.5rem;">
                  </div>
                  <button type="submit" class="btn btn-primary w-100 mb-2" :disabled="loading || form.otp.length < 4">
                    <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                    {{ loading ? 'Verifying...' : 'Verify OTP' }}
                  </button>
                  <button type="button" class="btn btn-link w-100" @click="step = 1; form.otp = ''; error = null;">
                    <i class="bi bi-arrow-left"></i> Back
                  </button>
                </form>
              </div>

              <!-- Step 3: Reset Password -->
              <div v-if="step === 3">
                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                <div v-if="success" class="alert alert-success">{{ success }}</div>
                <form @submit.prevent="resetPassword">
                  <div class="mb-3">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-control" v-model="form.newPassword" placeholder="Enter new password">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" v-model="form.confirmPassword" placeholder="Confirm new password">
                  </div>
                  <button type="submit" class="btn btn-success w-100" :disabled="loading || !form.newPassword || !form.confirmPassword">
                    <span v-if="loading" class="spinner-border spinner-border-sm"></span>
                    {{ loading ? 'Resetting...' : 'Reset Password' }}
                  </button>
                </form>
              </div>

              <p class="text-center mt-3">
                <router-link to="/login">Back to Login</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      step: 1,
      form: {
        Email: '',
        Mobile: '',
        otp: '',
        newPassword: '',
        confirmPassword: ''
      },
      loading: false,
      error: null,
      success: null,
      resetToken: null
    };
  },
  methods: {
    async sendOTP() {
      this.loading = true;
      this.error = null;
      this.success = null;

      if (!this.form.Email && !this.form.Mobile) {
        this.error = 'Please enter email or mobile';
        this.loading = false;
        return;
      }

      const mutation = `
        mutation ForgotPassword($Email: String, $Mobile: String) {
          forgotPassword(Email: $Email, Mobile: $Mobile) {
            success
            message
          }
        }
      `;

      const variables = {
        Email: this.form.Email || null,
        Mobile: this.form.Mobile || null
      };

      try {
        const data = await graphqlRequest(mutation, variables);
        if (data.forgotPassword.success) {
          this.success = data.forgotPassword.message;
          setTimeout(() => {
            this.step = 2;
            this.success = null;
          }, 1500);
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async verifyOTP() {
      this.loading = true;
      this.error = null;
      this.success = null;

      if (!this.form.otp) {
        this.error = 'Please enter OTP';
        this.loading = false;
        return;
      }

      const mutation = `
        mutation VerifyOTP($Email: String, $Mobile: String, $otp: String!) {
          verifyOTP(Email: $Email, Mobile: $Mobile, otp: $otp) {
            success
            message
            token
          }
        }
      `;

      const variables = {
        Email: this.form.Email || null,
        Mobile: this.form.Mobile || null,
        otp: this.form.otp
      };

      try {
        const data = await graphqlRequest(mutation, variables);
        if (data.verifyOTP.success) {
          this.resetToken = data.verifyOTP.token;
          this.success = data.verifyOTP.message;
          setTimeout(() => {
            this.step = 3;
            this.success = null;
          }, 1000);
        }
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    async resetPassword() {
      this.loading = true;
      this.error = null;
      this.success = null;

      if (this.form.newPassword !== this.form.confirmPassword) {
        this.error = 'Passwords do not match';
        this.loading = false;
        return;
      }

      if (this.form.newPassword.length < 6) {
        this.error = 'Password must be at least 6 characters';
        this.loading = false;
        return;
      }

      const mutation = `
        mutation ResetPassword($token: String!, $newPassword: String!) {
          resetPassword(token: $token, newPassword: $newPassword) {
            success
            message
          }
        }
      `;

      const variables = {
        token: this.resetToken,
        newPassword: this.form.newPassword
      };

      try {
        const data = await graphqlRequest(mutation, variables);
        if (data.resetPassword.success) {
          this.success = data.resetPassword.message;
          setTimeout(() => {
            this.$router.push('/login');
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
  module.exports = ForgotPassword;
}
