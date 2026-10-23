package com.kairo.planner.i18n

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import com.kairo.planner.data.AppLanguage
import com.kairo.planner.model.ActivityLevel
import com.kairo.planner.model.BodyMetric
import com.kairo.planner.model.BodyType
import com.kairo.planner.model.FocusMode
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.MealType
import com.kairo.planner.model.PaceKind
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.model.WorkoutCategory

/**
 * Russian is the base language; [UzStrings] and [EnStrings] override everything.
 * Anything not overridden falls back to Russian instead of crashing.
 */
open class Strings {
    open val code = "ru"
    open val appName = "Daily Sumire"

    // Common
    open val save = "Сохранить"
    open val cancel = "Отмена"
    open val delete = "Удалить"
    open val edit = "Изменить"
    open val add = "Добавить"
    open val done = "Готово"
    open val close = "Закрыть"
    open val back = "Назад"
    open val next = "Далее"
    open val retry = "Повторить"
    open val undo = "Вернуть"
    open val today = "Сегодня"
    open val yesterday = "Вчера"
    open val tomorrow = "Завтра"
    open val all = "Все"
    open val minutesShort = "мин"
    open val hoursShort = "ч"
    open val kg = "кг"
    open val cm = "см"
    open val kcal = "ккал"
    open val ml = "мл"
    open val grams = "г"
    open val steps = "шагов"
    open val km = "км"
    open val years = "лет"
    open val on = "Вкл"
    open val off = "Выкл"
    open val optional = "необязательно"
    open val settings = "Настройки"
    open val deleted = "Удалено"
    open val saved = "Сохранено"
    open val errorGeneric = "Что-то пошло не так"
    open val weekdaysShort = listOf("Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс")
    open val monthsShort = listOf("янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек")
    open val monthsFull = listOf("Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь")
    open val weekdaysFull = listOf("Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье")

    // Splash / onboarding
    open val splashLoading = "Готовим твой день…"
    open val welcomeTitle = "Привет! Я Сумирэ"
    open val welcomeSubtitle = "Помогу держать фокус на главном, следить за привычками, питанием и телом."
    open val chooseLanguage = "Выбери язык"
    open val letsStart = "Начнём"
    open val aboutYou = "Немного о тебе"
    open val aboutYouHint = "Нужно для точного расчёта калорий, BMR и состава тела. Данные хранятся на устройстве."
    open val yourName = "Как тебя зовут?"
    open val skip = "Пропустить"

    // Modes / nav
    open val modePlanner = "Планер"
    open val modeHealth = "Здоровье"
    open val tabToday = "День"
    open val tabHabits = "Привычки"
    open val tabFocus = "Фокус"
    open val tabMore = "Ещё"
    open val tabBody = "Тело"
    open val tabFood = "Питание"
    open val tabActivity = "Активность"
    open val tabCoach = "Сумирэ"

    // Greetings
    open val goodMorning = "Доброе утро"
    open val goodAfternoon = "Добрый день"
    open val goodEvening = "Добрый вечер"
    open val goodNight = "Доброй ночи"

    // Today / tasks
    open val top3 = "Главные 3"
    open val top3Hint = "Правило Айви Ли: три дела, которые реально двигают вперёд"
    open val otherTasks = "Остальные задачи"
    open val backlog = "Бэклог"
    open val addTask = "Новая задача"
    open val taskTitleHint = "Что нужно сделать?"
    open val notesHint = "Заметка"
    open val subtasks = "Подзадачи"
    open val addSubtask = "Добавить шаг"
    open val estimate = "Оценка времени"
    open val category = "Категория"
    open val makePriority = "В главные 3"
    open val removePriority = "Убрать из главных"
    open val prioritiesFull = "Уже есть 3 главные задачи — сначала освободи слот"
    open val moveToTomorrow = "На завтра"
    open val moveToToday = "На сегодня"
    open val repeat = "Повтор"
    open val repeatNone = "Не повторять"
    open val reminder = "Напоминание"
    open val noTasksTitle = "Чистый лист"
    open val noTasksSubtitle = "Добавь три главные задачи — и день уже удался."
    open val emptyPrioritySlot = "Свободный слот"
    open val dayScore = "Оценка дня"
    open val focusToday = "Фокус сегодня"
    open val streak = "Серия"
    open val streakDays = "дн."
    open val overdueTitle = "Незаконченные дела"
    open fun overdueBody(n: Int) = "С прошлых дней осталось задач: $n. Перенести на сегодня?"
    open val moveAll = "Перенести все"
    open val dismiss = "Не сейчас"
    open val moodQuestion = "Как ты сегодня?"
    open val dayNoteHint = "Пара слов о дне…"
    open val scratchpad = "Черновик"
    open val scratchpadHint = "Быстрые мысли, номера, идеи…"
    open val eveningReview = "Вечерний разбор"
    open val eveningReviewHint = "Подведи итоги и перенеси хвосты"
    open val completedToday = "Сделано сегодня"
    open val leftForTomorrow = "Перенести на завтра"
    open val finishDay = "Завершить день"
    open val dayClosed = "День закрыт. Отдыхай!"
    open fun categoryName(c: TaskCategory) = when (c) {
        TaskCategory.GENERAL -> "Общее"
        TaskCategory.CODE -> "Код"
        TaskCategory.DESIGN -> "Дизайн"
        TaskCategory.HEALTH -> "Здоровье"
        TaskCategory.LEARN -> "Учёба"
        TaskCategory.ADMIN -> "Дела"
    }

