package com.dahshah.calculator.backup

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Environment
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import com.google.android.gms.tasks.Task
import com.google.api.client.googleapis.extensions.android.gms.auth.GoogleAccountCredential
import com.google.api.client.http.FileContent
import com.google.api.client.http.javanet.NetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.drive.Drive
import com.google.api.services.drive.DriveScopes
import com.google.api.services.drive.model.File as DriveFile
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.Collections
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Handles authenticating, uploading, and restoring database and backup files 
 * from the local "krotak/Backups" directory to the user's private Google Drive storage.
 * 
 * Supports offline error handling, automatic recovery of the latest backup,
 * and standard Google Sign-In flows.
 */
class GoogleDriveManager(private val context: Context) {

    private val executorService: ExecutorService = Executors.newSingleThreadExecutor()

    companion object {
        private const val TAG = "KrotakGoogleDrive"
        private const val BACKUP_DIR_NAME = "krotak/Backups"
    }

    /**
     * Callback interface for asynchronous database backup and recovery operations.
     */
    interface BackupCallback<T> {
        fun onSuccess(result: T)
        fun onFailure(e: Exception)
    }

    // ==========================================
    // 1. Authentication and Google Sign-In
    // ==========================================

    /**
     * Builds standard GoogleSignInOptions for Drive File access.
     */
    private fun getGoogleSignInOptions(): GoogleSignInOptions {
        return GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(DriveScopes.DRIVE_FILE))
            .build()
    }

    /**
     * Gets the Google SignIn Client instance.
     */
    fun getSignInClient(): GoogleSignInClient {
        return GoogleSignIn.getClient(context, getGoogleSignInOptions())
    }

    /**
     * Gets the Intent to launch the Google Sign-In activity.
     */
    fun getSignInIntent(): Intent {
        return getSignInClient().signInIntent
    }

    /**
     * Checks if the user is already signed in with a Google Account.
     */
    fun isUserSignedIn(): Boolean {
        return GoogleSignIn.getLastSignedInAccount(context) != null
    }

    /**
     * Gets the current signed in Google account.
     */
    fun getSignedInAccount(): GoogleSignInAccount? {
        return GoogleSignIn.getLastSignedInAccount(context)
    }

    /**
     * Signs the user out from Google.
     */
    fun signOut(callback: BackupCallback<Void?>) {
        getSignInClient().signOut().addOnCompleteListener { task ->
            if (task.isSuccessful) {
                Log.d(TAG, "User signed out successfully.")
                callback.onSuccess(null)
            } else {
                Log.e(TAG, "Sign-out failed", task.exception)
                callback.onFailure(task.exception ?: Exception("Unknown error during sign-out"))
            }
        }
    }

    /**
     * Helper to retrieve Google Account credential from the signed-in user.
     */
    private fun getCredential(): GoogleAccountCredential? {
        val account = getSignedInAccount()
        if (account == null) {
            Log.e(TAG, "No Google user logged in. Authentication required.")
            return null
        }

        val credential = GoogleAccountCredential.usingOAuth2(
            context, Collections.singleton(DriveScopes.DRIVE_FILE)
        )
        credential.selectedAccount = account.account
        return credential
    }

    /**
     * Builds and returns a Google Drive Service instance.
     */
    private fun getDriveService(): Drive? {
        val credential = getCredential() ?: return null

        return Drive.Builder(
            NetHttpTransport(),
            GsonFactory(),
            credential
        ).setApplicationName("Krotak Calculator").build()
    }

    // ==========================================
    // Local Directory Helpers
    // ==========================================

    /**
     * Resolves the local "krotak/Backups" directory on the device.
     */
    fun getLocalBackupDirectory(): File {
        // Try external storage directory first
        val externalStorage = Environment.getExternalStorageDirectory()
        val backupDir = File(externalStorage, BACKUP_DIR_NAME)
        
        if (!backupDir.exists()) {
            // Create if it doesn't exist
            backupDir.mkdirs()
        }
        
        // Fallback to app's external files dir if root external is not writable or failed
        if (!backupDir.canWrite()) {
            val appFilesDir = context.getExternalFilesDir(null)
            val fallbackDir = File(appFilesDir, BACKUP_DIR_NAME)
            if (!fallbackDir.exists()) {
                fallbackDir.mkdirs()
            }
            return fallbackDir
        }
        
        return backupDir
    }

    // ==========================================
    // 2. Upload Backup to Google Drive
    // ==========================================

    /**
     * Uploads a local file (e.g. database file or zipped backup) from the local storage
     * to the user's private Google Drive using Google Drive REST API v3.
     */
    fun uploadBackupFile(localFile: File, callback: BackupCallback<String>) {
        executorService.execute {
            val driveService = getDriveService()
            if (driveService == null) {
                callback.onFailure(Exception("Authentication failed. Please sign in to Google first."))
                return@execute
            }

            // Verify if internet is available before proceeding
            if (!isNetworkAvailable()) {
                callback.onFailure(IOException("عذراً، انقطع الاتصال بالإنترنت. يرجى التحقق من الشبكة وإعادة المحاولة."))
                return@execute
            }

            try {
                // Set metadata for the file on Drive
                val fileMetadata = DriveFile().apply {
                    name = localFile.name
                    mimeType = getMimeType(localFile)
                }

                // Media content payload
                val mediaContent = FileContent(getMimeType(localFile), localFile)

                // Execute the creation request
                val uploadedFile = driveService.files().create(fileMetadata, mediaContent)
                    .setFields("id, name, size")
                    .execute()

                Log.i(TAG, "Uploaded backup successfully. ID: ${uploadedFile.id}")
                callback.onSuccess(uploadedFile.id)
            } catch (e: Exception) {
                Log.e(TAG, "Error uploading backup file", e)
                callback.onFailure(Exception("فشل في رفع النسخة الاحتياطية سحابياً: ${e.localizedMessage}", e))
            }
        }
    }

    /**
     * Uploads the latest file inside the "krotak/Backups" folder to Google Drive.
     */
    fun uploadLatestBackupFromKrotak(callback: BackupCallback<String>) {
        val backupDir = getLocalBackupDirectory()
        val files = backupDir.listFiles()
        
        if (files == null || files.isEmpty()) {
            callback.onFailure(Exception("لا توجد ملفات نسخ احتياطي في المجلد المحلي krotak/Backups"))
            return
        }

        // Sort to get the most recently modified file
        val latestFile = files.filter { it.isFile }.maxByOrNull { it.lastModified() }
        
        if (latestFile == null) {
            callback.onFailure(Exception("لا توجد ملفات صالحة في مجلد النسخ الاحتياطي."))
            return
        }

        uploadBackupFile(latestFile, callback)
    }

    // ==========================================
    // 3. Download/Restore Latest Backup from Google Drive
    // ==========================================

    /**
     * Searches for backups on Google Drive, downloads the latest one based on modified time,
     * and saves it locally in the "krotak/Backups" directory.
     */
    fun restoreLatestBackup(callback: BackupCallback<File>) {
        executorService.execute {
            val driveService = getDriveService()
            if (driveService == null) {
                callback.onFailure(Exception("Authentication failed. Please sign in to Google first."))
                return@execute
            }

            if (!isNetworkAvailable()) {
                callback.onFailure(IOException("عذراً، انقطع الاتصال بالإنترنت. يرجى التحقق من الشبكة وإعادة المحاولة."))
                return@execute
            }

            try {
                // Query drive to list files matching typical backup names or mimeTypes, ordered by modified time desc
                val resultList = driveService.files().list()
                    .setQ("trashed = false and (name contains 'backup' or mimeType = 'application/json' or mimeType = 'application/zip')")
                    .setOrderBy("modifiedTime desc")
                    .setPageSize(10) // fetch up to 10 to inspect
                    .setFields("files(id, name, mimeType, modifiedTime)")
                    .execute()

                val files = resultList.files
                if (files.isNullOrEmpty()) {
                    callback.onFailure(Exception("لم يتم العثور على أي نسخ احتياطية محفوظة على Google Drive الخاص بك."))
                    return@execute
                }

                // Get the newest file
                val latestDriveFile = files[0]
                val fileId = latestDriveFile.id
                val fileName = latestDriveFile.name

                // Resolve destination path in local "krotak/Backups"
                val localDir = getLocalBackupDirectory()
                val destinationFile = File(localDir, fileName)

                // Download the file
                FileOutputStream(destinationFile).use { outputStream ->
                    driveService.files().get(fileId)
                        .executeMediaAndDownloadTo(outputStream)
                }

                Log.i(TAG, "Latest backup restored successfully to: ${destinationFile.absolutePath}")
                callback.onSuccess(destinationFile)
            } catch (e: Exception) {
                Log.e(TAG, "Error restoring latest backup", e)
                callback.onFailure(Exception("فشل استيراد النسخة الاحتياطية من السحابة: ${e.localizedMessage}", e))
            }
        }
    }

    /**
     * Downloads a specific Google Drive backup file by ID to the local krotak/Backups folder.
     */
    fun downloadBackupFile(fileId: String, fileName: String, callback: BackupCallback<File>) {
        executorService.execute {
            val driveService = getDriveService()
            if (driveService == null) {
                callback.onFailure(Exception("Authentication failed. Please sign in to Google first."))
                return@execute
            }

            if (!isNetworkAvailable()) {
                callback.onFailure(IOException("عذراً، انقطع الاتصال بالإنترنت. يرجى التحقق من الشبكة وإعادة المحاولة."))
                return@execute
            }

            try {
                val localDir = getLocalBackupDirectory()
                val destinationFile = File(localDir, fileName)

                FileOutputStream(destinationFile).use { outputStream ->
                    driveService.files().get(fileId)
                        .executeMediaAndDownloadTo(outputStream)
                }

                Log.i(TAG, "File downloaded successfully.")
                callback.onSuccess(destinationFile)
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading file $fileId", e)
                callback.onFailure(Exception("فشل في تحميل الملف: ${e.localizedMessage}", e))
            }
        }
    }

    // ==========================================
    // 4. Utility Methods for Network Status and MimeTypes
    // ==========================================

    /**
     * Checks if the device is currently connected to the internet.
     */
    private fun isNetworkAvailable(): Boolean {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? android.net.ConnectivityManager
            val activeNetwork = cm?.activeNetworkInfo
            activeNetwork != null && activeNetwork.isConnected
        } catch (e: Exception) {
            true // default to true to allow attempt if unable to query manager
        }
    }

    /**
     * Infers MimeType for a file based on its extension.
     */
    private fun getMimeType(file: File): String {
        return when (file.extension.lowercase()) {
            "zip" -> "application/zip"
            "json" -> "application/json"
            "db", "sqlite" -> "application/octet-stream"
            else -> "application/octet-stream"
        }
    }
}
