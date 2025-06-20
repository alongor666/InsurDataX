// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

// 在 Firebase 环境中，无需任何参数即可自动完成初始化
admin.initializeApp();

// 获取 Firestore 数据库的引用
const db = admin.firestore();

// 创建一个 CORS 中间件实例
// 关键安全实践：仅允许您的 Firebase Hosting 域名访问
// 请将 'your-project-id' 替换为您真实的 Firebase 项目 ID
const corsOptions = {
  origin: "https://datalens-insights-2fh8a.web.app/", // 务必替换成您部署后的 Firebase Hosting URL
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
const corsMiddleware = cors(corsOptions);


exports.getInsuranceStats = functions.https.onRequest((request, response) => {
  // 使用 CORS 中间件处理请求
  corsMiddleware(request, response, async () => {
    try {
      // 1. 定义要获取的文档引用
      // !! 请将 'insuranceData' 和 'mainDocument' 替换为您在 Firestore 中
      // !! 实际使用的集合名 (collection) 和文档名 (document)
      const statsDocRef = db.collection('insuranceData').doc('mainDocument');

      // 2. 异步获取文档
      const doc = await statsDocRef.get();

      // 3. 健壮性检查：如果文档不存在
      if (!doc.exists) {
        console.error("Firestore document not found!");
        response.status(404).send({ error: "Data not found." });
        return;
      }

      // 4. 成功：返回文档中的数据
      console.log("Successfully fetched data from Firestore.");
      response.status(200).json(doc.data());

    } catch (error) {
      // 5. 捕获任何其他内部错误（例如权限问题）并记录详细信息
      console.error("Error fetching data from Firestore:", error);
      // 向客户端返回一个更通用的错误，避免暴露内部实现细节
      response.status(500).send({ error: "An internal server error occurred." });
    }
  });
});