    // Habits
    open val habits = "Привычки"
    open val addHabit = "Новая привычка"
    open val habitTitleHint = "Например: читать 20 страниц"
    open val habitDays = "Дни"
    open val everyDay = "Каждый день"
    open val weekdays = "Будни"
    open val icon = "Иконка"
    open val color = "Цвет"
    open val currentStreak = "Текущая серия"
    open val bestStreak = "Лучшая"
    open val completion = "Выполнение"
    open val restDay = "День отдыха"
    open val noHabitsTitle = "Пока без привычек"
    open val noHabitsSubtitle = "Маленькие ежедневные шаги дают самый большой результат."
    open fun habitsProgress(done: Int, total: Int) = "$done из $total сегодня"
    open val archive = "В архив"

    // Focus
    open val focus = "Фокус"
    open fun focusModeName(m: FocusMode) = when (m) {
        FocusMode.POMODORO -> "Помодоро"
        FocusMode.DEEP_WORK -> "Глубокая работа"
        FocusMode.STOPWATCH -> "Секундомер"
    }
    open val start = "Старт"
    open val pause = "Пауза"
    open val resume = "Продолжить"
    open val finish = "Завершить"
    open val reset = "Сброс"
    open val breakTime = "Перерыв"
    open val focusOn = "Над чем работаем?"
    open val noTaskSelected = "Без задачи"
    open val sessionsToday = "Сессии сегодня"
    open val focusDoneTitle = "Сессия завершена"
    open fun focusDoneBody(min: Int) = "+$min мин фокуса. Сделай паузу и попей воды."
    open val zenMode = "Дзен-режим"
    open val totalWeek = "За неделю"

    // More
    open val more = "Ещё"
    open val stats = "Статистика"
    open val links = "Ссылки"
    open val activityLog = "Журнал действий"
    open val account = "Аккаунт"
    open val backupRestore = "Резервная копия"
    open val about = "О приложении"
    open val weeklyReport = "Итоги недели"
    open val addLink = "Новая ссылка"
    open val linkTitle = "Название"
    open val linkUrl = "Адрес (URL)"
    open val noLinks = "Сохраняй сюда важные ссылки"
    open val clearLog = "Очистить журнал"
    open val noActivity = "Пока ничего не происходило"

    // Stats
    open val last7days = "Последние 7 дней"
    open val last30days = "30 дней"
    open val tasksDone = "Задач сделано"
    open val habitsDone = "Привычек"
    open val focusMinutes = "Минут фокуса"
    open val activityHeatmap = "Карта активности"
    open val longestStreak = "Рекорд серии"

