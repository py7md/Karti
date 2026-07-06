# دليل إعداد وتفعيل Firebase للمنصات الثلاث (ويب، أندرويد، iOS) 🚀

تم إعداد هذا الدليل الشامل لمساعدتك في ربط وتفعيل تطبيق **"حاسبة الدحشة"** على منصات **الويب (React/Vite)**، **أندرويد (Kotlin/Android Studio)**، و **iOS (Swift/Xcode)** مع حل المشاكل البرمجية والتحذيرات التي تواجهها حالياً.

---

## 1. حل المشاكل البرمجية الحالية (خطوة بخطوة)

### ❌ المشكلة الأولى: `Firebase: No Firestore database found`
*   **سبب المشكلة:** لقد قمت بإنشاء مشروع Firebase وتفعيل **Realtime Database** فقط، لكن الكود يبحث عن قاعدة بيانات **Cloud Firestore** وهي منتج منفصل تماماً داخل كونسول Firebase.
*   **الحل والخطوات الدقيقة للتأكيد:**
    1. اذهب إلى [موقع Firebase Console](https://console.firebase.google.com/).
    2. اختر مشروعك `krot-4abc5`.
    3. من القائمة الجانبية، اذهب إلى **Build** ثم اختر **Firestore Database**.
    4. اضغط على زر **Create database** (إنشاء قاعدة بيانات).
    5. اختر **Start in production mode** (البدء في وضع الإنتاج) لحماية بياناتك.
    6. اختر موقع الخادم الأقرب لجمهورك (مثلاً `eur3` أو `us-central` أو أي موقع تفضله).
    7. اضغط على **Enable** لتفعيل قاعدة البيانات. بمجرد تفعيلها، سيتوقف هذا الخطأ فوراً!

### ❌ المشكلة الثانية: `auth/admin-restricted-operation`
*   **سبب المشكلة:** يحاول التطبيق تسجيل الدخول بشكل مجهول (Anonymous Auth) لتأمين الاتصال بقاعدة البيانات وحفظ النسخ الاحتياطية، ولكن هذه الطريقة معطلة حالياً في إعدادات مشروعك على Firebase.
*   **الحل والخطوات الدقيقة لتفعيلها:**
    1. في كونسول Firebase، اذهب إلى القائمة الجانبية واختر **Build** ثم **Authentication**.
    2. اضغط على تبويب **Sign-in method** (طريقة تسجيل الدخول).
    3. اضغط على **Add new provider** (إضافة موفر جديد) تحت قسم **Sign-in providers**.
    4. اختر **Anonymous** (مجهول) من القائمة.
    5. قم بتفعيل الخيار (Switch to **Enable**) ثم اضغط على **Save** (حفظ).
    6. الآن، سيعمل نظام تسجيل الدخول التلقائي والمجهول لتأمين النسخ الاحتياطية دون أي مشاكل!

---

## 2. تهيئة الويب (React / Vite) باستخدام Modular SDK v10

الكود مُهيأ بالكامل ويعمل في تطبيقك داخل الملف المخصص `src/utils/firebase.ts` وهو مرتبط بملف الإعدادات الموحد `firebase-applet-config.json`. يمكنك استخدامه وتصديره في أي مكان كالتالي:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تصدير الأدوات لاستخدامها في باقي المكونات
export const db = getFirestore(app);
export const auth = getAuth(app);
```

---

## 3. تهيئة منصة أندرويد (Kotlin / Android Studio)

لتفعيل Firebase على تطبيق الأندرويد الذي يتم إنشاؤه عبر Capacitor، اتبع الخطوات التالية:

### الخطوة 1: إضافة ملف `google-services.json`
1. اذهب إلى كونسول Firebase -> إعدادات المشروع (Project Settings).
2. في قسم **Your apps**، اضغط على **Add app** واختر أيقونة **Android**.
3. أدخل اسم الحزمة (Package Name) الخاص بك بالضبط وهو: `com.dahshah.calculator` (كما هو محدد في ملف `capacitor.config.ts`).
4. قم بتحميل ملف `google-services.json`.
5. انسخ الملف وضعه داخل المجلد التالي في مشروعك:
   `android/app/google-services.json`

### الخطوة 2: إعداد مستودعات واعتماديات الـ Gradle

تم تجهيز الإعدادات مسبقاً في مشروعك، وإليك الهيكلية المطبقة لتتأكد منها داخل Android Studio:

#### أ) ملف build.gradle على مستوى المشروع (`android/build.gradle`):
```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.13.0'
        classpath 'com.google.gms:google-services:4.4.4' // مضاف مسبقاً لتنشيط خدمات جوجل
    }
}
```

#### ب) ملف build.gradle على مستوى التطبيق (`android/app/build.gradle`):
يحتوي الملف مسبقاً على الكود الذكي لتفعيل الإضافة تلقائياً بمجرد رصد ملف الإعدادات:
```gradle
dependencies {
    // مكتبات Firebase الأساسية لأندرويد
    implementation platform('com.google.firebase:firebase-bom:33.1.0')
    implementation 'com.google.firebase:firebase-analytics-ktx'
    implementation 'com.google.firebase:firebase-firestore-ktx'
    implementation 'com.google.firebase:firebase-auth-ktx'
    
    // اعتماديات كاباسيتور
    implementation project(':capacitor-android')
}

