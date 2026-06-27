import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isLoggedIn()) return inject(Router).createUrlTree(['/login']);
  const user = auth.getUser();
  if (user?.role === 'super_admin') return true;
  return inject(Router).createUrlTree(['/dashboard']);
};
