import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const allowedRoles: string[] = route.data['roles'] ?? [];
  if (allowedRoles.length === 0) return true;

  const user = JSON.parse(localStorage.getItem('user') ?? 'null') as { role?: string } | null;
  const role = user?.role ?? '';

  if (allowedRoles.includes(role)) return true;

  return inject(Router).createUrlTree(['/dashboard']);
};
