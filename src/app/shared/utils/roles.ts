export const ROLE_LABELS: Record<string, string> = {
  super_admin:     'Super Administrateur',
  bureau:          'Administrateur Général',
  tresorier:       'Trésorier',
  responsable_org: 'Resp. Organisation',
  membre:          'Membre',
};

export const ROLE_OPTIONS = [
  { value: 'membre',          label: 'Membre' },
  { value: 'responsable_org', label: 'Resp. Organisation' },
  { value: 'tresorier',       label: 'Trésorier' },
  { value: 'bureau',          label: 'Administrateur' },
];

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
