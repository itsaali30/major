const getPendingUsersFilter = (role) => {
  let allowedRolesToApprove = [];
  if (role === 'superadmin') allowedRolesToApprove = undefined;
  else if (role === 'admin') allowedRolesToApprove = ['manager', 'accountmanager', 'cluster'];
  else if (role === 'manager') allowedRolesToApprove = ['incharge'];
  else if (role === 'accountmanager') allowedRolesToApprove = ['accountant'];
  else if (role === 'cluster') allowedRolesToApprove = ['feltmanager'];
  else if (role === 'incharge') allowedRolesToApprove = ['putter', 'picker'];
  else if (role === 'accountant') allowedRolesToApprove = ['audit', 'purchase', 'pricecontroller'];
  else if (role === 'feltmanager') allowedRolesToApprove = ['rider', 'coach'];
  else return 'ERROR';
  return allowedRolesToApprove;
};

const tests = [
  { role: 'superadmin', expected: undefined },
  { role: 'admin', expected: ['manager', 'accountmanager', 'cluster'] },
  { role: 'manager', expected: ['incharge'] },
  { role: 'accountmanager', expected: ['accountant'] },
  { role: 'cluster', expected: ['feltmanager'] },
  { role: 'incharge', expected: ['putter', 'picker'] },
  { role: 'accountant', expected: ['audit', 'purchase', 'pricecontroller'] },
  { role: 'feltmanager', expected: ['rider', 'coach'] },
];

tests.forEach(test => {
  const result = getPendingUsersFilter(test.role);
  const pass = JSON.stringify(result) === JSON.stringify(test.expected);
  console.log(`Role: ${test.role.padEnd(15)} Result: ${pass ? 'PASS' : 'FAIL'} (Got ${JSON.stringify(result)})`);
});
