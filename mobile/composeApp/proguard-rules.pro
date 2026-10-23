# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.kairo.planner.**$$serializer { *; }
-keepclassmembers class com.kairo.planner.** { *** Companion; }
-keepclasseswithmembers class com.kairo.planner.** { kotlinx.serialization.KSerializer serializer(...); }

# Ktor / OkHttp
-dontwarn org.slf4j.**
-dontwarn io.ktor.**
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Koin uses reflection-free DSL, but keep ViewModel constructors used by viewModelOf
-keep class * extends androidx.lifecycle.ViewModel { <init>(...); }

# SQLDelight / Kable / misc optional deps
-dontwarn com.juul.kable.**
-dontwarn kotlinx.coroutines.debug.**
-dontwarn org.jetbrains.annotations.**
-dontwarn javax.annotation.**
-dontwarn java.lang.management.**
-keep class com.juul.kable.** { *; }
