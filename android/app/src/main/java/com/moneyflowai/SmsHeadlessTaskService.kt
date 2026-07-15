package com.moneyflowai

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Boots a short-lived JS engine instance to run the "SmsBackgroundImport"
 * headless task (registered via AppRegistry.registerHeadlessTask in
 * index.js) whenever SmsReceiver hands off a new SMS. `allowedInForeground =
 * true` so this still runs even if the app happens to already be open.
 */
class SmsHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
    val extras = intent.extras ?: return null
    return HeadlessJsTaskConfig(
      "SmsBackgroundImport",
      Arguments.fromBundle(extras),
      30000L,
      true
    )
  }
}
