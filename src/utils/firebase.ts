// Offline-first Mock Firebase/Local Storage and IndexedDB implementation for 100% network-independent operation.
import { VALID_SERIALS } from './firebase_serials';

export { VALID_SERIALS };

// Empty/mock exports for any direct imports to avoid build breakages
export const db = {} as any;
export const auth = {
  currentUser: {
    uid: 'offline_local_user',
    email: 'local@offline.app',
    emailVerified: true,
    isAnonymous: true,
    tenantId: null,
    providerData: []
  }
} as any;

// Helper to wrap any promise with a timeout (instant resolve for local operations)
export function promiseWithTimeout<T>(promise: Promise<T>, _timeoutMs: number = 15000, _errorMsg: string = ''): Promise<T> {
  return promise;
}

// Operation Types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: String(error),
    operationType,
    path,
    authInfo: {}
  };
  console.error('Local Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Quietly ensure user has anonymous session
export async function ensureSignedInAnonymously(): Promise<string> {
  return 'offline_local_user';
}

// Test live database connectivity on boot (always returns true for local)
export async function testFirestoreConnection(): Promise<boolean> {
  console.log('[Offline Mode] Local IndexedDB/LocalStorage state active. Connection mock OK.');
  return true;
}

/**
 * Validates the serial number format and presence in our 100 guaranteed keys.
 */
export function verifySerialFormat(serial: string): boolean {
  const trimmed = serial.trim().toUpperCase();
  return VALID_SERIALS.includes(trimmed);
}

// IndexedDB Helper Functions for 100% stable offline storage
const DB_NAME = 'KrotakLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'backups';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'serial' });
      }
    };
  });
}

async function saveToIndexedDB(serial: string, data: any): Promise<void> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ serial, data, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB Put Error:', err);
  }
}

async function getFromIndexedDB(serial: string): Promise<any | null> {
  try {
    const db = await openIndexedDB();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(serial);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB Get Error:', err);
    return null;
  }
}

/**
 * Checks a serial + networkName combination against local storage for activation or data recovery.
 * Bind serials to a network name forever locally, preventing renaming, and allowing instant restore.
 */
