import { requireOptionalNativeModule } from 'expo-modules-core'

type NestSmsModule = {
  canSend(): boolean
  send(phone: string, message: string): Promise<boolean>
}

// Optional so the JS keeps working in builds made before the module existed.
const native = requireOptionalNativeModule<NestSmsModule>('NestSms')

export const NestSms = {
  available: !!native,
  canSend: () => native?.canSend() ?? false,
  send: async (phone: string, message: string) => {
    if (!native) throw new Error('SMS module not in this build')
    return native.send(phone, message)
  },
}
