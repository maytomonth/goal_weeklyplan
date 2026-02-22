import type { LucideProps } from 'lucide-react-native';
import {
  Archive,
  Calendar,
  Check,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  CircleArrowRight,
  CircleCheck,
  CircleX,
  CornerUpRight,
  ExternalLink,
  GitBranch,
  Inbox,
  LogIn,
  Plus,
  Save,
  Slash,
  Star,
  Target,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native';

const ICONS = {
  archive: Archive,
  calendar: Calendar,
  check: Check,
  'check-circle': CircleCheck,
  'chevrons-left': ChevronsLeft,
  'chevrons-right': ChevronsRight,
  'circle-alert': CircleAlert,
  'arrow-right-circle': CircleArrowRight,
  'corner-up-right': CornerUpRight,
  'external-link': ExternalLink,
  'git-branch': GitBranch,
  inbox: Inbox,
  'log-in': LogIn,
  plus: Plus,
  save: Save,
  slash: Slash,
  star: Star,
  target: Target,
  'trash-2': Trash2,
  'user-plus': UserPlus,
  x: X,
  'x-circle': CircleX,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps extends Omit<LucideProps, 'color'> {
  name: IconName;
  color?: string;
}

export function Icon({ name, size = 16, color = '#9aa1ae', strokeWidth = 2, ...props }: IconProps) {
  const Component = ICONS[name];
  return <Component size={size} color={color} strokeWidth={strokeWidth} {...props} />;
}
