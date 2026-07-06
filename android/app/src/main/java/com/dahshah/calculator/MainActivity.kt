package com.dahshah.calculator

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.dahshah.calculator.backup.GoogleDriveManager
import com.dahshah.calculator.utils.FileManager
import com.getcapacitor.BridgeActivity
import java.io.File

/**
 * Main entrance activity for Krotak Calculator (Capacitor Webview).
 * Manages runtime storage permissions for all Android versions (Legacy & Scoped Storage API 30+),
 * handles local file directory structures, and contains hooks to test Google Drive backups.
 */
class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "KrotakMainActivity"
        private const val STORAGE_PERMISSION_CODE = 1001
        private const val MANAGE_STORAGE_REQUEST_CODE = 1002
    }

    private lateinit var googleDriveManager: GoogleDriveManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 1. Register Capactior Plugins
        registerPlugin(LocalContactsPlugin::class.java)

        // 2. Initialize Google Drive Manager
        googleDriveManager = GoogleDriveManager(this)

        // 3. Request Storage Permissions and Initialize Folders
        checkAndRequestStoragePermissions()
    }

    /**
     * Checks and requests appropriate storage permissions depending on Android system version.
     */
    private fun checkAndRequestStoragePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+) requires MANAGE_EXTERNAL_STORAGE for "krotak/" shared folders
            if (Environment.isExternalStorageManager()) {
                Log.i(TAG, "MANAGE_EXTERNAL_STORAGE permission is already granted.")
                initializeFolders()
            } else {
                Log.w(TAG, "MANAGE_EXTERNAL_STORAGE not granted. Redirecting user to system settings...")
                try {
                    val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivityForResult(intent, MANAGE_STORAGE_REQUEST_CODE)
                } catch (e: Exception) {
                    // Fallback to general manage storage screen if package specific screen fails
                    val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    startActivityForResult(intent, MANAGE_STORAGE_REQUEST_CODE)
                }
                Toast.makeText(
                    this,
                    "يرجى تفعيل صلاحية الوصول للملفات لضمان عمل النسخ الاحتياطي المحلي.",
                    Toast.LENGTH_LONG
                ).show()
            }
        } else {
            // Legacy Android permissions (WRITE_EXTERNAL_STORAGE / READ_EXTERNAL_STORAGE)
            val readPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
            val writePermission = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)

            if (readPermission == PackageManager.PERMISSION_GRANTED && writePermission == PackageManager.PERMISSION_GRANTED) {
                initializeFolders()
            } else {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(
                        Manifest.permission.READ_EXTERNAL_STORAGE,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    ),
                    STORAGE_PERMISSION_CODE
                )
            }
        }
    }

    /**
     * Re-initializes krotak directory layouts.
     */
    private fun initializeFolders() {
        val success = FileManager.initializeLocalFolders(this)
        if (success) {
            Log.i(TAG, "Local folders successfully established under krotak/.")
        } else {
            Log.e(TAG, "Failed or skipped folder creation.")
        }
    }

    // =========================================================================
    // Permission callbacks
    // =========================================================================

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == STORAGE_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Legacy storage permission granted by user.")
                initializeFolders()
            } else {
                Log.w(TAG, "Legacy storage permission denied by user.")
                Toast.makeText(
                    this,
                    "تم رفض صلاحية التخزين! قد لا تتمكن من حفظ الفواتير محلياً.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == MANAGE_STORAGE_REQUEST_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (Environment.isExternalStorageManager()) {
                    Log.i(TAG, "MANAGE_EXTERNAL_STORAGE permission granted in Settings.")
                    initializeFolders()
                } else {
                    Log.w(TAG, "MANAGE_EXTERNAL_STORAGE permission denied by user in Settings.")
                    Toast.makeText(
                        this,
                        "تم رفض الصلاحية الكلية للملفات. سيتم حفظ ملفاتك داخل المجلد الخاص بالتطبيق فقط.",
                        Toast.LENGTH_LONG
                    ).show()
                    initializeFolders() // Initialize fallback directories in internal files folder
                }
            }
        }
    }

    // =========================================================================
    // Test Integration Routines (For Developers & Plugins)
    // =========================================================================

    /**
     * Trigger a test upload of the latest file inside the local krotak/Backups directory to Google Drive.
     */
    fun runTestBackupUpload() {
        if (!googleDriveManager.isUserSignedIn()) {
            Log.w(TAG, "Cannot run test backup. Google User is not signed in.")
            return
        }

        googleDriveManager.uploadLatestBackupFromKrotak(object : GoogleDriveManager.BackupCallback<String> {
            override fun onSuccess(result: String) {
                Log.i(TAG, "Test upload successful. File ID: $result")
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "تم رفع النسخة الاحتياطية بنجاح إلى Google Drive!", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(e: Exception) {
                Log.e(TAG, "Test upload failed.", e)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "فشل رفع النسخة: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        })
    }

    /**
     * Trigger a test restore of the latest file matching backup parameters from Google Drive.
     */
    fun runTestBackupRestore() {
        if (!googleDriveManager.isUserSignedIn()) {
            Log.w(TAG, "Cannot run test restore. Google User is not signed in.")
            return
        }

        googleDriveManager.restoreLatestBackup(object : GoogleDriveManager.BackupCallback<File> {
            override fun onSuccess(result: File) {
                Log.i(TAG, "Test restore successful. Restored to: ${result.absolutePath}")
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "تم استرداد أحدث نسخة بنجاح من Google Drive!", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onFailure(e: Exception) {
                Log.e(TAG, "Test restore failed.", e)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "فشل استرداد النسخة: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        })
    }
}
