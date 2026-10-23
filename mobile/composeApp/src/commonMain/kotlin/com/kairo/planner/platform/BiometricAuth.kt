package com.kairo.planner.platform

interface BiometricAuth {
    fun isAvailable(): Boolean
    suspend fun authenticate(title: String): Boolean
}

object NoBiometrics : BiometricAuth {
    override fun isAvailable() = false
    override suspend fun authenticate(title: String) = false
}
