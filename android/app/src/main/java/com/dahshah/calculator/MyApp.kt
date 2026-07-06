package com.dahshah.calculator

import android.app.Application
import android.util.Log
import com.dahshah.calculator.data.AppDatabase
import com.dahshah.calculator.utils.FileManager

/**
 * Custom Application class for initializing local folders and DB parameters on startup.
 */
class MyApp : Application() {

    companion object {
        private const val TAG = "KrotakMyApp"
        lateinit var instance: MyApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        Log.i(TAG, "Initializing Krotak application environments in Kotlin...")

        // 1. Initialize local folder structures under standard krotak/ (Images, PDFs, Backups)
        val folderInitSuccess = FileManager.initializeLocalFolders(this)
        if (folderInitSuccess) {
            Log.i(TAG, "Local folders successfully established under krotak/ (Images, PDFs, Backups).")
        } else {
            Log.e(TAG, "Failed or skipped local folder structure creation due to permissions.")
        }

        // 2. Pre-initialize Room SQLite Database to ensure connectivity
        try {
            AppDatabase.getDatabase(this)
            Log.i(TAG, "AppDatabase (Room SQLite) initialized successfully on startup.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize AppDatabase on startup.", e)
        }
    }
}
