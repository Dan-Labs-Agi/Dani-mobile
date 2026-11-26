package run.openbot.glasses

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** What the glasses screen saves. A null secret keeps the saved one; an empty secret clears it. */
class GlassesSettings : Record {
  @Field val apiKey: String? = null
  @Field val model: String = ""
  @Field val voice: String = ""
  @Field val search: Boolean = false
  @Field val backendUrl: String = ""
  @Field val backendToken: String? = null
}

private const val DEFAULT_MODEL = "gemini-3.8-live"
private const val DEFAULT_VOICE = "Puck"

/** The glasses need the Bluetooth permissions of Android 12, so older phones have no glasses screen. */
private val supported: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

/**
 * The bridge between the glasses screen and `GlassesService`, which holds the Bluetooth link, the
 * Gemini Live session and the tools, so that they keep running with the screen off. The screen
 * calls `attach` when it opens and `detach` when it closes. Only then does the module bind to the
 * service and send events. Secrets stay in native code: JavaScript can save a key and see that one
 * exists, but never reads it back.
 */
class GlassesModule : Module(), GlassesService.Ui {
  private var service: GlassesService? = null
  private var bound = false

  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw IllegalStateException("No React context")
  private val prefs get() = context.getSharedPreferences(GLASSES_PREFS, Context.MODE_PRIVATE)
  private val backend by lazy { BackendTools(context, { }) }

  private val connection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val running = (binder as GlassesService.LocalBinder).service
      service = running
      running.ui = this@GlassesModule
      onStateChanged()
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      service = null
      onStateChanged()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("OpenBotGlasses")

    Events("onState", "onLog", "onLevel")

    Function("isSupported") { supported }

    /** Binds to the service while the screen is open. */
    AsyncFunction("attach") { attach() }.runOnQueue(Queues.MAIN)

    AsyncFunction("detach") { detach() }.runOnQueue(Queues.MAIN)

    AsyncFunction("getState") { snapshot() }

    AsyncFunction("getLog") { service?.logText().orEmpty() }

