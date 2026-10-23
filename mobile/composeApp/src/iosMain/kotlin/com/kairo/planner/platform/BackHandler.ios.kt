package com.kairo.planner.platform

import androidx.compose.runtime.Composable

@Composable
actual fun PlatformBackHandler(enabled: Boolean, onBack: () -> Unit) {
    // iOS uses edge-swipe gestures handled by the pages themselves.
}
