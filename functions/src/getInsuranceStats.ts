// functions/src/getInsuranceStats.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// 确保 Firebase Admin SDK 已经初始化，只初始化一次
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * [HTTPS Callable Function]
 * 安全地提供保险统计数据。
 * 该函数要求调用者必须通过 Firebase Authentication 进行身份验证，并从 Firestore 读取数据。
 */
export const getInsuranceStats = functions.https.onCall(async (data, context) => {
  // 1. 验证用户是否已登录 (认证检查)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  try {
    // 2. 从 Firestore 数据库获取数据
    const db = admin.firestore();
    // 假定您的统计数据存储在名为 'v4_period_data' 的集合中
    const collectionRef = db.collection('v4_period_data');

    // 获取集合中的所有文档
    const querySnapshot = await collectionRef.get();

    // 将文档数据映射为数组
    const insuranceStats: any[] = [];
    querySnapshot.forEach(doc => {
      insuranceStats.push(doc.data());
    });

    // 3. 返回统计数据
    return { status: 'success', data: insuranceStats };

  } catch (error) {
    console.error('Error fetching insurance stats from Firestore:', error);

    // 抛出内部错误，避免暴露敏感信息
    throw new functions.https.HttpsError(
      'internal',
      'An unexpected error occurred while fetching data from the database.'
    );
  }
});
