import * as Linking from 'expo-linking'
import type { IconName } from '@/components/ui'
import { AppConfig } from '@/constants/app-config'
import { colors } from '@/constants/theme'
import { Role } from '@/generated/nest-vault'
import { formatSol, formatWhen, shortAddress } from '@/utils/format'
import type { ActivityItem } from './use-vault'

const roleName: Record<Role, string> = {
  [Role.Owner]: 'you',
  [Role.Guardian]: 'your guardian',
  [Role.Sentinel]: 'this phone',
}

export function activityRowProps(a: ActivityItem): {
  icon: IconName
  iconColor?: string
  iconBg?: string
  title: string
  subtitle?: string
  right?: string
  rightSub?: string
  rightColor?: string
  onPress?: () => void
} {
  const when = formatWhen(a.blockTime)
  const open = () => Linking.openURL(`https://explorer.solana.com/tx/${a.signature}?cluster=${AppConfig.explorerCluster}`)
  switch (a.kind) {
    case 'deposit':
      return {
        icon: 'arrow-down',
        iconColor: colors.success,
        iconBg: colors.successSoft,
        title: 'Deposit',
        subtitle: when,
        right: `+${formatSol(a.amount ?? 0n, 3)}`,
        rightColor: colors.success,
        rightSub: 'Vault deposit',
        onPress: open,
      }
    case 'withdrawal-requested':
      return {
        icon: 'time-outline',
        iconColor: '#A86A0B',
        iconBg: colors.warningSoft,
        title: 'Withdrawal request',
        subtitle: when,
        right: formatSol(a.amount ?? 0n, 3),
        rightSub: `To ${shortAddress(a.counterparty ?? '')}`,
        onPress: open,
      }
    case 'withdrawal-completed':
      return {
        icon: 'arrow-up',
        iconColor: colors.text,
        iconBg: '#EEF0F2',
        title: a.expedited ? 'Withdrawal (early release)' : 'Withdrawal',
        subtitle: when,
        right: `-${formatSol(a.amount ?? 0n, 3)}`,
        rightColor: colors.danger,
        rightSub: 'Completed',
        onPress: open,
      }
    case 'withdrawal-cancelled':
      return {
        icon: 'close-circle-outline',
        iconColor: colors.primaryDark,
        iconBg: colors.primarySoft,
        title: 'Withdrawal cancelled',
        subtitle: when,
        right: 'Protected',
        rightColor: colors.primaryDark,
        rightSub: a.role != null ? `By ${roleName[a.role]}` : undefined,
        onPress: open,
      }
    case 'instant-withdrawal':
      return {
        icon: 'flash-outline',
        iconColor: colors.text,
        iconBg: '#EEF0F2',
        title: 'Moved to safe address',
        subtitle: when,
        right: `-${formatSol(a.amount ?? 0n, 3)}`,
        rightColor: colors.danger,
        rightSub: shortAddress(a.counterparty ?? ''),
        onPress: open,
      }
    case 'lockdown':
      return {
        icon: 'snow-outline',
        iconColor: '#A86A0B',
        iconBg: colors.warningSoft,
        title: 'Savings frozen',
        subtitle: when,
        right: 'Frozen',
        rightSub: a.role != null ? `By ${roleName[a.role]}` : undefined,
        onPress: open,
      }
    case 'lockdown-lifted':
      return {
        icon: 'lock-open-outline',
        iconColor: colors.success,
        iconBg: colors.successSoft,
        title: 'Freeze lifted',
        subtitle: when,
        right: 'Active',
        rightColor: colors.success,
        onPress: open,
      }
  }
}
