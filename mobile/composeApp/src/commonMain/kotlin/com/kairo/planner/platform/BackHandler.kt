package com.kairo.planner.platform

import androidx.compose.runtime.Composable

/** System back gesture/button interception (Android); no-op where the platform has no global back. */
@Composable
expect fun PlatformBackHandler(enabled: Boolean = true, onBack: () -> Unit)
