// WMS Handheld Web App Engine (Vue 3)
const { createApp, ref, reactive, onMounted, computed, nextTick } = Vue;

const app = createApp({
  setup() {
    // Auth & User State
    const isLoggedIn = ref(false);
    const user = ref({});
    const duty = reactive({ duty: 'OFF', onBreak: false, slot: null, punchInTime: null, requiresCode: false, dutyId: null });
    const isLoggingIn = ref(false);
    const loginError = ref(null);
    const loginForm = reactive({ login: '', password: '' });

    // Auth Switch Modes: 'login' | 'signup' | 'forgot'
    const authMode = ref('login');
    const signUpForm = reactive({ firstName: '', lastName: '', mobile: '', email: '', password: '', role: 'picker' });
    const forgotForm = reactive({ login: '', newPassword: '' });
    const authError = ref(null);
    const isSubmittingAuth = ref(false);

    // 4-Digit Duty Approval Code State
    const showDutyCodeModal = ref(false);
    const dutyVerificationCode = ref('');
    const dutyCodeError = ref(null);
    const isVerifyingCode = ref(false);

    // Navigation & Tabs
    const currentTab = ref('picker');
    const isSocketConnected = ref(false);
    const toastMessage = ref(null);
    const toastType = ref('success');

    // Modals
    const showPunchInModal = ref(false);
    const punchInForm = reactive({ slot: 'General', selfieFile: null });
    const selfiePreview = ref(null);
    const showCameraModal = ref(false);
    let html5QrCode = null;
    let cameraTargetItem = null;

    // 1. Picker State
    const pickerMode = ref('outbound');
    const pickerTask = ref(null);
    const scanInputs = reactive({});
    const returnPickList = ref([]);

    // 2. Put-away State
    const putterTab = ref('dock');
    const putawayTasks = ref([]);
    const reversePutawayList = ref([]);

    // 3. Inward State
    const purchaseOrders = ref([]);

    // 4. Packer State
    const ordersToPack = ref([]);
    const verifiedPackItems = reactive({});
    const packForms = reactive({});

    // 5. Manager State
    const floorStats = ref({ staff: [], summary: {}, staffCount: {} });
    const discrepancies = ref([]);
    const showRtvModal = ref(false);
    const rtvForm = reactive({
      vendorName: 'Amul Dairy Products Ltd',
      transporterName: 'Safexpress Logistics',
      vehicleNumber: 'UP-16-CD-9988',
      driverName: 'Ramesh Yadav',
      driverContact: '+91 98765 00000'
    });
    const generatedGatepass = ref(null);

    // 6. Audit Trail State
    const auditLogs = ref([]);

    // Toast Notification helper
    function showToast(msg, type = 'success') {
      toastMessage.value = msg;
      toastType.value = type;
      API.playBeep(type === 'success');
      setTimeout(() => {
        if (toastMessage.value === msg) toastMessage.value = null;
      }, 4000);
    }

    // Role Badge Helper
    function getRoleBadgeClass(role) {
      const r = (role || '').toLowerCase();
      if (['manager', 'floorlead', 'supervisor'].includes(r)) return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      if (['picker'].includes(r)) return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      if (['putter', 'putaway', 'staging'].includes(r)) return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      if (['inward', 'receiving'].includes(r)) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      if (['packer', 'sorter'].includes(r)) return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      return 'bg-slate-800 text-slate-300';
    }

    // Permissions check
    function canAccess(targetRole) {
      if (!isLoggedIn.value) return false;
      const r = (user.value.role || '').toLowerCase();
      if (['superadmin', 'admin', 'manager', 'floorlead'].includes(r)) return true;
      if (targetRole === 'picker' && r === 'picker') return true;
      if (targetRole === 'putter' && ['putter', 'putaway', 'staging'].includes(r)) return true;
      if (targetRole === 'inward' && ['inward', 'receiving'].includes(r)) return true;
      if (targetRole === 'packer' && ['packer', 'sorter'].includes(r)) return true;
      return false;
    }

    // Socket.io initialization
    let socket = null;
    function initWebSocket() {
      try {
        socket = io();

        socket.on('connect', () => {
          isSocketConnected.value = true;
          if (user.value.userId) {
            socket.emit('join', { userId: user.value.userId, role: user.value.role });
          }
        });

        socket.on('disconnect', () => {
          isSocketConnected.value = false;
        });

        // Real-time Order Assignment to Picker
        socket.on('order:assigned', (data) => {
          showToast(`⚡ Order #${data.orderId} auto-assigned!`, 'success');
          fetchPickerTask();
        });

        // Packer notification
        socket.on('wms:order_ready_for_packing', (data) => {
          showToast(data.message, 'success');
          fetchPackerOrders();
        });

        // Manager floor events
        socket.on('wms:attendance_update', () => {
          if (currentTab.value === 'manager') fetchFloorStatus();
        });

        socket.on('wms:duty_status_change', () => {
          if (currentTab.value === 'manager') fetchFloorStatus();
        });

        socket.on('wms:discrepancy_reported', (data) => {
          showToast(`⚠️ Discrepancy Ticket #${data.ticketId} reported!`, 'error');
          if (currentTab.value === 'manager') fetchDiscrepancies();
        });
      } catch (e) {
        console.warn('Socket error:', e);
      }
    }

    // Authentication
    async function checkAuth() {
      const token = API.getToken();
      if (!token) return;

      try {
        const res = await API.request('/api/auth/me');
        if (res.success) {
          isLoggedIn.value = true;
          user.value = res.user;
          Object.assign(duty, res.duty || {});
          setDefaultTabForRole(user.value.role);
          if (socket && socket.connected) {
            socket.emit('join', { userId: user.value.userId, role: user.value.role });
          }
          loadTabContent();
        }
      } catch (err) {
        API.setToken(null);
        API.setUser(null);
      }
    }

    function setDefaultTabForRole(role) {
      const r = (role || '').toLowerCase();
      if (r === 'picker') currentTab.value = 'picker';
      else if (['putter', 'putaway', 'staging'].includes(r)) currentTab.value = 'putter';
      else if (['inward', 'receiving'].includes(r)) currentTab.value = 'inward';
      else if (['packer', 'sorter'].includes(r)) currentTab.value = 'packer';
      else currentTab.value = 'manager';
    }

    async function login() {
      isLoggingIn.value = true;
      loginError.value = null;
      try {
        const res = await API.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginForm)
        });

        if (res.success) {
          API.setToken(res.token);
          API.setUser(res.user);
          user.value = res.user;
          Object.assign(duty, res.duty || {});
          isLoggedIn.value = true;
          setDefaultTabForRole(user.value.role);

          if (socket) {
            socket.emit('join', { userId: user.value.userId, role: user.value.role });
          }
          showToast(`Welcome ${user.value.name}! Terminal active.`);
          loadTabContent();
        }
      } catch (err) {
        loginError.value = err.message;
        API.playBeep(false);
      } finally {
        isLoggingIn.value = false;
      }
    }

    function quickLogin(role) {
      const demoAccounts = {
        picker: { login: '9985699757', password: 'password123' },
        putter: { login: '9985699757', password: 'password123' },
        inward: { login: '9985699757', password: 'password123' },
        packer: { login: '9985699757', password: 'password123' },
        manager: { login: '9985699757', password: 'admin123' }
      };
      const acc = demoAccounts[role] || demoAccounts.picker;
      loginForm.login = acc.login;
      loginForm.password = acc.password;
      login();
    }

    function logout() {
      API.setToken(null);
      API.setUser(null);
      isLoggedIn.value = false;
      user.value = {};
      authMode.value = 'login';
      showToast('Logged out from WMS Terminal.');
    }

    // Sign Up & Forgot Password Methods
    async function submitSignUp() {
      isSubmittingAuth.value = true;
      authError.value = null;
      try {
        const res = await API.request('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify(signUpForm)
        });

        if (res.success) {
          API.setToken(res.token);
          API.setUser(res.user);
          user.value = res.user;
          Object.assign(duty, res.duty || {});
          isLoggedIn.value = true;
          setDefaultTabForRole(user.value.role);

          if (socket) {
            socket.emit('join', { userId: user.value.userId, role: user.value.role });
          }
          showToast(`Welcome ${user.value.name}! Staff account created.`);
          loadTabContent();
        }
      } catch (err) {
        authError.value = err.message;
        API.playBeep(false);
      } finally {
        isSubmittingAuth.value = false;
      }
    }

    async function submitForgotPassword() {
      isSubmittingAuth.value = true;
      authError.value = null;
      try {
        const res = await API.request('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify(forgotForm)
        });

        if (res.success) {
          showToast(res.message);
          loginForm.login = forgotForm.login;
          authMode.value = 'login';
        }
      } catch (err) {
        authError.value = err.message;
        API.playBeep(false);
      } finally {
        isSubmittingAuth.value = false;
      }
    }

    // Attendance & Duty Handlers
    function openPunchInModal() {
      showPunchInModal.value = true;
      selfiePreview.value = null;
      punchInForm.selfieFile = null;
    }

    function openDutyCodeModal() {
      showDutyCodeModal.value = true;
      dutyVerificationCode.value = '';
      dutyCodeError.value = null;
    }

    async function submitDutyCodeVerification() {
      if (!dutyVerificationCode.value || dutyVerificationCode.value.length < 4) {
        dutyCodeError.value = 'Please enter 4-digit approval code';
        return;
      }
      isVerifyingCode.value = true;
      dutyCodeError.value = null;

      try {
        const res = await API.request('/api/auth/verify-duty-code', {
          method: 'POST',
          body: JSON.stringify({
            code: dutyVerificationCode.value,
            dutyId: duty.dutyId
          })
        });

        if (res.success && res.verified) {
          Object.assign(duty, res.duty);
          showDutyCodeModal.value = false;
          showToast(res.message, 'success');
          API.playBeep(true);
          if (canAccess('picker')) fetchPickerTask();
        }
      } catch (err) {
        dutyCodeError.value = err.message;
        API.playBeep(false);
      } finally {
        isVerifyingCode.value = false;
      }
    }

    function onSelfieSelected(e) {
      const file = e.target.files[0];
      if (file) {
        punchInForm.selfieFile = file;
        const reader = new FileReader();
        reader.onload = (evt) => { selfiePreview.value = evt.target.result; };
        reader.readAsDataURL(file);
      }
    }

    async function submitPunchIn() {
      try {
        const formData = new FormData();
        formData.append('slot', punchInForm.slot);
        if (punchInForm.selfieFile) {
          formData.append('selfie', punchInForm.selfieFile);
        }

        const res = await API.request('/api/auth/punch-in', {
          method: 'POST',
          body: formData
        });

        if (res.success) {
          Object.assign(duty, res.duty);
          showPunchInModal.value = false;
          showToast(res.message, 'success');
          // Open 4-digit code prompt immediately
          openDutyCodeModal();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function punchOut() {
      if (!confirm('Kya aap sure hain punch-out karne ke liye? Duty OFF ho jayegi.')) return;
      try {
        const res = await API.request('/api/auth/punch-out', { method: 'POST' });
        if (res.success) {
          Object.assign(duty, res.duty);
          showToast(res.message);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function toggleBreak() {
      try {
        if (!duty.onBreak) {
          const res = await API.request('/api/auth/break-start', {
            method: 'POST',
            body: JSON.stringify({ breakType: 'Tea (15m)' })
          });
          Object.assign(duty, res.duty);
          showToast('Break started (15m Tea)');
        } else {
          const res = await API.request('/api/auth/break-end', { method: 'POST' });
          Object.assign(duty, res.duty);
          showToast('Break ended. Duty resumed!');
          if (canAccess('picker')) fetchPickerTask();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function toggleDuty() {
      const nextStatus = duty.duty === 'ON' ? 'OFF' : 'ON';
      try {
        const res = await API.request('/api/auth/duty-toggle', {
          method: 'POST',
          body: JSON.stringify({ status: nextStatus })
        });
        Object.assign(duty, res.duty);
        showToast(res.message);
        if (duty.duty === 'ON' && canAccess('picker')) {
          fetchPickerTask();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 1. PICKER WORKFLOWS
    // =========================================================
    async function fetchPickerTask() {
      try {
        const res = await API.request('/api/picker/active-task');
        pickerTask.value = res.activeTask || null;
        if (pickerMode.value === 'returns') {
          fetchReturnTasks();
        }
      } catch (err) {
        console.warn('Picker task fetch error:', err.message);
      }
    }

    async function scanPickItem(item) {
      const code = scanInputs[item.itemId];
      if (!code) {
        showToast('Please enter or scan barcode', 'error');
        return;
      }

      try {
        const res = await API.request('/api/picker/scan-item', {
          method: 'POST',
          body: JSON.stringify({
            itemId: item.itemId,
            scannedBarcode: code,
            durationSeconds: 70
          })
        });

        if (res.success && res.matched) {
          showToast(res.message, 'success');
          scanInputs[item.itemId] = '';
          fetchPickerTask();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function completePickOrder() {
      if (!pickerTask.value) return;
      try {
        const res = await API.request('/api/picker/complete-pick', {
          method: 'POST',
          body: JSON.stringify({ pickListId: pickerTask.value.pickListId })
        });

        if (res.success) {
          showToast(res.message, 'success');
          pickerTask.value = null;
          // Trigger next task fetch
          setTimeout(fetchPickerTask, 800);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function fetchReturnTasks() {
      try {
        const res = await API.request('/api/picker/return-tasks');
        returnPickList.value = res.returns || [];
      } catch (e) {}
    }

    async function confirmReturnPick(ret) {
      if (!ret.scannedBin) {
        showToast('Please scan bin barcode', 'error');
        return;
      }
      try {
        const res = await API.request('/api/picker/pick-return', {
          method: 'POST',
          body: JSON.stringify({ returnId: ret.returnId, scannedBinBarcode: ret.scannedBin })
        });
        showToast(res.message, 'success');
        returnPickList.value = returnPickList.value.filter(r => r.returnId !== ret.returnId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 2. PUT-AWAY WORKFLOWS
    // =========================================================
    async function fetchPutawayTasks() {
      try {
        const res = await API.request('/api/putaway/dock-tasks');
        putawayTasks.value = res.tasks || [];
        const rev = await API.request('/api/putaway/reverse-tasks');
        reversePutawayList.value = rev.tasks || [];
      } catch (e) {}
    }

    async function verifyPutawayBin(task) {
      if (!task.scannedBinInput) {
        showToast('Scan Bin barcode first', 'error');
        return;
      }
      try {
        const res = await API.request('/api/putaway/scan-bin', {
          method: 'POST',
          body: JSON.stringify({
            taskId: task.taskId,
            scannedBinBarcode: task.scannedBinInput,
            suggestedBin: task.suggestedBin
          })
        });

        if (res.success) {
          task.binVerified = true;
          showToast(res.message, 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function confirmPutawayPlacement(task) {
      if (!task.scannedItemInput) {
        showToast('Scan Item barcode to confirm placement', 'error');
        return;
      }
      try {
        const res = await API.request('/api/putaway/confirm-placement', {
          method: 'POST',
          body: JSON.stringify({
            taskId: task.taskId,
            scannedItemBarcode: task.scannedItemInput,
            scannedBin: task.scannedBinInput,
            quantity: task.quantity
          })
        });

        if (res.success) {
          showToast(res.message, 'success');
          putawayTasks.value = putawayTasks.value.filter(t => t.taskId !== task.taskId);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function confirmReverseRestock(rev) {
      if (!rev.scannedBin) {
        showToast('Scan target bin barcode', 'error');
        return;
      }
      try {
        const res = await API.request('/api/putaway/reverse-confirm', {
          method: 'POST',
          body: JSON.stringify({ taskId: rev.taskId, binBarcode: rev.scannedBin })
        });
        showToast(res.message, 'success');
        reversePutawayList.value = reversePutawayList.value.filter(r => r.taskId !== rev.taskId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 3. INWARD / RECEIVING WORKFLOWS
    // =========================================================
    async function fetchPurchaseOrders() {
      try {
        const res = await API.request('/api/inward/purchase-orders');
        purchaseOrders.value = res.purchaseOrders || [];
      } catch (e) {}
    }

    async function receivePO(po) {
      if (!po.receivedInput) {
        showToast('Please enter received carton count', 'error');
        return;
      }
      try {
        const res = await API.request('/api/inward/receive-po', {
          method: 'POST',
          body: JSON.stringify({
            poNumber: po.poNumber,
            truckNumber: po.truckNumber,
            receivedCartons: po.receivedInput,
            expectedCartons: po.expectedCartons
          })
        });
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function openDamageModal(po) {
      const poNum = po?.poNumber || 'PO-2026-0091';
      const sku = prompt('Enter Damaged SKU:', 'AMUL-TAAZA-1L');
      if (!sku) return;
      const qty = prompt('Enter Damaged Qty:', '2');
      if (!qty) return;

      // Submit damage report
      API.request('/api/inward/flag-damage', {
        method: 'POST',
        body: JSON.stringify({
          poNumber: poNum,
          sku,
          quantity: qty,
          damageType: 'LEAKAGE / CRATE_DAMAGE',
          remarks: 'Damage flagged on Inward dock unloading'
        })
      }).then(res => {
        showToast(res.message, 'success');
      }).catch(err => {
        showToast(err.message, 'error');
      });
    }

    async function generatePalletTag(po) {
      try {
        const res = await API.request('/api/inward/generate-pallet-tag', {
          method: 'POST',
          body: JSON.stringify({
            poNumber: po.poNumber,
            quantity: po.expectedCartons,
            stagingBay: 'STAGING-BAY-A'
          })
        });
        showToast(res.message, 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 4. PACKER WORKFLOWS
    // =========================================================
    async function fetchPackerOrders() {
      try {
        const res = await API.request('/api/packer/orders-to-pack');
        ordersToPack.value = res.orders || [];
        // init pack forms
        ordersToPack.value.forEach(o => {
          if (!packForms[o.orderId]) {
            packForms[o.orderId] = {
              sealBarcode: `SEAL-${o.orderId}-${Math.floor(1000 + Math.random() * 9000)}`,
              actualWeight: o.expectedWeightKg,
              handoverBay: 'BAY-DISPATCH-01'
            };
          }
        });
      } catch (e) {}
    }

    async function verifyPackItem(orderId, sku) {
      try {
        const res = await API.request('/api/packer/verify-item', {
          method: 'POST',
          body: JSON.stringify({ orderId, scannedBarcode: sku })
        });
        if (res.success) {
          verifiedPackItems[orderId + '_' + sku] = true;
          showToast(res.message, 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function sealAndHandover(orderId) {
      const form = packForms[orderId];
      if (!form || !form.sealBarcode) {
        showToast('Scan or enter Seal barcode', 'error');
        return;
      }

      try {
        const res = await API.request('/api/packer/seal-bag', {
          method: 'POST',
          body: JSON.stringify({
            orderId,
            sealBarcode: form.sealBarcode,
            actualWeightKg: form.actualWeight,
            handoverBay: form.handoverBay
          })
        });

        if (res.success) {
          showToast(res.message, 'success');
          ordersToPack.value = ordersToPack.value.filter(o => o.orderId !== orderId);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 5. MANAGER WORKFLOWS
    // =========================================================
    async function fetchFloorStatus() {
      try {
        const res = await API.request('/api/manager/floor-status');
        floorStats.value = res;
      } catch (e) {}
    }

    async function triggerManagerAutoAssign() {
      try {
        const res = await API.request('/api/manager/trigger-auto-assign', { method: 'POST' });
        showToast(`Auto-Assign executed: ${res.result?.message || 'Updated'}`);
        fetchFloorStatus();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    async function fetchDiscrepancies() {
      try {
        const res = await API.request('/api/manager/discrepancies');
        discrepancies.value = res.discrepancies || [];
      } catch (e) {}
    }

    async function resolveDiscrepancy(ticketId, action) {
      try {
        const res = await API.request('/api/manager/resolve-discrepancy', {
          method: 'POST',
          body: JSON.stringify({ ticketId, action, notes: 'Reviewed and approved by Floor Lead' })
        });
        showToast(res.message, 'success');
        fetchDiscrepancies();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    function openRtvModal() {
      showRtvModal.value = true;
      generatedGatepass.value = null;
    }

    async function submitRtvGatepass() {
      try {
        const res = await API.request('/api/manager/generate-rtv-gatepass', {
          method: 'POST',
          body: JSON.stringify(rtvForm)
        });
        if (res.success) {
          generatedGatepass.value = res.gatepass;
          showToast(res.message, 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // =========================================================
    // 6. AUDIT TRAIL
    // =========================================================
    async function fetchAuditLogs() {
      try {
        const res = await API.request('/api/audit/logs?limit=50');
        auditLogs.value = res.logs || [];
      } catch (e) {}
    }

    // Load content for active tab
    function loadTabContent() {
      if (currentTab.value === 'picker') fetchPickerTask();
      else if (currentTab.value === 'putter') fetchPutawayTasks();
      else if (currentTab.value === 'inward') fetchPurchaseOrders();
      else if (currentTab.value === 'packer') fetchPackerOrders();
      else if (currentTab.value === 'manager') {
        fetchFloorStatus();
        fetchDiscrepancies();
      } else if (currentTab.value === 'audit') fetchAuditLogs();
    }

    // Camera Scanner Handling
    function openCameraScanner(item) {
      cameraTargetItem = item;
      showCameraModal.value = true;
      nextTick(() => {
        try {
          html5QrCode = new Html5Qrcode('reader');
          html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 180 } },
            (decodedText) => {
              if (cameraTargetItem) {
                scanInputs[cameraTargetItem.itemId] = decodedText;
                closeCameraScanner();
                scanPickItem(cameraTargetItem);
              }
            },
            () => {}
          );
        } catch (e) {
          console.warn('Camera error:', e);
        }
      });
    }

    function closeCameraScanner() {
      if (html5QrCode) {
        try { html5QrCode.stop().then(() => html5QrCode.clear()); } catch (e) {}
        html5QrCode = null;
      }
      showCameraModal.value = false;
      cameraTargetItem = null;
    }

    // Hardware Laser Barcode Scanner listener
    let barcodeBuffer = '';
    let lastKeyTime = 0;
    window.addEventListener('keydown', (e) => {
      // If hardware scanner fires keypresses fast (<40ms)
      const now = Date.now();
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          // Hardware scan completed
          const scanned = barcodeBuffer;
          barcodeBuffer = '';
          API.playBeep(true);
          // If in picker view, try matching top item
          if (currentTab.value === 'picker' && pickerTask.value) {
            const firstUnpicked = pickerTask.value.items.find(i => i.status !== 'PICKED');
            if (firstUnpicked) {
              scanInputs[firstUnpicked.itemId] = scanned;
              scanPickItem(firstUnpicked);
            }
          }
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        if (now - lastKeyTime > 150) barcodeBuffer = '';
        barcodeBuffer += e.key;
        lastKeyTime = now;
      }
    });

    onMounted(() => {
      initWebSocket();
      checkAuth();
    });

    return {
      isLoggedIn,
      user,
      duty,
      isLoggingIn,
      loginError,
      loginForm,
      authMode,
      signUpForm,
      forgotForm,
      authError,
      isSubmittingAuth,
      submitSignUp,
      submitForgotPassword,
      showDutyCodeModal,
      dutyVerificationCode,
      dutyCodeError,
      isVerifyingCode,
      openDutyCodeModal,
      submitDutyCodeVerification,
      currentTab,
      isSocketConnected,
      toastMessage,
      toastType,
      showPunchInModal,
      punchInForm,
      selfiePreview,
      showCameraModal,
      pickerMode,
      pickerTask,
      scanInputs,
      returnPickList,
      putterTab,
      putawayTasks,
      reversePutawayList,
      purchaseOrders,
      ordersToPack,
      verifiedPackItems,
      packForms,
      floorStats,
      discrepancies,
      showRtvModal,
      rtvForm,
      generatedGatepass,
      auditLogs,
      login,
      quickLogin,
      logout,
      canAccess,
      getRoleBadgeClass,
      openPunchInModal,
      onSelfieSelected,
      submitPunchIn,
      punchOut,
      toggleBreak,
      toggleDuty,
      fetchPickerTask,
      scanPickItem,
      completePickOrder,
      confirmReturnPick,
      verifyPutawayBin,
      confirmPutawayPlacement,
      confirmReverseRestock,
      receivePO,
      openDamageModal,
      generatePalletTag,
      verifyPackItem,
      sealAndHandover,
      fetchFloorStatus,
      triggerManagerAutoAssign,
      resolveDiscrepancy,
      openRtvModal,
      submitRtvGatepass,
      fetchAuditLogs,
      openCameraScanner,
      closeCameraScanner
    };
  }
});

app.mount('#app');