    // Health – body
    open val body = "Тело"
    open val weight = "Вес"
    open val logWeight = "Записать вес"
    open val connectScale = "Умные весы"
    open val bodyScore = "Оценка тела"
    open val bodyType = "Тип телосложения"
    open val bodyComposition = "Состав тела"
    open val estimateBadge = "Оценка"
    open val estimateHint = "Без биоимпеданса — значения рассчитаны по ИМТ. Встань на умные весы босиком для точного анализа."
    open val trend = "Тренд"
    open val movingAvg = "Среднее за 7 дней"
    open val goalWeight = "Цель"
    open val toGoal = "До цели"
    open val goalReached = "Цель достигнута!"
    open fun projected(date: String, weeks: Int) = "≈ $date · $weeks нед."
    open val history = "История"
    open val noWeightTitle = "Нет взвешиваний"
    open val noWeightSubtitle = "Встань на весы или добавь вес вручную — построю тренд и посчитаю состав тела."
    open val waist = "Талия"
    open val note = "Заметка"
    open val deductions = "Что снижает оценку"
    open val norm = "Норма"
    open val metricDetails = "Подробнее"
    open fun paceLabel(kind: PaceKind) = when (kind) {
        PaceKind.ESTABLISHING -> "Собираю данные"
        PaceKind.AGGRESSIVE_LOSS -> "Слишком быстрое снижение"
        PaceKind.OPTIMAL_LOSS -> "Оптимальное снижение"
        PaceKind.MAINTAINING -> "Стабильно"
        PaceKind.LEAN_GAIN -> "Чистый набор"
        PaceKind.FAST_GAIN -> "Быстрый набор"
    }
    open fun bodyTypeName(t: BodyType) = when (t) {
        BodyType.OBESE -> "Ожирение"
        BodyType.OVERWEIGHT -> "Избыточный вес"
        BodyType.THICK_SET -> "Коренастый"
        BodyType.LACK_EXERCISE -> "Мало нагрузки"
        BodyType.BALANCED -> "Сбалансированный"
        BodyType.BALANCED_MUSCULAR -> "Сбалансированно-мышечный"
        BodyType.SKINNY -> "Худощавый"
        BodyType.BALANCED_SKINNY -> "Стройный"
        BodyType.SKINNY_MUSCULAR -> "Сухой мышечный"
    }
    open fun metricName(m: BodyMetric) = when (m) {
        BodyMetric.BMI -> "ИМТ"
        BodyMetric.FAT -> "Жир"
        BodyMetric.MUSCLE -> "Мышцы"
        BodyMetric.WATER -> "Вода"
        BodyMetric.VISCERAL -> "Висцеральный жир"
        BodyMetric.BONE -> "Кости"
        BodyMetric.BMR -> "Базовый обмен"
        BodyMetric.PROTEIN -> "Белок"
        BodyMetric.BODY_AGE -> "Возраст тела"
        BodyMetric.IDEAL_WEIGHT -> "Идеальный вес"
    }
    open fun metricDescription(m: BodyMetric) = when (m) {
        BodyMetric.BMI -> "Отношение веса к квадрату роста. Грубый ориентир: не различает мышцы и жир."
        BodyMetric.FAT -> "Доля жировой ткани в массе тела по биоимпедансу."
        BodyMetric.MUSCLE -> "Масса скелетных и гладких мышц — главный «двигатель» обмена веществ."
        BodyMetric.WATER -> "Общая вода организма. Обезвоживание снижает точность весов и выносливость."
        BodyMetric.VISCERAL -> "Жир вокруг внутренних органов. Норма — уровень 1–9."
        BodyMetric.BONE -> "Минеральная масса костей. Растёт от силовых нагрузок, кальция и витамина D."
        BodyMetric.BMR -> "Калории, которые тело тратит в полном покое."
        BodyMetric.PROTEIN -> "Доля белка в теле. Низкие значения — риск потери мышц."
        BodyMetric.BODY_AGE -> "Метаболический возраст по составу тела."
        BodyMetric.IDEAL_WEIGHT -> "Ориентир по росту и полу."
    }

    // Scale
    open val scaleTitle = "Взвешивание"
    open val scaleSearching = "Ищу весы…"
    open val scaleStepOn = "Встань на весы босиком"
    open val scaleMeasuring = "Измеряю…"
    open val scaleImpedance = "Анализ состава тела — не сходи с весов"
    open val scaleConnecting = "Подключаюсь к весам…"
    open val scaleDone = "Готово!"
    open val scaleSave = "Сохранить взвешивание"
    open val scaleBtOff = "Bluetooth выключен"
    open val scaleBtOffHint = "Включи Bluetooth, чтобы найти весы."
    open val scalePermission = "Нужен доступ к Bluetooth"
    open val scalePermissionHint = "Разреши поиск устройств поблизости — без этого Android не покажет весы."
    open val scaleTimeout = "Весы не найдены"
    open val scaleTimeoutHint = "Встань на весы, чтобы они проснулись, и попробуй снова. Если весы другого бренда — подключи их приложение к Health Connect."
    open val scaleConnectionError = "Не удалось подключиться к весам"
    open val scaleSupported = "Поддерживаются: Xiaomi Mi Scale 1/2, Mi Body Composition Scale 2 и все весы со стандартным Bluetooth-профилем (Beurer, Sanitas, Medisana, Silvercrest и др.). Остальные — через Health Connect."
    open val scaleNoImpedance = "Без биоимпеданса (обувь/носки?) — сохраню только вес."
    open val openSettings = "Открыть настройки"
    open val grant = "Разрешить"
    open val turnOn = "Включить"
    open val manualEntry = "Ввести вручную"
    open val devicesFound = "Найдено"

