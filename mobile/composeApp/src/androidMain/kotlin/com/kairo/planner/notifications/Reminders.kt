package com.kairo.planner.notifications

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.kairo.planner.MainActivity
import com.kairo.planner.R
import java.util.Calendar

object Channels {
    const val REMINDERS = "reminders"
    const val FOCUS = "focus"

    fun ensure(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel(REMINDERS, "Reminders", NotificationManager.IMPORTANCE_DEFAULT))
        nm.createNotificationChannel(NotificationChannel(FOCUS, "Focus timer", NotificationManager.IMPORTANCE_LOW).apply { setShowBadge(false) })
    }

    fun canPost(context: Context) = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    fun openAppIntent(context: Context, requestCode: Int = 0): PendingIntent = PendingIntent.getActivity(
        context, requestCode,
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}

/**
 * Inexact alarms (no SCHEDULE_EXACT_ALARM permission needed). Daily reminders re-arm themselves when they fire,
 * and [BootReceiver] restores them after a reboot.
 */
object Reminders {
    private const val PREFS = "reminders"

    private fun pending(context: Context, id: String, title: String, body: String, dailyMinute: Int): PendingIntent {
        val i = Intent(context, ReminderReceiver::class.java)
            .setAction("com.kairo.planner.REMINDER.$id")
            .putExtra("id", id).putExtra("title", title).putExtra("body", body).putExtra("daily", dailyMinute)
        return PendingIntent.getBroadcast(context, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    fun scheduleAt(context: Context, id: String, atMs: Long, title: String, body: String, dailyMinute: Int = -1) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, pending(context, id, title, body, dailyMinute))
    }

    fun scheduleDaily(context: Context, id: String, minuteOfDay: Int, title: String, body: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(id, "$minuteOfDay|$title|$body").apply()
        scheduleAt(context, id, nextOccurrence(minuteOfDay), title, body, minuteOfDay)
    }

    fun cancel(context: Context, id: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(id).apply()
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        am.cancel(pending(context, id, "", "", -1))
    }

    fun restoreAll(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).all.forEach { (id, v) ->
            val parts = (v as? String)?.split('|', limit = 3) ?: return@forEach
            val minute = parts.getOrNull(0)?.toIntOrNull() ?: return@forEach
            scheduleAt(context, id, nextOccurrence(minute), parts.getOrElse(1) { "" }, parts.getOrElse(2) { "" }, minute)
        }
    }

    private fun nextOccurrence(minuteOfDay: Int): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, minuteOfDay / 60)
            set(Calendar.MINUTE, minuteOfDay % 60)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= System.currentTimeMillis() + 30_000) cal.add(Calendar.DAY_OF_YEAR, 1)
        return cal.timeInMillis
    }

    fun show(context: Context, id: String, title: String, body: String, channel: String = Channels.REMINDERS) {
        Channels.ensure(context)
        if (!Channels.canPost(context)) return
        val n = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_sumire)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(Channels.openAppIntent(context, id.hashCode()))
            .setColor(0xFF3D6B52.toInt())
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(id.hashCode(), n) }
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("id") ?: return
        val title = intent.getStringExtra("title") ?: return
        val body = intent.getStringExtra("body") ?: ""
        if (id == FocusNotifier.END_ID) {
            FocusNotifier.stop(context)
        }
        Reminders.show(context, id, title, body)
        val daily = intent.getIntExtra("daily", -1)
        if (daily >= 0) Reminders.scheduleDaily(context, id, daily, title, body)
    }
}

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            Reminders.restoreAll(context)
        }
    }
}

/** Ongoing countdown notification + an alarm for the end of the session (works even if the UI is gone). */
object FocusNotifier {
    const val END_ID = "focus_end"
    private const val NOTIFICATION_ID = 4242

    fun start(context: Context, endsAtMs: Long, title: String) {
        Channels.ensure(context)
        if (Channels.canPost(context)) {
            val n = NotificationCompat.Builder(context, Channels.FOCUS)
                .setSmallIcon(R.drawable.ic_stat_sumire)
                .setContentTitle(title.ifBlank { context.getString(R.string.focus_running) })
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(endsAtMs)
                .setShowWhen(true)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
                .setContentIntent(Channels.openAppIntent(context, NOTIFICATION_ID))
                .setColor(0xFF3D6B52.toInt())
                .build()
            runCatching { NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, n) }
        }
        Reminders.scheduleAt(context, END_ID, endsAtMs, context.getString(R.string.focus_done_title), context.getString(R.string.focus_done_body))
    }

    fun stop(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val i = Intent(context, ReminderReceiver::class.java).setAction("com.kairo.planner.REMINDER.$END_ID")
        am.cancel(PendingIntent.getBroadcast(context, END_ID.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    }
}
