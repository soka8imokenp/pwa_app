package com.kairo.planner.scale

internal fun ByteArray.u8(i: Int): Int = this[i].toInt() and 0xFF

internal fun ByteArray.u16le(i: Int): Int = u8(i) or (u8(i + 1) shl 8)

internal fun ByteArray.u16be(i: Int): Int = (u8(i) shl 8) or u8(i + 1)

internal fun ByteArray.hex(): String = joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }

internal fun hexToBytes(hex: String): ByteArray {
    val clean = hex.replace(" ", "")
    return ByteArray(clean.length / 2) { clean.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
}

/** 7-byte BLE Date Time (year LE, month, day, hour, minute, second) → ISO-ish string, or null if invalid. */
internal fun ByteArray.bleDateTime(i: Int): String? {
    if (size < i + 7) return null
    val year = u16le(i)
    val month = u8(i + 2)
    val day = u8(i + 3)
    val hour = u8(i + 4)
    val min = u8(i + 5)
    val sec = u8(i + 6)
    if (year !in 1995..2099 || month !in 1..12 || day !in 1..31 || hour > 23 || min > 59 || sec > 59) return null
    return "$year-$month-$day $hour:$min:$sec"
}
