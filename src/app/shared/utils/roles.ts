export const ROLE_LABELS: Record<string, string> = {
  super_admin:        'Super Administrateur',
  secretaire_general: 'Secrétaire Général',
  adjoint:            'Adjoint',
  tresorier:          'Trésorier',
  responsable_org:    'Communicateur',
  membre:             'Membre',
};

export const ROLE_OPTIONS = [
  { value: 'membre',             label: 'Membre' },
  { value: 'responsable_org',    label: 'Communicateur' },
  { value: 'tresorier',          label: 'Trésorier' },
  { value: 'adjoint',            label: 'Adjoint' },
  { value: 'secretaire_general', label: 'Secrétaire Général' },
];

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'secretaire_general' || role === 'adjoint';
}
