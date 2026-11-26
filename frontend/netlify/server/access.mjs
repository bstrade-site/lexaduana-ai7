export const workspaceEmail = 'bs.trade@cextacbusinessgroup.com';

export function canAccessWorkspace(user) {
  return typeof user?.id === 'string' && user.id.length > 0
    && typeof user.confirmed_at === 'string' && user.confirmed_at.length > 0
    && typeof user.email === 'string' && user.email.trim().toLowerCase() === workspaceEmail;
}
