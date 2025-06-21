// src/lib/firebase.ts

// 导入 Firebase SDK 所需的模块
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// 您的 Web 应用的 Firebase 配置信息。
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// --- 关键诊断日志 ---
// 此日志将出现在浏览器的开发者控制台 (F12) 中。
// 检查 apiKey, authDomain, projectId 是否都已 "Loaded"。
// 如果显示 "MISSING" 或 undefined，则证明您的 .env.local 文件未被正确加载。
if (typeof window !== 'undefined') {
    console.groupCollapsed('%cFirebase Init Check', 'color: #FFA500; font-weight: bold;');
    console.log('应用正在尝试使用以下配置初始化 Firebase:');
    console.table({
        apiKey: firebaseConfig.apiKey ? 'Loaded' : 'MISSING',
        authDomain: firebaseConfig.authDomain ? 'Loaded' : 'MISSING',
        projectId: firebaseConfig.projectId ? 'Loaded' : 'MISSING',
        appId: firebaseConfig.appId ? 'Loaded' : 'MISSING',
    });
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        console.error(
            "CRITICAL ERROR: Firebase 配置缺失或不完整。请执行以下操作：\n" +
            "1. 确认项目根目录下存在一个名为 '.env.local' 的文件。\n" +
            "2. 确保文件中的变量名以 'NEXT_PUBLIC_' 开头，并且值是正确的。\n" +
            "3. 每次修改 .env.local 文件后，都必须重启开发服务器 (Ctrl+C, 然后 npm run dev)。"
        );
    }
    console.groupEnd();
}


// 确保在任何环境下（服务器端或客户端）Firebase 应用只被初始化一次
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// 导出实例
export { app, auth, db };