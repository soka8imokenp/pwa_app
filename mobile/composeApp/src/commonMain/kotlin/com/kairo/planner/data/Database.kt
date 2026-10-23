package com.kairo.planner.data

import app.cash.sqldelight.db.SqlDriver
import com.kairo.planner.db.SumireDatabase
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO

expect class DriverFactory {
    fun create(): SqlDriver
}

fun createDatabase(factory: DriverFactory): SumireDatabase = SumireDatabase(factory.create())

/** Single place for the DB dispatcher so tests can swap it. */
object DbDispatcher {
    var io: CoroutineDispatcher = Dispatchers.IO
}
