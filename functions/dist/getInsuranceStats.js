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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// 确保 Firebase Admin SDK 已经初始化，只初始化一次
if (!admin.apps.length) {
    admin.initializeApp();
    functions.logger.info("Firebase Admin SDK initialized.", { structuredData: true });
}
/**
 * [HTTPS Callable Function]
 * 安全地提供保险统计数据。
 * 该函数要求调用者必须通过 Firebase Authentication 进行身份验证，并从 Firestore 读取数据。
 */
exports.getInsuranceStats = functions.runWith({ memory: '512MB', timeoutSeconds: 60 }).https.onCall(async (data, context) => {
    functions.logger.info("[getInsuranceStats] Function triggered.", { auth: !!context.auth });
    // 1. 验证用户是否已登录 (认证检查)
    if (!context.auth) {
        functions.logger.warn("[getInsuranceStats] Unauthenticated access attempt blocked.");
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    functions.logger.info(`[getInsuranceStats] Authenticated user UID: ${context.auth.uid}. Proceeding to fetch data.`);
    try {
        // 2. 从 Firestore 数据库获取数据
        const db = admin.firestore();
        const collectionName = 'v4_period_data';
        const collectionRef = db.collection(collectionName);
        functions.logger.info(`[getInsuranceStats] Attempting to get documents from collection: '${collectionName}'.`);
        // 获取集合中的所有文档
        const querySnapshot = await collectionRef.get();
        functions.logger.info(`[getInsuranceStats] Firestore query successful. Found ${querySnapshot.size} documents.`);
        // 将文档数据映射为数组
        const insuranceStats = [];
        querySnapshot.forEach(doc => {
            insuranceStats.push(doc.data());
        });
        // 3. 返回统计数据
        functions.logger.info("[getInsuranceStats] Successfully prepared data. Returning to client.");
        return { status: 'success', data: insuranceStats };
    }
    catch (error) {
        functions.logger.error('[getInsuranceStats] Error fetching insurance stats from Firestore:', {
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack,
        });
        // 抛出内部错误，避免暴露敏感信息
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while fetching data from the database.', { details: 'Check function logs for more information.' });
    }
});
//# sourceMappingURL=getInsuranceStats.js.map