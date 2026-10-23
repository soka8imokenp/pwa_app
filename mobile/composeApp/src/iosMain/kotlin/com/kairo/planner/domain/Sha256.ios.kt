package com.kairo.planner.domain.planner

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.UByteVar
import kotlinx.cinterop.reinterpret
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.convert
import kotlinx.cinterop.usePinned
import platform.CoreCrypto.CC_SHA256
import platform.CoreCrypto.CC_SHA256_DIGEST_LENGTH

@OptIn(ExperimentalForeignApi::class)
actual fun sha256(data: ByteArray): ByteArray {
    val out = ByteArray(CC_SHA256_DIGEST_LENGTH)
    val input = if (data.isEmpty()) byteArrayOf(0) else data
    input.usePinned { inPin ->
        out.usePinned { outPin ->
            CC_SHA256(inPin.addressOf(0), data.size.convert(), outPin.addressOf(0).reinterpret<UByteVar>())
        }
    }
    return out
}
