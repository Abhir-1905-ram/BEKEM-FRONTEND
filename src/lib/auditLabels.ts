const ACTION_LABELS: Record<string, string> = {
  'POST /api/auth/login': 'User signed in',
  'POST /api/auth/logout': 'User signed out',
  'POST /api/material-requests': 'Material request created',
  'POST /api/purchase-requests': 'Purchase request created',
  'POST /api/purchase-orders/wizard': 'Purchase order created',
  'POST /api/purchase-orders': 'Purchase order created',
};

export function formatAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];

  const verify = action.match(/POST \/api\/purchase-orders\/[^/]+\/verify/);
  if (verify) return 'Purchase order verified';

  const approve = action.match(/POST \/api\/purchase-orders\/[^/]+\/approve/);
  if (approve) return 'Purchase order approved';

  const reject = action.match(/POST \/api\/purchase-orders\/[^/]+\/reject/);
  if (reject) return 'Purchase order rejected';

  const allocate = action.match(/POST \/api\/material-requests\/[^/]+\/allocate/);
  if (allocate) return 'Stock allocated';

  const forward = action.match(/POST \/api\/material-requests\/[^/]+\/forward/);
  if (forward) return 'Request forwarded to PM';

  const mrApprove = action.match(/POST \/api\/material-requests\/[^/]+\/approve/);
  if (mrApprove) return 'Material request approved';

  if (action.startsWith('POST ')) return action.replace('POST /api/', '').replace(/-/g, ' ');
  return action;
}