    // Health Connect
    open val healthConnect = "Health Connect"
    open val healthConnectHint = "Шаги, тренировки и вес из Zepp Life, Mi Fitness, Samsung Health, Renpho, Withings, Huawei и других приложений."
    open val healthConnectInstall = "Установить Health Connect"
    open val healthConnectConnect = "Подключить"
    open val healthConnectConnected = "Подключено"
    open val importFromHealthConnect = "Импорт из Health Connect"
    open fun importedWeights(n: Int) = "Импортировано взвешиваний: $n"
    open val writeToHealthConnect = "Записывать вес в Health Connect"

    // Food
    open val food = "Питание"
    open val caloriesLeft = "Осталось"
    open val caloriesOver = "Перебор"
    open val eaten = "Съедено"
    open val burned = "Сожжено"
    open val goal = "Цель"
    open val protein = "Белки"
    open val carbs = "Углеводы"
    open val fat = "Жиры"
    open val water = "Вода"
    open val addMeal = "Добавить еду"
    open val mealName = "Название блюда"
    open val portion = "Порция"
    open val aiEstimate = "Посчитать с ИИ"
    open val aiEstimating = "Сумирэ считает калории…"
    open val photoMeal = "Фото блюда"
    open val recentFoods = "Недавние"
    open val noMealsTitle = "Пока пусто"
    open val noMealsSubtitle = "Опиши, что съел, — Сумирэ посчитает калории и БЖУ."
    open val customAmount = "Своё количество"
    open fun mealTypeName(t: MealType) = when (t) {
        MealType.BREAKFAST -> "Завтрак"
        MealType.LUNCH -> "Обед"
        MealType.DINNER -> "Ужин"
        MealType.SNACK -> "Перекус"
    }

    // Activity
    open val activity = "Активность"
    open val stepsTitle = "Шаги"
    open fun stepsLeft(n: String) = "Ещё $n до цели"
    open val stepGoalReached = "Цель по шагам выполнена!"
    open val stepGoal = "Цель по шагам"
    open val distance = "Дистанция"
    open val activeTime = "Активное время"
    open val workouts = "Тренировки"
    open val addWorkout = "Добавить тренировку"
    open val workoutTitle = "Название"
    open val duration = "Длительность"
    open val calories = "Калории"
    open val noWorkouts = "Тренировок пока нет"
    open val stepSource = "Источник шагов"
    open val stepSourceAuto = "Авто (Health Connect + датчик)"
    open val stepSourceSensor = "Датчик телефона"
    open val stepSourceHc = "Health Connect"
    open val stepSourceManual = "Вручную"
    open val enableStepTracking = "Включить подсчёт шагов"
    open val enableStepTrackingHint = "Разреши доступ к физической активности — буду считать шаги даже в фоне."
    open val editSteps = "Изменить шаги"
    open val weekSteps = "Шаги за неделю"
    open fun workoutCategoryName(c: WorkoutCategory) = when (c) {
        WorkoutCategory.STRENGTH -> "Силовая"
        WorkoutCategory.CARDIO -> "Кардио"
        WorkoutCategory.RUN -> "Бег"
        WorkoutCategory.WALK -> "Ходьба"
        WorkoutCategory.CYCLING -> "Велосипед"
        WorkoutCategory.SWIM -> "Плавание"
        WorkoutCategory.HIIT -> "ВИИТ"
        WorkoutCategory.YOGA -> "Йога / растяжка"
        WorkoutCategory.SPORTS -> "Спорт"
    }

