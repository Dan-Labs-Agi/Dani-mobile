package run.openbot.glasses

import android.content.Context
import android.content.Intent

/** The SharedPreferences file that the glasses service, its tools and the module settings share. */
const val GLASSES_PREFS = "openbot_glasses"

/** The intent that opens dani-dex: the notifications of the glasses use it for their tap action. */
fun launchIntent(context: Context): Intent? = context.packageManager.getLaunchIntentForPackage(context.packageName)
