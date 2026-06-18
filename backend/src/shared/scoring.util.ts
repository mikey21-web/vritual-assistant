export function getNested(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

export function evaluateCondition(value: any, operator: string, expected: string): boolean {
  switch (operator) {
    case 'exists': case 'not_empty': return value != null && value !== '' && value !== false;
    case 'equals': case 'eq': case 'is': return String(value ?? '').toLowerCase() === expected.toLowerCase();
    case 'contains': case 'includes': return String(value ?? '').toLowerCase().includes(expected.toLowerCase());
    case 'starts_with': return String(value ?? '').toLowerCase().startsWith(expected.toLowerCase());
    case 'gt': case 'greater_than': return Number(value) > Number(expected);
    case 'gte': return Number(value) >= Number(expected);
    case 'lt': case 'less_than': return Number(value) < Number(expected);
    case 'lte': return Number(value) <= Number(expected);
    case 'date_before': return new Date(value).getTime() < new Date(expected).getTime();
    case 'date_after': return new Date(value).getTime() > new Date(expected).getTime();
    default: return false;
  }
}
