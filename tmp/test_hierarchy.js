const canApprove = (approverRole, targetRole) => {
  if (approverRole === 'superadmin') return true;
  
  // Level 2 approves Level 3
  if (approverRole === 'admin') {
     return ['manager', 'accountmanager', 'cluster'].includes(targetRole);
  }
  
  // Level 3 approves Level 4 (Specific verticals)
  if (approverRole === 'manager') return ['incharge'].includes(targetRole);
  if (approverRole === 'accountmanager') return ['accountant'].includes(targetRole);
  if (approverRole === 'cluster') return ['feltmanager'].includes(targetRole);

  // Level 4 approves Level 5 (Specific verticals)
  if (approverRole === 'incharge') return ['putter', 'picker'].includes(targetRole);
  if (approverRole === 'accountant') return ['audit', 'purchase', 'pricecontroller'].includes(targetRole);
  if (approverRole === 'feltmanager') return ['rider', 'coach'].includes(targetRole);
  
  return false;
};

const tests = [
  { a: 'superadmin', t: 'admin', expected: true },
  { a: 'superadmin', t: 'manager', expected: true },
  { a: 'admin', t: 'manager', expected: true },
  { a: 'admin', t: 'cluster', expected: true },
  { a: 'admin', t: 'incharge', expected: false }, // Admin (2) only approves Level 3
  { a: 'manager', t: 'incharge', expected: true },
  { a: 'manager', t: 'putter', expected: false }, // Manager (3) only approves Level 4 (incharge)
  { a: 'incharge', t: 'putter', expected: true },
  { a: 'incharge', t: 'picker', expected: true },
  { a: 'accountmanager', t: 'accountant', expected: true },
  { a: 'accountant', t: 'audit', expected: true },
  { a: 'accountant', t: 'pricecontroller', expected: true },
  { a: 'cluster', t: 'feltmanager', expected: true },
  { a: 'feltmanager', t: 'rider', expected: true },
  { a: 'feltmanager', t: 'coach', expected: true },
  { a: 'feltmanager', t: 'putter', expected: false }, // Cross-vertical
];

tests.forEach(test => {
  const result = canApprove(test.a, test.t);
  console.log(`Approver: ${test.a.padEnd(15)} Target: ${test.t.padEnd(15)} Result: ${result === test.expected ? 'PASS' : 'FAIL'} (Got ${result})`);
});
