import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  CheckCircle,
  ClipboardCheck,
  Crown,
  Gauge,
  Lock,
  Radio,
  Shield,
  Target,
  Trophy,
  User,
  type LucideIcon,
} from 'lucide-react-native';

type TraderIconProps = {
  Icon: LucideIcon;
  active?: boolean;
  size?: number;
};

export function TraderIcon({ Icon, active = false, size = 22 }: TraderIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      color={active ? '#F4C96B' : '#8B8F98'}
    />
  );
}

export const traderEdgeIcons = {
  mission: Target,
  readiness: Gauge,
  debrief: ClipboardCheck,
  disciplineScore: Trophy,
  vault: Archive,
  progress: BarChart3,
  alerts: Bell,
  profile: User,
  elite: Shield,
  riskWarning: AlertTriangle,
  locked: Lock,
  lockScreenBriefing: Radio,
  pro: Crown,
  completed: CheckCircle,
} satisfies Record<string, LucideIcon>;
