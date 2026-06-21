import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const token = localStorage.getItem('token');
  console.log('[authGuard] token =', token);
  if (inject(AuthService).isLoggedIn()) return true;
  return inject(Router).createUrlTree(['/login']);
};
