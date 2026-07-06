package com.dahshah.calculator.utils

import android.content.Context
import android.os.Build
import android.os.Environment
import android.util.Log
import java.io.File

/**
 * Handles the offline file system structure for the "krotak" directory tree in external storage.
 * Creates 'Images', 'PDFs', and 'Backups' subfolders while respecting Android 11+ Scoped Storage constraints.
 */
object FileManager {
    private const val TAG = "KrotakFileManager"
    private const val ROOT_FOLDER_NAME = "krotak"
    
    const val SUB_IMAGES = "Images"
    const val SUB_PDFS = "PDFs"
    const val SUB_BACKUPS = "Backups"

    /**
     * Initializes the necessary application folders.
     */
    @JvmStatic
    fun initializeLocalFolders(context: Context): Boolean {
        try {
            val rootDir = getRootDirectory(context)
            if (rootDir == null) {
                Log.e(TAG, "Root directory could not be resolved.")
                return false
            }

            if (!rootDir.exists()) {
                val created = rootDir.mkdirs()
                Log.i(TAG, "Root folder created: $created (${rootDir.absolutePath})")
            }

            // Create subdirectories
            createSubDir(rootDir, SUB_IMAGES)
            createSubDir(rootDir, SUB_PDFS)
            createSubDir(rootDir, SUB_BACKUPS)

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing krotak directory layout", e)
            return false
        }
    }

    /**
     * Resolves the proper Root Storage directory based on Scoped Storage rules.
     */
    @JvmStatic
    fun getRootDirectory(context: Context): File? {
        var targetDir: File
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (Scoped Storage) - Documents/krotak or shared storage if permitted
            if (Environment.isExternalStorageManager()) {
                val externalDir = Environment.getExternalStorageDirectory()
                targetDir = File(externalDir, ROOT_FOLDER_NAME)
            } else {
                val documentsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
                targetDir = File(documentsDir, ROOT_FOLDER_NAME)
            }
        } else {
            // Legacy Storage
            val externalDir = Environment.getExternalStorageDirectory()
            targetDir = File(externalDir, ROOT_FOLDER_NAME)
        }

        // Fallback to internal/external app files dir if shared directory is not writable/accessible
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
            val appExternalDir = context.getExternalFilesDir(null)
            if (appExternalDir != null) {
                targetDir = File(appExternalDir, ROOT_FOLDER_NAME)
            }
        }

        return targetDir
    }

    /**
     * Helper to retrieve a specific subfolder path.
     */
    @JvmStatic
    fun getSubFolder(context: Context, subFolderName: String): File? {
        val rootDir = getRootDirectory(context) ?: return null
        val subDir = File(rootDir, subFolderName)
        if (!subDir.exists()) {
            subDir.mkdirs()
        }
        return subDir
    }

    /**
     * Checks if the app has the MANAGE_EXTERNAL_STORAGE permission on Android 11+ (API 30+).
     */
    @JvmStatic
    fun hasManageExternalStoragePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            true // Automatic permission for older APIs via standard write permissions
        }
    }

    private fun createSubDir(parent: File, name: String) {
        val subDir = File(parent, name)
        if (!subDir.exists()) {
            val created = subDir.mkdir()
            Log.i(TAG, "Subdirectory '$name' created: $created")
        }
    }
}
