import {
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  List,
  ListChecks,
  CheckSquare,
  CircleDot,
  Calendar,
  CalendarDays,
  File,
  Heading,
  Text,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  textarea: AlignLeft,
  select: List,
  multi_select: ListChecks,
  checkbox: CheckSquare,
  radio: CircleDot,
  date: Calendar,
  datetime: CalendarDays,
  file: File,
  heading: Heading,
  paragraph: Text,
};

const labelMap: Record<string, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  number: 'Number',
  textarea: 'Textarea',
  select: 'Select',
  multi_select: 'Multi-Select',
  checkbox: 'Checkbox',
  radio: 'Radio',
  date: 'Date',
  datetime: 'Date & Time',
  file: 'File Upload',
  heading: 'Heading',
  paragraph: 'Paragraph',
};

export function getFieldTypeLabel(type: string): string {
  return labelMap[type] || type;
}

export function FieldTypeIcon({ type, size = 14 }: { type: string; size?: number }) {
  const Icon = iconMap[type] || Type;
  return <Icon size={size} />;
}

export const FIELD_TYPES = Object.keys(iconMap);

export const FIELD_TYPE_OPTIONS = Object.entries(labelMap).map(([value, label]) => ({
  value,
  label,
}));
