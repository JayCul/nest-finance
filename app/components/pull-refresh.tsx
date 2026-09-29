import { useState } from 'react'
import { RefreshControl, type RefreshControlProps } from 'react-native'
import { colors } from '@/constants/theme'

type Props = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & { onRefresh: () => unknown }

/**
 * Pull-to-refresh that spins only for a pull, not for background refetches. Queries poll every
 * few seconds, and tying the spinner to isRefetching made it pop up on its own.
 * Extra props pass through because ScrollView injects style and children on Android.
 */
export function PullRefresh({ onRefresh, ...rest }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  return (
    <RefreshControl
      {...rest}
      tintColor={colors.primary}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }}
    />
  )
}
