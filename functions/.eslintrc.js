// functions/.eslintrc.js

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": "off", // 暂时关闭缩进检查，避免格式问题干扰
  },
  // --- 这是最关键的新增部分 ---
  // 强制 ESLint 忽略 dist 目录下的所有文件
  ignorePatterns: ["dist/**", "node_modules/**"],
};