// تفعيل إضافة Google Services تلقائياً عند وجود الملف
try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied.")
}
```

---

## 4. تهيئة منصة iOS (Swift / Xcode)

### الخطوة 1: إضافة ملف `GoogleService-Info.plist`
1. في كونسول Firebase -> إعدادات المشروع، اضغط على **Add app** واختر **iOS**.
2. أدخل معرف الحزمة (Bundle ID) الخاص بتطبيقك (مثلاً `com.dahshah.calculator`).
3. قم بتحميل ملف `GoogleService-Info.plist`.
4. افتح مشروعك في Xcode باستخدام الملف `ios/App/App.xcworkspace`.
5. اسحب ملف `GoogleService-Info.plist` وأفلته داخل مجلد **App** في Xcode (تأكد من تحديد خيار *Copy items if needed* و واختيار هدف *App*).

### الخطوة 2: تهيئة Firebase في الكود (Swift)

افتح ملف `AppDelegate.swift` وضعه بالشكل التالي لتهيئة التطبيق عند الإقلاع:

```swift
import UIKit
import Capacitor
import FirebaseCore // 1. استيراد مكتبة Firebase

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // 2. تهيئة Firebase SDK عند إقلاع التطبيق
        FirebaseApp.configure()
        
        return true
    }
    
    // باقي دوال AppDelegate...
}
```

---

## 5. ممارسات أمنية هامة لحماية مفاتيح API Keys 🔒

يتساءل الكثيرون عن كيفية حماية `apiKey` الخاص بـ Firebase. إليك الحقائق والحلول الموصى بها عملياً:

1.  **طبيعة مفتاح Firebase API Key:**
    *   على عكس مفاتيح الاستدعاء الأخرى (مثل OpenAI أو Stripe)، فإن مفتاح Firebase API Key **ليس سراً بالمعنى التقليدي**. هو معرف للمشروع على خوادم جوجل ليتمكن التطبيق من الاتصال بالخدمة.
    *   جوجل تصمم Firebase ليكون المفتاح مدمجاً داخل كود الويب والموبايل. الحماية الحقيقية **لا تكمن في إخفاء المفتاح** بل في ضبط **Security Rules** (قواعد الأمان)!

2.  **أفضل ممارسات الحماية بالتفصيل:**
    *   **تفعيل قواعد الأمان (Firestore Security Rules):** لقد قمنا بتثبيت ملف قواعد أمان فائق القوة في مشروعك (`firestore.rules`). هذه القواعد تمنع أي شخص غريب من القراءة أو الكتابة إلا إذا كان السيريال حقيقياً ومطابقاً للنمط ومقيداً بالعملية الصحيحة.
    *   **تقييد المفتاح في كونسول Google Cloud:** اذهب إلى [Google Cloud Console API Credentials](https://console.cloud.google.com/apis/credentials)، واختر مفتاح Firebase API الخاص بك وقم بتقييده ليعمل فقط على نطاق موقعك الإلكتروني (HTTP Referrers) أو مع معرف حزمة تطبيقك للأندرويد و iOS.
    *   **استخدام متغيرات البيئة في الويب (Vite Env Variables):**
        تجنب كتابة المفاتيح مباشرة في الملفات المرفوعة للعموم على GitHub. بدلاً من ذلك، نستخدم متغيرات البيئة مثل:
        ```env
        VITE_FIREBASE_API_KEY=AIzaSy...
        ```
        ويتم استدعاؤها في كود الويب عبر `import.meta.env.VITE_FIREBASE_API_KEY`.

---

## 6. قواعد الأمان المثبتة والنشطة في مشروعك (`firestore.rules`)

يحتوي ملف `firestore.rules` في جذر مشروعك على قواعد أمان صارمة تضمن عدم وصول أي مستخدم لبيانات مستخدم آخر:
*   يمنع القراءة أو الكتابة العشوائية بشكل كامل (`allow read, write: if false;`).
*   يسمح بالتحقق فقط من السيريلات المطابقة لصيغة `DAH-XXXX-XXXX` لضمان صحة الأكواد.
*   يمنع تعديل أو حذف أي تفعيل سابق لمنع السرقة أو التغيير العشوائي من قبل المستخدمين الآخرين.
*   يسمح بعمل النسخ الاحتياطي ومطابقته فقط مع اسم الشبكة المسجل والمقيد بها السيريال لضمان الحماية المطلقة للبيانات والخصوصية.

---
**💡 نصيحة أخيرة للتطوير المحلي:**
عند تشغيل التطبيق محلياً وبمجرد قيامك بتفعيل **Cloud Firestore** و **Anonymous Auth** في الكونسول الخاص بك، ستلاحظ اختفاء كافة رسائل الأخطاء تماماً، وسيعمل التطبيق بسلاسة تامة ومزامنة سريعة وسحرية! ☁️✨
