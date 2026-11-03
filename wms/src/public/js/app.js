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

    // 7. Worker Profile & Salary Notice Modals
    const showProfileModal = ref(false);
    const showSalaryNoticeModal = ref(false);
    const completedPickHandover = ref(null);

    // 8. Step 7: Transfer / Move State
    const transferTab = ref('internal'); // 'internal' | 'dispatch' | 'receive' | 'history'
    const inventoryItems = ref([]);
    const warehouseShelves = ref([]);
    const storesList = ref([]);
    const internalMoveForm = reactive({ variantId: '', sourceShelf: '', targetShelf: '', qty: 1, reason: 'Stock Relocation' });
    const storeDispatchForm = reactive({ toStoreId: '', variantId: '', qty: 10, transporter: 'Zepto Dark Logistics Fleet', vehicleNo: 'MH-04-AB-1234', sealNo: 'SEAL-8891', reason: 'Inter-Store Inventory Balancing' });
    const storeReceiveForm = reactive({ transferNo: '', sealNo: '', targetShelf: 'Aisle-01-Rack-01-S01' });
    const transferHistory = ref([]);
    const isSubmittingTransfer = ref(false);

    // 9. Step 3: Shifts & Attendance State
    const shiftSlots = ref([]);
    const attendanceHistory = ref([]);
    const selectedShiftDate = ref(new Date().toISOString().slice(0, 10));
    const isBookingSlot = ref(false);

    // 10. Step 8: Wallet, Incentives & Settlement State
    const walletData = ref({
      availableBalance: 1250,
      todayEarnings: 600,
      todayBreakdown: {
        baseDailyWage: 600,
        isDutyActive: true,
        completedPicksCount: 0,
        pickingRate: 15.0,
        pickingIncentive: 0,
        completedPutawayCount: 0,
        putawayRate: 10.0,
        putawayIncentive: 0,
        accuracyBonus: 0,
        accuracyRate: '99.4%'
      },
      totalWithdrawn: 0,
      pendingSettlement: 0,
      bankAccount: { bankName: 'HDFC Bank', accountNo: '••••4491', ifsc: 'HDFC0001020', upi: '9985699757@paytm' }
    });
    const payoutHistory = ref([]);
    const payoutRequestForm = reactive({ amount: 500, paymentMethod: 'UPI' });
    const isRequestingPayout = ref(false);

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
        const socketUrl = window.location.port === '3001' ? undefined : `${window.location.protocol}//${window.location.hostname}:3001`;
        socket = socketUrl ? io(socketUrl) : io();

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

        // Real-time Force Checkout from Admin / Floor Lead
        socket.on('wms:force_checkout', (data) => {
          console.log('⚡ Socket event wms:force_checkout received:', data);
          if (!user.value.userId || (data && data.userId == user.value.userId)) {
            duty.duty = 'OFF';
            duty.onBreak = false;
            duty.punchOutTime = new Date().toLocaleTimeString();
            showToast(`⚠️ Force Checkout: ${data?.message || 'Floor Manager has checked you out.'}`, 'error');
            if (pickerTask.value) pickerTask.value = null;
            activeWorkflowStep.value = 'step4';
            dashboardSegment.value = 'tasks';
            fetchWalletSummary();
          }
          if (currentTab.value === 'manager') fetchFloorStatus();
        });

        // Real-time Punch Out
        socket.on('wms:punch_out', (data) => {
          console.log('⚡ Socket event wms:punch_out received:', data);
          if (!user.value.userId || (data && data.userId == user.value.userId)) {
            duty.duty = 'OFF';
            duty.onBreak = false;
            duty.punchOutTime = new Date().toLocaleTimeString();
            showToast(`⚠️ Punch-out recorded: Duty is now OFF.`, 'warning');
            if (pickerTask.value) pickerTask.value = null;
            activeWorkflowStep.value = 'step4';
          }
          if (currentTab.value === 'manager') fetchFloorStatus();
        });

        // Real-time Force Logout
        socket.on('wms:force_logout', (data) => {
          console.log('⚡ Socket event wms:force_logout received:', data);
          if (!user.value.userId || (data && data.userId == user.value.userId)) {
            showToast(`⛔ Force Logout: ${data?.message || 'Session terminated by Floor Manager.'}`, 'error');
            setTimeout(() => {
              logout();
            }, 800);
          }
          if (currentTab.value === 'manager') fetchFloorStatus();
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
      if (!token) {
        isLoggedIn.value = false;
        activeWorkflowStep.value = 'step1';
        syncRouteHash();
        return;
      }

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

          // Route access: if logged in, access in WMS goes to Home (step4)
          handleRouteAccess();
        }
      } catch (err) {
        API.setToken(null);
        API.setUser(null);
        isLoggedIn.value = false;
        activeWorkflowStep.value = 'step1';
        syncRouteHash();
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

          // Route access: if logged in, route directly to Home (step4)
          navigateToStep('step4');
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
      duty.duty = 'OFF';
      duty.onBreak = false;
      activeWorkflowStep.value = 'step1';
      authMode.value = 'login';
      syncRouteHash();
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

          // Route access: if logged in, go to Home (step4)
          navigateToStep('step4');
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
        const orderId = pickerTask.value.orderId;
        const pickListId = pickerTask.value.pickListId;
        const totalItems = pickerTask.value.totalItems || pickerTask.value.items?.length || 1;

        const res = await API.request('/api/picker/complete-pick', {
          method: 'POST',
          body: JSON.stringify({ pickListId })
        });

        if (res.success) {
          showToast(res.message, 'success');
          completedPickHandover.value = {
            orderId,
            pickListId,
            handoverBay: 'BAY-0' + ((orderId % 3) + 1),
            totalItems,
            time: new Date().toLocaleTimeString(),
            handoverCode: `HO-ORD-${orderId}`
          };
          pickerTask.value = null;
          fetchWalletSummary();
          // Trigger next task fetch
          setTimeout(fetchPickerTask, 1200);
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

    // =========================================================
    // 7. STEP 7: TRANSFER & MOVE (INTERNAL & STORE-TO-STORE)
    // =========================================================
    async function fetchTransferData() {
      try {
        const res = await API.request('/api/transfer/inventory');
        inventoryItems.value = res.items || [];
        warehouseShelves.value = res.shelves || [];
        storesList.value = res.stores || [];
        if (inventoryItems.value.length > 0 && !internalMoveForm.variantId) {
          internalMoveForm.variantId = inventoryItems.value[0].variantId;
          internalMoveForm.sourceShelf = inventoryItems.value[0].currentShelf;
          internalMoveForm.targetShelf = warehouseShelves.value[1] || 'Aisle-01-Rack-02-S01';
          storeDispatchForm.variantId = inventoryItems.value[0].variantId;
          if (storesList.value.length > 1) {
            storeDispatchForm.toStoreId = storesList.value[1].storeId;
          }
        }
        fetchTransferHistory();
      } catch (e) {
        console.warn('Transfer data fetch error:', e);
      }
    }

    async function submitInternalMove() {
      if (!internalMoveForm.variantId || !internalMoveForm.sourceShelf || !internalMoveForm.targetShelf) {
        showToast('Please specify item, source shelf, and target shelf.', 'error');
        return;
      }
      isSubmittingTransfer.value = true;
      try {
        const res = await API.request('/api/transfer/internal-shelf', {
          method: 'POST',
          body: JSON.stringify(internalMoveForm)
        });
        if (res.success) {
          showToast(res.message, 'success');
          fetchTransferData();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        isSubmittingTransfer.value = false;
      }
    }

    async function submitStoreDispatch() {
      if (!storeDispatchForm.toStoreId || !storeDispatchForm.variantId || !storeDispatchForm.sealNo) {
        showToast('Please fill all dispatch fields including security seal.', 'error');
        return;
      }
      isSubmittingTransfer.value = true;
      try {
        const res = await API.request('/api/transfer/store-dispatch', {
          method: 'POST',
          body: JSON.stringify(storeDispatchForm)
        });
        if (res.success) {
          showToast(res.message, 'success');
          storeReceiveForm.transferNo = res.manifest?.transferNo || '';
          storeReceiveForm.sealNo = res.manifest?.sealNo || '';
          fetchTransferHistory();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        isSubmittingTransfer.value = false;
      }
    }

    async function submitStoreReceive() {
      if (!storeReceiveForm.transferNo || !storeReceiveForm.sealNo || !storeReceiveForm.targetShelf) {
        showToast('Enter Transfer No, verify Seal No, and target shelf.', 'error');
        return;
      }
      isSubmittingTransfer.value = true;
      try {
        const res = await API.request('/api/transfer/store-receive', {
          method: 'POST',
          body: JSON.stringify(storeReceiveForm)
        });
        if (res.success) {
          showToast(res.message, 'success');
          fetchTransferHistory();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        isSubmittingTransfer.value = false;
      }
    }

    async function fetchTransferHistory() {
      try {
        const res = await API.request('/api/transfer/history');
        transferHistory.value = res.history || [];
      } catch (e) {}
    }

    // =========================================================
    // 8. STEP 3: SHIFT SLOTS & ATTENDANCE HISTORY
    // =========================================================
    async function fetchShiftSlots() {
      try {
        const res = await API.request('/api/shifts/slots');
        shiftSlots.value = res.slots || [];
      } catch (e) {}
    }

    async function bookShiftSlot(slotCode) {
      isBookingSlot.value = true;
      try {
        const res = await API.request('/api/shifts/book', {
          method: 'POST',
          body: JSON.stringify({ slotCode, date: selectedShiftDate.value })
        });
        if (res.success) {
          showToast(res.message, 'success');
          fetchAttendanceHistory();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        isBookingSlot.value = false;
      }
    }

    async function fetchAttendanceHistory() {
      try {
        const res = await API.request('/api/shifts/my-history');
        attendanceHistory.value = res.history || [];
      } catch (e) {}
    }

    // =========================================================
    // 9. STEP 8: WALLET, INCENTIVES & SETTLEMENT
    // =========================================================
    async function fetchWalletSummary() {
      try {
        const res = await API.request('/api/wallet/summary');
        if (res.success && res.wallet) {
          walletData.value = res.wallet;
        }
      } catch (e) {}
    }

    async function submitPayoutRequest() {
      if (!payoutRequestForm.amount || payoutRequestForm.amount < 100) {
        showToast('Minimum payout amount is ₹100', 'error');
        return;
      }
      isRequestingPayout.value = true;
      try {
        const res = await API.request('/api/wallet/request-payout', {
          method: 'POST',
          body: JSON.stringify(payoutRequestForm)
        });
        if (res.success) {
          showToast(res.message, 'success');
          fetchWalletSummary();
          fetchPayoutHistory();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        isRequestingPayout.value = false;
      }
    }

    async function fetchPayoutHistory() {
      try {
        const res = await API.request('/api/wallet/history');
        payoutHistory.value = res.history || [];
      } catch (e) {}
    }

    // Load content for active tab
    function loadTabContent() {
      if (currentTab.value === 'picker') fetchPickerTask();
      else if (currentTab.value === 'putter') fetchPutawayTasks();
      else if (currentTab.value === 'inward') fetchPurchaseOrders();
      else if (currentTab.value === 'packer') fetchPackerOrders();
      else if (currentTab.value === 'transfer') fetchTransferData();
      else if (currentTab.value === 'shifts') { fetchShiftSlots(); fetchAttendanceHistory(); }
      else if (currentTab.value === 'wallet') { fetchWalletSummary(); fetchPayoutHistory(); }
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

    // ==========================================
    // WORKFLOW STEPS & NEW STYLE UI STATE (from Design Mockup)
    // ==========================================
    const activeWorkflowStep = ref('step4'); // 'step1' | 'step2' | 'step3' | 'step4' | 'active_task'
    const uiViewMode = ref(window.innerWidth >= 768 ? 'desktop' : 'mobile'); // 'mobile' | 'desktop'
    const bottomNav = ref('tasks'); // 'home' | 'packs' | 'tasks' | 'profile'
    const dashboardSegment = ref('tasks'); // 'tasks' | 'profile'

    // Step 2 State: Manager Approval & Dual Sync
    const managerApprovalOtp = ref('8842');
    const pinDigits = reactive(['4', '0', '', '']);
    const isRequestingPunchIn = ref(false);
    const punchInStatusText = ref('Selfie + GPS Geofence Check (50m radius scan badge)');

    // Step 3 State: Weekday strip & Calendar
    const selectedWeekIndex = ref(1); // Mon 31 (Selected)
    const mockWeekDays = reactive([
      { day: 'Sun', date: '30' },
      { day: 'Mon', date: '31' },
      { day: 'Tue', date: '2' },
      { day: 'Wed', date: '3' },
      { day: 'Thu', date: '4' },
      { day: 'Fri', date: '5' },
      { day: 'Sat', date: '6' }
    ]);
    const selectedShiftSlotName = ref('Morning Shift (6:00 AM - 2:00 PM)');

    const mockCalendarDays = ref([
      { day: 27, inactive: true }, { day: 28, inactive: true }, { day: 29, inactive: true }, { day: 30, inactive: true },
      { day: 1 }, { day: 2 }, { day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 }, { day: 10 },
      { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 }, { day: 15 }, { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 },
      { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25, worked: true }, { day: 26 }, { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 },
      { day: 31, worked: true }, { day: 1, inactive: true }
    ]);

    function onDigitInput(idx, event) {
      const val = event.target.value;
      if (val && val.length > 0) {
        pinDigits[idx] = val.slice(-1);
        if (idx < 3) {
          const nextInput = document.getElementById('pinInput_' + (idx + 1));
          if (nextInput) nextInput.focus();
        }
      }
      dutyVerificationCode.value = pinDigits.join('');
    }

    function onDigitKeydown(idx, event) {
      if (event.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
        const prevInput = document.getElementById('pinInput_' + (idx - 1));
        if (prevInput) prevInput.focus();
      }
    }

    function selectHeroTask(taskName) {
      currentTab.value = taskName;
      activeWorkflowStep.value = 'active_task';
      bottomNav.value = 'tasks';
      if (taskName === 'picker') fetchPickerTask();
      else if (taskName === 'putter') fetchPutawayTasks();
      else if (taskName === 'transfer') fetchTransferData();
      else if (taskName === 'packer') fetchPackerOrders();
      else if (taskName === 'inward') fetchInwardData();
    }

    function acceptManagerApproval() {
      managerApprovalOtp.value = String(Math.floor(1000 + Math.random() * 9000));
      pinDigits[0] = managerApprovalOtp.value[0];
      pinDigits[1] = managerApprovalOtp.value[1];
      pinDigits[2] = managerApprovalOtp.value[2];
      pinDigits[3] = managerApprovalOtp.value[3];
      dutyVerificationCode.value = managerApprovalOtp.value;
      showToast(`Manager Approved! OTP [${managerApprovalOtp.value}] issued to unlock shift.`, 'success');
    }

    async function submitPinUnlock() {
      const code = pinDigits.join('');
      if (code.length < 4) {
        showToast('Please enter all 4 digits of Manager OTP', 'error');
        return;
      }
      dutyVerificationCode.value = code;
      if (duty.dutyId) {
        await submitDutyCodeVerification();
      } else {
        duty.duty = 'ON';
        duty.slot = selectedShiftSlotName.value;
        duty.punchInTime = new Date().toLocaleTimeString();
        showToast(`✅ Shift Unlocked! Duty is ACTIVE on floor.`, 'success');
        activeWorkflowStep.value = 'step4';
      }
    }

    // Route Access Guard & Navigation Handler
    function navigateToStep(step, segment = null) {
      // Guard: if logged in and trying to access step1 (Auth/Login/Signup), route goes to Home (step4)
      if (isLoggedIn.value && step === 'step1') {
        activeWorkflowStep.value = 'step4';
        bottomNav.value = 'home';
        if (segment) dashboardSegment.value = segment;
        syncRouteHash();
        showToast(`Already logged in as ${user.value.name || user.value.email || 'User'}. Redirected to Home.`, 'info');
        return;
      }

      // Guard: if NOT logged in and trying to access internal steps, route goes to login (step1)
      if (!isLoggedIn.value && step !== 'step1') {
        activeWorkflowStep.value = 'step1';
        syncRouteHash();
        showToast('Please log in to access this section.', 'warning');
        return;
      }

      activeWorkflowStep.value = step;
      if (step === 'step4') {
        bottomNav.value = segment === 'profile' ? 'profile' : 'home';
        if (segment) dashboardSegment.value = segment;
      }
      syncRouteHash();
    }

    function syncRouteHash() {
      let targetHash = '#/home';
      if (activeWorkflowStep.value === 'step1') {
        targetHash = authMode.value === 'signup' ? '#/signup' : (authMode.value === 'forgot' ? '#/forgot' : '#/login');
      } else if (activeWorkflowStep.value === 'step2') {
        targetHash = '#/salary';
      } else if (activeWorkflowStep.value === 'step3') {
        targetHash = '#/slots';
      } else if (activeWorkflowStep.value === 'step4') {
        targetHash = dashboardSegment.value === 'profile' ? '#/profile' : '#/home';
      } else if (activeWorkflowStep.value === 'active_task') {
        targetHash = '#/tasks';
      }
      if (window.location.hash !== targetHash) {
        try {
          window.history.replaceState(null, '', targetHash);
        } catch (e) {}
      }
    }

    function handleRouteAccess() {
      const hash = (window.location.hash || '').toLowerCase();
      if (isLoggedIn.value) {
        // If logged in: any access to login/auth/step1 goes to Home
        if (!hash || hash === '' || hash === '#/' || hash === '#/login' || hash === '#/signup' || hash === '#/forgot' || hash === '#/auth' || hash === '#/step1' || hash === '#/home') {
          navigateToStep('step4');
        } else if (hash === '#/step2' || hash === '#/salary' || hash === '#/approvals') {
          navigateToStep('step2');
        } else if (hash === '#/step3' || hash === '#/slots' || hash === '#/shifts') {
          navigateToStep('step3');
        } else if (hash === '#/profile') {
          navigateToStep('step4', 'profile');
        } else if (hash === '#/packs') {
          navigateBottom('packs');
        } else if (hash === '#/tasks') {
          activeWorkflowStep.value = 'active_task';
          bottomNav.value = 'tasks';
        } else {
          navigateToStep('step4');
        }
      } else {
        // Not logged in: go to step1
        activeWorkflowStep.value = 'step1';
        if (hash === '#/signup') authMode.value = 'signup';
        else if (hash === '#/forgot') authMode.value = 'forgot';
        else authMode.value = 'login';
        syncRouteHash();
      }
    }

    function navigateBottom(tab) {
      if (!isLoggedIn.value) {
        navigateToStep('step1');
        return;
      }
      bottomNav.value = tab;
      if (tab === 'home') {
        activeWorkflowStep.value = 'step4';
        dashboardSegment.value = 'tasks';
        syncRouteHash();
      } else if (tab === 'packs') {
        currentTab.value = 'packer';
        activeWorkflowStep.value = 'active_task';
        syncRouteHash();
        fetchPackerOrders();
      } else if (tab === 'tasks') {
        activeWorkflowStep.value = 'step4';
        dashboardSegment.value = 'tasks';
        syncRouteHash();
      } else if (tab === 'profile') {
        activeWorkflowStep.value = 'step4';
        dashboardSegment.value = 'profile';
        syncRouteHash();
      }
    }

    onMounted(() => {
      initWebSocket();
      checkAuth();
      window.addEventListener('hashchange', handleRouteAccess);
    });

    return {
      activeWorkflowStep,
      uiViewMode,
      bottomNav,
      dashboardSegment,
      managerApprovalOtp,
      pinDigits,
      isRequestingPunchIn,
      punchInStatusText,
      selectedWeekIndex,
      mockWeekDays,
      selectedShiftSlotName,
      mockCalendarDays,
      onDigitInput,
      onDigitKeydown,
      selectHeroTask,
      acceptManagerApproval,
      submitPinUnlock,
      navigateBottom,
      navigateToStep,
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
      showProfileModal,
      showSalaryNoticeModal,
      completedPickHandover,
      transferTab,
      inventoryItems,
      warehouseShelves,
      storesList,
      internalMoveForm,
      storeDispatchForm,
      storeReceiveForm,
      transferHistory,
      isSubmittingTransfer,
      fetchTransferData,
      submitInternalMove,
      submitStoreDispatch,
      submitStoreReceive,
      fetchTransferHistory,
      shiftSlots,
      attendanceHistory,
      selectedShiftDate,
      isBookingSlot,
      fetchShiftSlots,
      bookShiftSlot,
      fetchAttendanceHistory,
      walletData,
      payoutHistory,
      payoutRequestForm,
      isRequestingPayout,
      fetchWalletSummary,
      submitPayoutRequest,
      fetchPayoutHistory,
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
