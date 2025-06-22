
'use client';

import { db } from '@/lib/firebase';
import { collection, doc, setDoc } from "firebase/firestore";
import type { V4PeriodData } from '@/data/types';

// Raw data for W25 provided by the user.
const rawW25Data = {
  "period_id": "2025-W25",
  "period_label": "2025年第25周",
  "comparison_period_id_yoy": null,
  "comparison_period_id_mom": "2025-W24",
  "business_data": [
    { "business_type": "非营业客车新车", "premium_written": 699.9, "avg_premium_per_policy": 2020.9, "premium_earned": 170.1, "claim_frequency": 48.1, "claim_count": 405, "avg_loss_per_case": 4714.7, "total_loss_amount": 190.95, "loss_ratio": 112.2, "expense_ratio": 19.5, "variable_cost_ratio": 131.7, "avg_commercial_index": 0.9492 },
    { "business_type": "非营业客车旧车非过户", "premium_written": 13869.1, "avg_premium_per_policy": 870.4, "premium_earned": 3483.7, "claim_frequency": 13.1, "claim_count": 5256, "avg_loss_per_case": 4404.8, "total_loss_amount": 2315.08, "loss_ratio": 66.5, "expense_ratio": 18.1, "variable_cost_ratio": 84.5, "avg_commercial_index": 0.8435 },
    { "business_type": "非营业客车旧车过户车", "premium_written": 2467.7, "avg_premium_per_policy": 1002.3, "premium_earned": 731.8, "claim_frequency": 16.1, "claim_count": 1179, "avg_loss_per_case": 4590.7, "total_loss_amount": 541.24, "loss_ratio": 74.0, "expense_ratio": 14.8, "variable_cost_ratio": 88.7, "avg_commercial_index": 1.0443 },
    { "business_type": "1吨以下非营业货车", "premium_written": 905.5, "avg_premium_per_policy": 1042.8, "premium_earned": 190.7, "claim_frequency": 11.9, "claim_count": 218, "avg_loss_per_case": 5470.8, "total_loss_amount": 119.26, "loss_ratio": 62.5, "expense_ratio": 15.2, "variable_cost_ratio": 77.8, "avg_commercial_index": 1.0689 },
    { "business_type": "1吨以上非营业货车", "premium_written": 590.6, "avg_premium_per_policy": 1076.6, "premium_earned": 121.4, "claim_frequency": 15.3, "claim_count": 172, "avg_loss_per_case": 5363.5, "total_loss_amount": 92.25, "loss_ratio": 76.0, "expense_ratio": 10.4, "variable_cost_ratio": 86.4, "avg_commercial_index": 1.0955 },
    { "business_type": "2吨以下营业货车", "premium_written": 1124.2, "avg_premium_per_policy": 2746.6, "premium_earned": 193.9, "claim_frequency": 42.4, "claim_count": 299, "avg_loss_per_case": 5328.2, "total_loss_amount": 159.31, "loss_ratio": 82.2, "expense_ratio": 5.6, "variable_cost_ratio": 87.8, "avg_commercial_index": 1.18 },
    { "business_type": "2-9吨营业货车", "premium_written": 245.1, "avg_premium_per_policy": 2873.8, "premium_earned": 52.6, "claim_frequency": 17.5, "claim_count": 32, "avg_loss_per_case": 6180.9, "total_loss_amount": 19.78, "loss_ratio": 37.6, "expense_ratio": 18.5, "variable_cost_ratio": 56.1, "avg_commercial_index": 0.8046 },
    { "business_type": "9-10吨营业货车", "premium_written": 144.1, "avg_premium_per_policy": 3229.9, "premium_earned": 26.6, "claim_frequency": 24.3, "claim_count": 20, "avg_loss_per_case": 18559.7, "total_loss_amount": 37.12, "loss_ratio": 139.6, "expense_ratio": 11.9, "variable_cost_ratio": 151.6, "avg_commercial_index": 1.119 },
    { "business_type": "10吨以上-普货", "premium_written": 256.3, "avg_premium_per_policy": 4891.7, "premium_earned": 52.5, "claim_frequency": 35.4, "claim_count": 38, "avg_loss_per_case": 7799.4, "total_loss_amount": 29.64, "loss_ratio": 56.5, "expense_ratio": 16.8, "variable_cost_ratio": 73.2, "avg_commercial_index": 1.052 },
    { "business_type": "10吨以上-牵引", "premium_written": 711.5, "avg_premium_per_policy": 6444.9, "premium_earned": 144.9, "claim_frequency": 47.2, "claim_count": 106, "avg_loss_per_case": 5446.9, "total_loss_amount": 57.74, "loss_ratio": 39.9, "expense_ratio": 14.2, "variable_cost_ratio": 54.0, "avg_commercial_index": 1.1897 },
    { "business_type": "自卸", "premium_written": 461.1, "avg_premium_per_policy": 3944.4, "premium_earned": 77.9, "claim_frequency": 22.3, "claim_count": 44, "avg_loss_per_case": 6537.3, "total_loss_amount": 28.76, "loss_ratio": 36.9, "expense_ratio": 19.6, "variable_cost_ratio": 56.6, "avg_commercial_index": 1.1494 },
    { "business_type": "特种车", "premium_written": 54.8, "avg_premium_per_policy": 3338.5, "premium_earned": 11.6, "claim_frequency": 11.5, "claim_count": 4, "avg_loss_per_case": 5481.4, "total_loss_amount": 2.19, "loss_ratio": 18.8, "expense_ratio": 20.3, "variable_cost_ratio": 39.1, "avg_commercial_index": 1.1019 },
    { "business_type": "摩托车", "premium_written": 760.0, "avg_premium_per_policy": 112.8, "premium_earned": 153.1, "claim_frequency": 2.4, "claim_count": 325, "avg_loss_per_case": 5496.2, "total_loss_amount": 178.63, "loss_ratio": 116.7, "expense_ratio": 0.0, "variable_cost_ratio": 116.7, "avg_commercial_index": null },
    { "business_type": "出租车", "premium_written": 107.5, "avg_premium_per_policy": 5141.4, "premium_earned": 32.1, "claim_frequency": 72.2, "claim_count": 45, "avg_loss_per_case": 5753.0, "total_loss_amount": 25.89, "loss_ratio": 80.7, "expense_ratio": 4.4, "variable_cost_ratio": 85.1, "avg_commercial_index": 1.3717 },
    { "business_type": "网约车", "premium_written": 1.3, "avg_premium_per_policy": 1655.7, "premium_earned": 0.3, "claim_frequency": 0.0, "claim_count": 0, "avg_loss_per_case": null, "total_loss_amount": 0, "loss_ratio": 0.0, "expense_ratio": 0.0, "variable_cost_ratio": 0.0, "avg_commercial_index": null },
    { "business_type": "其他", "premium_written": 53.0, "avg_premium_per_policy": 3394.9, "premium_earned": 15.0, "claim_frequency": 31.7, "claim_count": 14, "avg_loss_per_case": 2670.2, "total_loss_amount": 3.74, "loss_ratio": 25.0, "expense_ratio": 18.5, "variable_cost_ratio": 43.4, "avg_commercial_index": 1.2662 }
  ],
  "totals_for_period": { "total_premium_written_overall": 22451.5 }
};

// Function to calculate expense_amount_raw and create the final data object
const getPreparedW25Data = (): V4PeriodData => {
  const business_data_with_raw_expense = rawW25Data.business_data.map(bd => {
    const expense_amount_raw = bd.premium_written * (bd.expense_ratio / 100);
    return {
      ...bd,
      expense_amount_raw,
    };
  });

  return {
    ...rawW25Data,
    business_data: business_data_with_raw_expense,
  };
};

/**
 * Uploads the prepared W25 data to Firestore.
 * This function will create or overwrite the document with ID '2025-W25'.
 */
export const seedW25Data = async () => {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }
  const w25Data = getPreparedW25Data();
  const docRef = doc(db, "v4_period_data", w25Data.period_id);
  
  try {
    await setDoc(docRef, w25Data);
    console.log(`Document for period ${w25Data.period_id} successfully written to Firestore.`);
    return { success: true, message: `成功上传 ${w25Data.period_id} 数据！` };
  } catch (error) {
    console.error(`Error writing document for period ${w25Data.period_id}:`, error);
    if (error instanceof Error) {
        return { success: false, message: `上传失败: ${error.message}` };
    }
    return { success: false, message: '发生未知错误，上传失败。' };
  }
};

    