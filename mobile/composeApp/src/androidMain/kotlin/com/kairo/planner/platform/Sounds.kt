package com.kairo.planner.platform

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin

/**
 * Tiny UI sounds synthesised once into cache as 16-bit PCM WAV: soft marimba-like tones
 * (sine + octave partial with exponential decay). Zero assets, no licensing questions.
 */
object Sounds {
    private const val RATE = 44_100

    private data class Note(val freq: Double, val startMs: Int, val durMs: Int, val gain: Double)

    private fun notes(kind: UiSound): List<Note> = when (kind) {
        UiSound.TAP -> listOf(Note(1318.5, 0, 45, 0.25))
        UiSound.SUCCESS -> listOf(Note(880.0, 0, 160, 0.45), Note(1318.5, 70, 260, 0.45))
        UiSound.COMPLETE -> listOf(Note(659.3, 0, 220, 0.4), Note(830.6, 90, 240, 0.4), Note(987.8, 180, 420, 0.45))
        UiSound.TIMER_END -> listOf(Note(987.8, 0, 500, 0.5), Note(1318.5, 260, 520, 0.45), Note(987.8, 620, 700, 0.45))
        UiSound.DELETE -> listOf(Note(392.0, 0, 120, 0.35), Note(293.7, 60, 180, 0.35))
    }

    fun ensure(context: Context, kind: UiSound): File {
        val file = File(context.cacheDir, "ui_${kind.name.lowercase()}_v1.wav")
        if (file.exists() && file.length() > 44) return file
        val ns = notes(kind)
        val totalMs = ns.maxOf { it.startMs + it.durMs } + 20
        val samples = DoubleArray(RATE * totalMs / 1000)
        ns.forEach { n ->
            val start = RATE * n.startMs / 1000
            val len = RATE * n.durMs / 1000
            val decay = 5.0 / len
            for (i in 0 until len) {
                val idx = start + i
                if (idx >= samples.size) break
                val t = i.toDouble() / RATE
                val attack = (i / (RATE * 0.004)).coerceAtMost(1.0)
                val env = attack * exp(-decay * i)
                samples[idx] += n.gain * env * (sin(2 * PI * n.freq * t) + 0.25 * sin(4 * PI * n.freq * t))
            }
        }
        val pcm = ByteBuffer.allocate(samples.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        samples.forEach { pcm.putShort((it.coerceIn(-1.0, 1.0) * 30_000).toInt().toShort()) }
        FileOutputStream(file).use { out ->
            out.write(wavHeader(pcm.capacity()))
            out.write(pcm.array())
        }
        return file
    }

    private fun wavHeader(dataLen: Int): ByteArray = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
        put("RIFF".toByteArray()); putInt(36 + dataLen); put("WAVE".toByteArray())
        put("fmt ".toByteArray()); putInt(16); putShort(1); putShort(1); putInt(RATE); putInt(RATE * 2); putShort(2); putShort(16)
        put("data".toByteArray()); putInt(dataLen)
    }.array()
}
