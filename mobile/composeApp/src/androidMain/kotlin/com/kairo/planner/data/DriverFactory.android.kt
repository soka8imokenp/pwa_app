package com.kairo.planner.data

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver
import com.kairo.planner.db.SumireDatabase

actual class DriverFactory(private val context: Context) {
    actual fun create(): SqlDriver = AndroidSqliteDriver(SumireDatabase.Schema, context, "sumire.db")
}
