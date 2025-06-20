"use strict";
// functions/src/getInsuranceStats.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInsuranceStats = void 0;
// 导入 Firebase Functions 和 Admin SDK
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// 不再需要 path 和 fs，因为我们将从 Firestore 读取
// import * as path from 'path'; 
// import * as fs from 'fs';   
// 确保 Firebase Admin SDK 已经初始化，只初始化一次
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * [HTTPS Callable Function]
 * 安全地提供保险统计数据。
 * 该函数要求调用者必须通过 Firebase Authentication 进行身份验证，并从 Firestore 读取数据。
 */
exports.getInsuranceStats = functions.https.onCall(async (data, context) => {
    // 1. 验证用户是否已登录 (认证检查)
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    // 可选：更细粒度的授权检查
    // 例如：
    // if (context.auth.token.role !== 'admin') {
    //   throw new functions.https.HttpsError(
    //     'permission-denied',
    //     'Only administrators can access this data.'
    //   );
    // }
    try {
        // 2. 从 Firestore 数据库获取数据
        const db = admin.firestore();
        // 假设您的统计数据存储在名为 'v4_period_data' 的集合中
        const collectionRef = db.collection('v4_period_data');
        // 获取集合中的所有文档
        const querySnapshot = await collectionRef.get();
        // 将文档数据映射为数组
        const insuranceStats = [];
        querySnapshot.forEach(doc => {
            insuranceStats.push(doc.data());
        });
        // 3. 返回统计数据
        return { status: 'success', data: insuranceStats };
    }
    catch (error) {
        console.error('Error fetching insurance stats from Firestore:', error);
        // 抛出内部错误，避免暴露敏感信息
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while fetching data from the database.');
    }
});
//# sourceMappingURL=getInsuranceStats.js.map