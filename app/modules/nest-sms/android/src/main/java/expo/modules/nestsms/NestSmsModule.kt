package expo.modules.nestsms

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Sends an SMS in the background with no composer UI. Used by the duress PIN to alert
 * guardians without anything appearing on screen. Needs the SEND_SMS permission, which
 * the app requests during security setup.
 */
class NestSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NestSms")

    Function("canSend") {
      val context = appContext.reactContext ?: return@Function false
      ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED
    }

    AsyncFunction("send") { phone: String, message: String ->
      val context = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "No Android context", null)
      if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
        throw CodedException("NO_PERMISSION", "SEND_SMS permission not granted", null)
      }
      val sms: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
      val parts = sms.divideMessage(message)
      sms.sendMultipartTextMessage(phone, null, parts, null, null)
      true
    }
  }
}
