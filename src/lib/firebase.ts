
// src/lib/firebase.ts

// 导入 Firebase SDK 所需的模块
import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Analytics 初始化暂时移除以排查问题
// 如果您需要其他服务，也在这里导入
import { getAuth } from "firebase/auth"; // 添加 auth 导入
import { getFunctions } from "firebase/functions"; // 添加 functions 导入


// 您的 Web 应用的 Firebase 配置信息。
// 这是您从 Firebase 控制台获取的项目配置。
// 理想情况下，在生产环境中，这些配置应通过环境变量管理。

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 增强日志：打印加载的配置，帮助调试
if (typeof window !== 'undefined') {
  console.log("Firebase Config Loaded by SDK:", {
    apiKey: firebaseConfig.apiKey ? '********' : 'NOT_LOADED', // 不直接打印API Key
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });
}


// 声明 Firebase 应用实例和服务的变量
let appInstance;
// let analyticsInstance; // Analytics 初始化暂时移除
let authInstance;
let functionsInstance;

// 检查是否在浏览器环境中运行，以避免在 Next.js 构建时（SSR/SSG）初始化客户端 SDK
if (typeof window !== 'undefined') {
  // 如果在浏览器中，则初始化 Firebase 应用
  if (!getApps().length) { // 检查是否已经有 Firebase 应用实例
    appInstance = initializeApp(firebaseConfig);
  } else {
    appInstance = getApp(); // 如果已经有一个应用，就获取它
  }

  // 初始化 Firebase Analytics 服务 - 暂时移除
  // try {
  //   if (appInstance && firebaseConfig.measurementId) { // 确保 measurementId 存在
  //     analyticsInstance = getAnalytics(appInstance);
  //   } else {
  //     console.warn("Firebase Analytics not initialized due to missing measurementId or app instance.");
  //   }
  // } catch (error) {
  //    console.error("Error initializing Firebase Analytics:", error);
  // }

  // 初始化 Auth 服务
  try {
    if (appInstance) {
      authInstance = getAuth(appInstance);
    }
  } catch (error) {
     console.error("Error initializing Firebase Auth:", error);
  }
  // 初始化 Functions 服务
  try {
    if (appInstance) {
      functionsInstance = getFunctions(appInstance);
      // 您可以在这里指定区域，如果您的函数部署在特定区域，例如：
      // functionsInstance = getFunctions(appInstance, 'asia-northeast1');
    }
  } catch (error) {
    console.error("Error initializing Firebase Functions:", error);
  }
}

// 导出实例。在服务器端构建时，这些导出将是 undefined，避免了初始化错误。
export const app = appInstance;
// export const analytics = analyticsInstance; // Analytics 初始化暂时移除
export const auth = authInstance; // 修正：确保导出 authInstance
export const functions = functionsInstance; // 修正：确保导出 functionsInstance
