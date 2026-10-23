package com.kairo.planner.platform

import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import kotlinx.coroutines.suspendCancellableCoroutine
import java.lang.ref.WeakReference
import java.util.UUID
import kotlin.coroutines.resume

/** Weak handle on the foreground activity so platform services can launch system UI. */
object ActivityHolder {
    private var ref: WeakReference<ComponentActivity>? = null

    val activity: ComponentActivity? get() = ref?.get()

    fun attach(a: ComponentActivity) { ref = WeakReference(a) }

    fun detach(a: ComponentActivity) { if (ref?.get() === a) ref = null }
}

/**
 * Launches an activity-result contract and suspends until the result arrives.
 * Uses the registry directly (not registerForActivityResult), so it can be called at any time.
 */
suspend fun <I, O> ComponentActivity.awaitResult(contract: ActivityResultContract<I, O>, input: I): O =
    suspendCancellableCoroutine { cont ->
        var launcher: ActivityResultLauncher<I>? = null
        launcher = activityResultRegistry.register("sumire-" + UUID.randomUUID(), contract) { result ->
            launcher?.unregister()
            if (cont.isActive) cont.resume(result)
        }
        cont.invokeOnCancellation { launcher?.unregister() }
        launcher.launch(input)
    }
