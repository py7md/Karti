# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# =========================================================================
# 1. Room Database Protection
# =========================================================================
-keep class * extends androidx.room.RoomDatabase
-keepclassmembers class * extends androidx.room.RoomDatabase {
    <init>(...);
}
-keep @androidx.room.Database class *
-keep @androidx.room.Dao interface *
-keep @androidx.room.Entity class *
-keep class * {
    @androidx.room.Database *;
    @androidx.room.Dao *;
    @androidx.room.Entity *;
}
-dontwarn androidx.room.paging.**

# =========================================================================
# 2. Google Drive and General Google API Client Libraries
# =========================================================================
-keep class com.google.api.services.drive.** { *; }
-keep class com.google.api.client.** { *; }
-keep class com.google.api.client.json.gson.GsonFactory { *; }
-keepattributes Signature,RuntimeVisibleAnnotations,AnnotationDefault,*Annotation*

# Keep the fields annotated with @Key for JSON parsing
-keepclassmembers class * {
    @com.google.api.client.util.Key <fields>;
}

# =========================================================================
# 3. Kotlin Coroutines Protection
# =========================================================================
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

