// Profile Component
const Profile = {
  template: `
    <div class="container my-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0"><i class="bi bi-person-circle"></i> My Profile</h4>
              <div>
                <router-link to="/reset-password" class="btn btn-warning btn-sm me-2">
                  <i class="bi bi-shield-lock"></i> Reset Password
                </router-link>
                <button class="btn btn-light btn-sm" @click="editMode = !editMode">
                  <i class="bi bi-pencil"></i> {{ editMode ? 'Cancel' : 'Edit' }}
                </button>
              </div>
            </div>
            <div class="card-body">
              <div v-if="loading" class="text-center"><div class="spinner-border"></div></div>
              <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
              <div v-else-if="user">
                <!-- Profile Image Section -->
                <div class="text-center mb-4 position-relative">
                  <div class="profile-image-container mx-auto">
                    <img :src="user.ProfileImageUrl || 'https://via.placeholder.com/150'" 
                         class="rounded-circle img-thumbnail profile-img" 
                         alt="Profile Image">
                    <button class="btn btn-primary btn-sm rounded-circle position-absolute camera-btn"
                            @click="$refs.fileInput.click()"
                            title="Change Profile Image">
                      <i class="bi bi-camera"></i>
                    </button>
                  </div>
                  <input type="file" ref="fileInput" class="d-none" accept="image/*" @change="handleFileUpload">
                  <div v-if="uploading" class="mt-2 text-primary small">
                    <span class="spinner-border spinner-border-sm"></span> Uploading...
                  </div>
                  <div v-if="uploadError" class="mt-2 text-danger small">{{ uploadError }}</div>
                </div>

                <div v-if="!editMode">
                  <table class="table table-bordered">
                    <tbody>
                      <tr><th>ID</th><td>{{ user.UserID }}</td></tr>
                      <tr><th>First Name</th><td>{{ user.UserNameFirst }}</td></tr>
                      <tr><th>Last Name</th><td>{{ user.UserNameLast }}</td></tr>
                      <tr><th>Email</th><td>{{ user.Email }}</td></tr>
                      <tr><th>Mobile</th><td>{{ user.Mobile || 'Not set' }}</td></tr>
                      <tr><th>Date of Birth</th><td>{{ formatDate(user.DOB) }}</td></tr>
                      <tr><th>Gender</th><td>{{ user.Gender }}</td></tr>
                      <tr><th>Role</th><td><span class="badge" :class="user.Role === 'admin' ? 'bg-danger' : 'bg-primary'">{{ user.Role }}</span></td></tr>
                      <tr><th>Active</th><td><span class="badge" :class="user.IsActive ? 'bg-success' : 'bg-warning text-dark'">{{ user.IsActive ? 'Yes' : 'No' }}</span></td></tr>
                      <tr><th>Joined</th><td>{{ formatDate(user.CreatedAt) }}</td></tr>
                    </tbody>
                  </table>
                </div>
                <form v-else @submit.prevent="saveProfile">
                  <div v-if="saveError" class="alert alert-danger">{{ saveError }}</div>
                  <div v-if="saveSuccess" class="alert alert-success">{{ saveSuccess }}</div>
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label">First Name</label>
                      <input type="text" class="form-control" v-model="editForm.UserNameFirst">
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Last Name</label>
                      <input type="text" class="form-control" v-model="editForm.UserNameLast">
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Email</label>
                      <input type="email" class="form-control" v-model="editForm.Email">
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Mobile</label>
                      <input type="tel" class="form-control" v-model="editForm.Mobile">
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Date of Birth</label>
                      <input type="date" class="form-control" v-model="editForm.DOB">
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label">Gender</label>
                      <select class="form-select" v-model="editForm.Gender">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary" :disabled="saving">
                    <span v-if="saving" class="spinner-border spinner-border-sm"></span>
                    {{ saving ? 'Saving...' : 'Save Changes' }}
                  </button>
                </form>
                
                <hr class="my-5">
                
                <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded shadow-sm border-start border-4 border-info">
                  <div>
                    <h5 class="mb-1"><i class="bi bi-bank text-info"></i> Bank Accounts</h5>
                    <p class="text-muted mb-0 small">Manage your linked bank accounts for payouts and identity verification.</p>
                  </div>
                  <router-link to="/profile/bank" class="btn btn-outline-info">
                    Manage Accounts <i class="bi bi-chevron-right"></i>
                  </router-link>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded shadow-sm border-start border-4 border-primary">
                  <div>
                    <h5 class="mb-1"><i class="bi bi-file-earmark-text text-primary"></i> My Documents</h5>
                    <p class="text-muted mb-0 small">Manage your essential documents, IDs, and certificates.</p>
                  </div>
                  <router-link to="/profile/doc" class="btn btn-outline-primary">
                    Manage Documents <i class="bi bi-chevron-right"></i>
                  </router-link>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded shadow-sm border-start border-4 border-warning">
                  <div>
                    <h5 class="mb-1"><i class="bi bi-people text-warning"></i> Nominee Details</h5>
                    <p class="text-muted mb-0 small">Manage your nominee and emergency contact information.</p>
                  </div>
                  <router-link to="/profile/nominee" class="btn btn-outline-warning">
                    Manage Nominee <i class="bi bi-chevron-right"></i>
                  </router-link>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-0 p-3 bg-light rounded shadow-sm border-start border-4 border-success">
                  <div>
                    <h5 class="mb-1"><i class="bi bi-geo-alt text-success"></i> Location Change</h5>
                    <p class="text-muted mb-0 small">Request a transfer to a different warehouse or store location.</p>
                  </div>
                  <router-link to="/profile/change-location" class="btn btn-outline-success">
                    Request Change <i class="bi bi-chevron-right"></i>
                  </router-link>
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
      user: null, loading: true, error: null,
      editMode: false, saving: false, saveError: null, saveSuccess: null,
      editForm: { UserNameFirst: '', UserNameLast: '', Email: '', Mobile: '', DOB: '', Gender: '' },
      uploading: false, uploadError: null,
      
      uploading: false, uploadError: null
    };
  },
  computed: {
    isAdmin() {
      return this.user && ['superadmin', 'admin', 'accountmanager'].includes(this.user.Role);
    }
  },
  mounted() { this.fetchProfile(); },
  methods: {
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        this.uploadError = 'Image size must be less than 5MB';
        return;
      }

      this.uploading = true;
      this.uploadError = null;

      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      try {
        const response = await axios.post('/upload-profile-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          this.user.ProfileImageUrl = response.data.imageUrl;
          // Update stored user image as well
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          storedUser.ProfileImageUrl = response.data.imageUrl;
          localStorage.setItem('user', JSON.stringify(storedUser));
          this.saveSuccess = 'Image uploaded successfully!';
          setTimeout(() => this.saveSuccess = null, 3000);
        }
      } catch (err) {
        console.error('Upload Error:', err);
        const serverError = err.response?.data?.details || err.response?.data?.error || err.message;
        const errorCode = err.response?.data?.code ? ` (${err.response.data.code})` : '';
        this.uploadError = `Upload failed: ${serverError}${errorCode}`;
      } finally {
        this.uploading = false;
        // Reset file input
        event.target.value = '';
      }
    },
    async fetchProfile() {
      const token = localStorage.getItem('token');
      if (!token) { this.$router.push('/login'); return; }
      const query = `query { me { UserID UserNameFirst UserNameLast Email Mobile DOB Gender Role IsActive CreatedAt ProfileImageUrl } }`;
      try {
        const data = await graphqlRequest(query, {}, token);
        this.user = data.me;
        this.editForm = { ...data.me, DOB: data.me.DOB ? data.me.DOB.split('T')[0] : '' };
      } catch (err) {
        this.error = err.message;
        if (err.message.includes('authenticated')) {
          localStorage.removeItem('token'); localStorage.removeItem('user');
          this.$root.updateAuthState(); this.$router.push('/login');
        }
      } finally { this.loading = false; }
    },
    async saveProfile() {
      this.saving = true; this.saveError = null; this.saveSuccess = null;
      const token = localStorage.getItem('token');
      const mutation = `mutation UpdateMyProfile($UserNameFirst: String, $UserNameLast: String, $Email: String, $Mobile: String, $DOB: String, $Gender: String) { updateMyProfile(UserNameFirst: $UserNameFirst, UserNameLast: $UserNameLast, Email: $Email, Mobile: $Mobile, DOB: $DOB, Gender: $Gender) { UserID UserNameFirst UserNameLast Email Mobile DOB Gender Role IsActive ProfileImageUrl } }`;
      try {
        const data = await graphqlRequest(mutation, this.editForm, token);
        this.user = data.updateMyProfile;
        this.saveSuccess = 'Profile updated successfully!';
        this.editMode = false;
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.UserNameFirst = data.updateMyProfile.UserNameFirst;
        storedUser.UserNameLast = data.updateMyProfile.UserNameLast;
        localStorage.setItem('user', JSON.stringify(storedUser));
      } catch (err) { this.saveError = err.message; }
      finally { this.saving = false; }
    },
    formatDate(dateString) { 
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Profile;
}