    // Profile
    open val profile = "Профиль"
    open val healthProfile = "Профиль здоровья"
    open val gender = "Пол"
    open val male = "Мужской"
    open val female = "Женский"
    open val age = "Возраст"
    open val height = "Рост"
    open val currentWeight = "Текущий вес"
    open val targetWeight = "Желаемый вес"
    open val activityLevel = "Уровень активности"
    open val healthGoal = "Цель"
    open val waterGoal = "Норма воды"
    open val calorieGoal = "Калории в день"
    open val auto = "Авто"
    open fun activityLevelName(a: ActivityLevel) = when (a) {
        ActivityLevel.SEDENTARY -> "Сидячий"
        ActivityLevel.LIGHT -> "Лёгкий (1–3 тренировки)"
        ActivityLevel.MODERATE -> "Средний (3–5 тренировок)"
        ActivityLevel.VERY_ACTIVE -> "Высокий (6–7 тренировок)"
    }
    open fun goalName(g: HealthGoal) = when (g) {
        HealthGoal.LOSE -> "Похудеть"
        HealthGoal.MAINTAIN -> "Поддерживать"
        HealthGoal.GAIN -> "Набрать массу"
    }
    open val profileIncomplete = "Заполни профиль здоровья"
    open val profileIncompleteHint = "Без роста, возраста и веса не посчитать калории и состав тела."

    // Coach (AI)
    open val coachTitle = "Сумирэ"
    open val coachSubtitle = "Твой помощник по делам и здоровью"
    open val coachHint = "Спроси или попроси записать…"
    open val coachThinking = "Сумирэ думает…"
    open val coachNoKey = "Чтобы общаться с Сумирэ, добавь ключ Google Gemini API в настройках. Он бесплатный: aistudio.google.com"
    open val coachClear = "Очистить чат"
    open val coachSuggestions = listOf(
        "Как мой прогресс по весу?",
        "Запиши: съел овсянку с бананом",
        "Выпил 500 мл воды",
        "Составь план на сегодня",
        "Разбери мой состав тела",
    )
    open val logIt = "Записать"
    open val actionDone = "Выполнено"
    open val attachPhoto = "Фото"

    // Settings
    open val language = "Язык"
    open val theme = "Тема"
    open val themeSystem = "Как в системе"
    open val themeLight = "Светлая"
    open val themeDark = "Тёмная"
    open val sounds = "Звуки"
    open val haptics = "Вибрация"
    open val geminiKey = "Ключ Gemini API"
    open val geminiKeyHint = "Получить бесплатно на aistudio.google.com → Get API key"
    open val geminiModel = "Модель"
    open val notifications = "Уведомления"
    open val eveningReminder = "Напоминание о вечернем разборе"
    open val waterReminder = "Напоминать пить воду"
    open val security = "Безопасность"
    open val appLock = "Блокировка PIN-кодом"
    open val biometrics = "Отпечаток / лицо"
    open val pomodoroLength = "Длина помодоро"
    open val breakLength = "Длина перерыва"
    open val exportData = "Экспорт данных"
    open val importData = "Импорт данных"
    open val importDone = "Данные импортированы"
    open val importFailed = "Не удалось прочитать файл"
    open val version = "Версия"
    open val privacy = "Все данные хранятся на устройстве. В облако уходят только при входе в аккаунт."

    // Account / sync
    open val signIn = "Войти"
    open val signUp = "Регистрация"
    open val signOut = "Выйти"
    open val email = "Email"
    open val password = "Пароль"
    open val firstName = "Имя"
    open val server = "Сервер"
    open val syncNow = "Синхронизировать"
    open val syncing = "Синхронизация…"
    open fun lastSynced(t: String) = "Синхронизировано: $t"
    open val neverSynced = "Ещё не синхронизировано"
    open val accountHint = "Вход нужен только для синхронизации между устройствами и веб-версией."
    open val signInFailed = "Не удалось войти"

    // Lock
    open val enterPin = "Введи PIN-код"
    open val createPin = "Придумай PIN-код"
    open val repeatPin = "Повтори PIN-код"
    open val wrongPin = "Неверный PIN"
    open val pinMismatch = "PIN-коды не совпадают"
    open val unlock = "Разблокировать"

    // Notifications
    open val reminderEveningTitle = "Время вечернего разбора"
    open val reminderEveningBody = "Отметь сделанное и перенеси хвосты на завтра 🌙"
    open val reminderWaterTitle = "Глоток воды?"
    open val reminderWaterBody = "Сумирэ напоминает: стакан воды — и дальше в бой."
    open val focusRunning = "Идёт фокус-сессия"

    fun weekdayShort(isoDay: Int) = weekdaysShort[(isoDay - 1).coerceIn(0, 6)]
}

object RuStrings : Strings()

fun stringsFor(lang: AppLanguage): Strings = when (lang) {
    AppLanguage.RU -> RuStrings
    AppLanguage.UZ -> UzStrings
    AppLanguage.EN -> EnStrings
}

val LocalStrings = staticCompositionLocalOf<Strings> { RuStrings }

val S: Strings
    @Composable get() = LocalStrings.current
