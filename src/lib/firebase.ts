// src/lib/firebase.ts

// 导入 Firebase SDK 所需的模块
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 如果您需要其他服务，也在这里导入
import { getAuth } from "firebase/auth"; // 添加 auth 导入
import { getFunctions } from "firebase/functions"; // 添加 functions 导入


// 您的 Web 应用的 Firebase 配置信息。
// 这是您从 Firebase 控制台获取的项目配置。
// 理想情况下，在生产环境中，这些配置应通过环境变量管理。
const firebaseConfig = {
  apiKey: "AIzaSyAnnMRHKjWmCfAwVsjUpc8afq2B6JSu_qE",
  authDomain: "datalens-insights-2fh8a.firebaseapp.com",
  projectId: "datalens-insights-2fh8a",
  storageBucket: "datalens-insights-2fh8a.firebasestorage.app",
  messagingSenderId: "131019146027",
  appId: "1:131019146027:web:7a13f50de944e24d193b6e",
  measurementId: "G-8YLR1SNBLL"
};

// 声明 Firebase 应用实例和服务的变量
let appInstance;
let analyticsInstance;
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

  // 初始化 Firebase Analytics 服务
  analyticsInstance = getAnalytics(appInstance);
  // 初始化 Auth 服务
  authInstance = getAuth(appInstance);
  // 初始化 Functions 服务
  functionsInstance = getFunctions(appInstance);
}

// 导出实例。在服务器端构建时，这些导出将是 undefined，避免了初始化错误。
export const app = appInstance;
export const analytics = analyticsInstance;
export const auth = authInstance;
export const functions = functionsInstance;
