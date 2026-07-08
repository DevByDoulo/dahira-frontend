import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const allowedRoles: string[] = route.data['roles'] ?? [];
  if (allowedRoles.length === 0) return true;

  const role = inject(AuthService).getUser()?.role ?? '';

  if (allowedRoles.includes(role)) return true;

  return inject(Router).createUrlTree(['/dashboard']);
};
