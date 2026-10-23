package com.kairo.planner.data

import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.native.NativeSqliteDriver
import com.kairo.planner.db.SumireDatabase

actual class DriverFactory {
    actual fun create(): SqlDriver = NativeSqliteDriver(SumireDatabase.Schema, "sumire.db")
}