    /** Starts the foreground service, which finds the glasses and keeps the link. */
    AsyncFunction("connect") {
      context.startForegroundService(Intent(context, GlassesService::class.java).setAction(GlassesService.ACTION_CONNECT))
      Unit
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("disconnect") {
      runCatching {
        context.startService(Intent(context, GlassesService::class.java).setAction(GlassesService.ACTION_STOP))
      }
      Unit
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("startLive") { service?.startLive(userStarted = true) ?: Unit }.runOnQueue(Queues.MAIN)

    AsyncFunction("stopLive") { service?.stopLive() ?: Unit }.runOnQueue(Queues.MAIN)

    AsyncFunction("getSettings") { settings() }

    AsyncFunction("saveSettings") { next: GlassesSettings ->
      val edit = prefs.edit()
      next.apiKey?.let { edit.putString("apiKey", if (it.isBlank()) "" else KeyStoreSecrets.encrypt(it.trim())) }
      next.backendToken?.let { edit.putString("backendToken", if (it.isBlank()) "" else KeyStoreSecrets.encrypt(it.trim())) }
      edit.putString("model", next.model.trim().ifEmpty { DEFAULT_MODEL })
        .putString("voice", next.voice.trim().ifEmpty { DEFAULT_VOICE })
        .putBoolean("search", next.search)
        .putString("backendUrl", next.backendUrl.trim())
        .apply()
      onStateChanged()
    }

    /** The apps of the DAN cloud and whether each is connected. Runs the request off the main thread. */
    AsyncFunction("refreshCloudApps") { backend.cloudApps().toCloudApps() }

    /** Opens the sign-in page of a cloud app in the browser. Returns an error text, or an empty string. */
    AsyncFunction("connectCloudApp") { toolkit: String ->
      val result = backend.connectUrl(toolkit)
      val url = result.optString("url")
      if (url.startsWith("https://")) {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        ""
      } else result.optString("error").ifBlank { "The cloud did not return a sign-in link." }
    }

    /** Opens Android's list of apps that battery optimization leaves alone. */
    AsyncFunction("openBatterySettings") {
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("beep") { service?.link?.command("tone") ?: Unit }

    AsyncFunction("stopSound") { service?.link?.stop() ?: Unit }

    AsyncFunction("setVolume") { percent: Int ->
      service?.link?.command("volume ${percent.coerceIn(0, 100)}") ?: Unit
    }

    /** Speaks text on the glasses with the phone's voice. Returns false while the voice is not ready. */
    AsyncFunction("speak") { text: String -> service?.speakOnGlasses(text) ?: false }

    OnDestroy { detach() }
  }

  private fun attach() {
    if (bound || !supported) return
    bound = context.bindService(Intent(context, GlassesService::class.java), connection, Context.BIND_AUTO_CREATE)
  }

  private fun detach() {
    service?.ui = null
    service = null
    if (!bound) return
    bound = false
    runCatching { context.unbindService(connection) }
  }

  private val permissions = arrayOf(
    Manifest.permission.BLUETOOTH_SCAN,
    Manifest.permission.BLUETOOTH_CONNECT,
    Manifest.permission.RECORD_AUDIO,
  )

  private fun hasPermissions() = permissions.all {
    context.checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
  }

  private fun ignoringBattery() =
    context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName)

  private fun settings(): Map<String, Any> = mapOf(
    "model" to prefs.getString("model", DEFAULT_MODEL).orEmpty().ifEmpty { DEFAULT_MODEL },
    "voice" to prefs.getString("voice", DEFAULT_VOICE).orEmpty().ifEmpty { DEFAULT_VOICE },
    "search" to prefs.getBoolean("search", false),
    "backendUrl" to prefs.getString("backendUrl", BackendTools.DEFAULT_BACKEND_URL).orEmpty(),
    "hasApiKey" to KeyStoreSecrets.decrypt(prefs.getString("apiKey", "").orEmpty()).isNotBlank(),
    "hasBackendToken" to KeyStoreSecrets.decrypt(prefs.getString("backendToken", "").orEmpty()).isNotBlank(),
  )

  private fun snapshot(): Map<String, Any> {
    val s = service
    val live = when (s?.liveState) {
      GlassesService.LiveState.READY -> "ready"
      GlassesService.LiveState.CONNECTING -> "connecting"
      else -> "off"
    }
    return settings() + mapOf(
      "supported" to supported,
      "attached" to (s != null),
      "running" to (s?.running == true),
      "glassesConnected" to (s?.glassesConnected == true),
      "glassesName" to s?.glassesName.orEmpty(),
      "liveState" to live,
      "speaking" to (s?.speaking == true),
      "permissionsGranted" to hasPermissions(),
      "ignoringBattery" to ignoringBattery(),
    )
  }

  // ---------------- GlassesService.Ui, called on the main thread ----------------

  override fun onLog(line: String) {
    sendEvent("onLog", mapOf("line" to line))
  }

  override fun onStateChanged() {
    sendEvent("onState", snapshot())
  }

  /** The glasses report the loudness of the microphone, quiet at about 200 and speech above 2,000. */
  override fun onLevel(level: Int) {
    val percent = if (level <= 100) 0 else ((Math.log10(level / 100.0) / 2.3) * 100).toInt().coerceIn(0, 100)
    sendEvent("onLevel", mapOf("level" to percent))
  }
}

private fun org.json.JSONObject.toCloudApps(): Map<String, Any> {
  val apps = optJSONArray("apps")
  return mapOf(
    "error" to optString("error"),
    "apps" to (0 until (apps?.length() ?: 0)).map {
      val app = apps!!.getJSONObject(it)
      mapOf("toolkit" to app.optString("toolkit"), "connected" to app.optBoolean("connected"))
    },
  )
}
