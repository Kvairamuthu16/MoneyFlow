package com.moneyflowai

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import com.facebook.react.HeadlessJsTaskService

/**
 * Fires whenever the device receives an SMS, regardless of whether the app
 * is open, backgrounded, or not running at all (a manifest-declared
 * receiver still gets started by the OS in that last case). Hands the
 * message off to SmsHeadlessTaskService, which boots just enough of the JS
 * engine to run backgroundSmsTask.ts (see index.js) -- all the actual
 * filtering/parsing/categorization logic lives there, reused as-is from the
 * manual-scan pipeline.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) return

    // A single logical SMS can arrive as multiple PDU parts (e.g. a long
    // concatenated message) delivered together in one broadcast -- rejoin
    // the bodies and use the first part's sender/timestamp.
    val body = messages.joinToString(separator = "") { it.messageBody ?: "" }
    val address = messages[0].originatingAddress ?: ""
    val timestamp = messages[0].timestampMillis

    val bundle = Bundle().apply {
      putString("id", "native-$timestamp-${address.hashCode()}")
      putString("address", address)
      putString("body", body)
      putDouble("timestampMs", timestamp.toDouble())
    }

    val serviceIntent = Intent(context, SmsHeadlessTaskService::class.java)
    serviceIntent.putExtras(bundle)
    context.startService(serviceIntent)
    HeadlessJsTaskService.acquireWakeLockNow(context)
  }
}