export async function activateAndRecover({
  serial,
  networkName
}: {
  serial: string;
  networkName: string;
}): Promise<{
  success: boolean;
  message: string;
  isNewActivation: boolean;
  restoredData?: {
    salesHistory: any[];
    shops: any[];
    prices?: any;
    distributorName?: string;
    distributorPhone?: string;
    pdfFooterNote?: string;
    isSoundEnabled?: boolean;
  };
}> {
  const trimmedSerial = serial.trim().toUpperCase();
  const trimmedNetwork = networkName.trim();

  if (!verifySerialFormat(trimmedSerial)) {
    return {
      success: false,
      message: 'سيريال التفعيل غير صحيَّح أو غير مدرج في نظام الـ 100 كود المضمونة لدينا!',
      isNewActivation: false
    };
  }

  try {
    // Get local mock activated serials database
    const localActivatedRaw = localStorage.getItem('local_activated_serials');
    const localActivated = localActivatedRaw ? JSON.parse(localActivatedRaw) : {};

    if (localActivated[trimmedSerial]) {
      const boundNetwork = localActivated[trimmedSerial].networkName;

      if (boundNetwork.toLowerCase() !== trimmedNetwork.toLowerCase()) {
        return {
          success: false,
          message: `عذراً! هذا السيريال مقيد ومُغلق لشبكة لاسلكية أخرى باسم: (${boundNetwork}) ولا يمكن تفعيله لشبكة باسم مختلف.`,
          isNewActivation: false
        };
      }

      // Try IndexedDB first, fallback to LocalStorage
      let backupData = await getFromIndexedDB(trimmedSerial);
      if (!backupData) {
        const localBackupRaw = localStorage.getItem(`local_backup_${trimmedSerial}`);
        if (localBackupRaw) {
          backupData = JSON.parse(localBackupRaw);
        }
      }

      if (backupData) {
        return {
          success: true,
          message: `أهلاً بك مجدداً! تم التحقق بنجاح واستعادة كافة بيانات ومعاملات وحسابات بقالات شبكة (${trimmedNetwork}) من التخزين المحلي الآمن بنجاح! 💾🎉`,
          isNewActivation: false,
          restoredData: {
            salesHistory: backupData.salesHistory || [],
            shops: backupData.shops || [],
            prices: backupData.prices || null,
            distributorName: backupData.distributorName || '',
            distributorPhone: backupData.distributorPhone || '',
            pdfFooterNote: backupData.pdfFooterNote || '',
            isSoundEnabled: backupData.isSoundEnabled ?? true
          }
        };
      }

      return {
        success: true,
        message: `تم التفعيل وإقران شبكة (${trimmedNetwork}) بنجاح محلياً! لا توجد بيانات محفوظة مسبقاً.`,
        isNewActivation: false
      };
    } else {
      // Register activation locally
      localActivated[trimmedSerial] = {
        serial: trimmedSerial,
        networkName: trimmedNetwork,
        activatedAt: new Date().toISOString()
      };
      localStorage.setItem('local_activated_serials', JSON.stringify(localActivated));

      return {
        success: true,
        message: `تهانينا! تم تفعيل السيريال محلياً وربطه بشبكتك (${trimmedNetwork}) بالكامل. تطبيقك يعمل الآن في وضع عدم الاتصال المستقر والآمن! 🚀💾`,
        isNewActivation: true
      };
    }
  } catch (err) {
    console.error('Local activation failure:', err);
    return {
      success: false,
      message: `خطأ أثناء معالجة التفعيل المحلي: ${err instanceof Error ? err.message : String(err)}`,
      isNewActivation: false
    };
  }
}

/**
 * Uploads current app data checkpoint to local IndexedDB and LocalStorage.
 */
export async function pushCloudBackup({
  serial,
  networkName,
  salesHistory,
  shops,
  prices,
  isSoundEnabled,
  distributorName,
  distributorPhone,
  pdfFooterNote
}: {
  serial: string;
  networkName: string;
  salesHistory: any[];
  shops: any[];
  prices: any;
  isSoundEnabled: boolean;
  distributorName: string;
  distributorPhone: string;
  pdfFooterNote: string;
}): Promise<boolean> {
  const trimmedSerial = serial.trim().toUpperCase();
  const trimmedNetwork = networkName.trim();

  if (!trimmedSerial || !trimmedNetwork) return false;

  try {
    // Auto-activate the serial locally if it isn't already
    const localActivatedRaw = localStorage.getItem('local_activated_serials');
    const localActivated = localActivatedRaw ? JSON.parse(localActivatedRaw) : {};
    if (!localActivated[trimmedSerial]) {
      localActivated[trimmedSerial] = {
        serial: trimmedSerial,
        networkName: trimmedNetwork,
        activatedAt: new Date().toISOString()
      };
      localStorage.setItem('local_activated_serials', JSON.stringify(localActivated));
    }

    // Save backup payload
    const payload = {
      serial: trimmedSerial,
      networkName: trimmedNetwork,
      salesHistory,
      shops,
      prices,
      isSoundEnabled,
      distributorName,
      distributorPhone,
      pdfFooterNote,
      updatedAt: new Date().toISOString()
    };

    // Save to IndexedDB (stable and fast for large local datasets)
    await saveToIndexedDB(trimmedSerial, payload);

    // Also fallback to localStorage to maintain full compatibility
    localStorage.setItem(`local_backup_${trimmedSerial}`, JSON.stringify(payload));
    console.log(`[Offline Backup] Data backed up successfully locally to IndexedDB & LocalStorage for serial ${trimmedSerial}.`);
    return true;
  } catch (err) {
    console.error('Failed storing local backup:', err);
    return false;
  }
}
