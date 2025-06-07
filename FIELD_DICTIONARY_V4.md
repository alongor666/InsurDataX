# 车险经营分析周报 - 字段字典与计算逻辑 (V4.0)

**最后更新日期：** 2024-05-24

**核心原则：**

1.  **原始字段定义**：JSON 数据 (`public/data/insurance_data_v4.json`) 为每个【业务类型】在每个【周期】提供的直接 **年度累计 (YTD)** 数值。
2.  **分析模式**：
    *   **累计值分析**：直接使用或聚合JSON中提供的YTD数据。
    *   **当周发生额分析**：
        *   基础字段（金额、数量）：通过 `当前周期YTD值 - 上一周期YTD值` 计算得出。若无上一周期，则当周发生额等于其YTD值。
        *   率值及均值指标：基于其对应分子、分母的“当周发生额”重新计算。
3.  **聚合计算逻辑**（适用于所选分析模式下的数据）：
    *   **单业务类型选择**：
        *   累计值分析：可以直接使用 JSON 中提供的该业务类型的YTD预计算值（特别是率值和均值）。基础金额/数量使用其YTD值。
        *   当周发生额分析：所有值（包括率和均值）都基于该业务类型自身的“当周发生额”基础字段重新计算。
    *   **多业务类型选择（或“合计”）**：
        *   **金额类、数量类基础字段**：直接将所选业务类型的对应字段值（YTD或当周发生额）加总。
        *   **“率”类指标**：将所选业务类型的对应【分子基础字段】（YTD或当周发生额）加总，再除以所选业务类型的对应【分母基础字段】（YTD或当周发生额）加总。严格区分不同率值的分母基础。
        *   **“均值”类指标**：将所选业务类型的对应【总额基础字段】（YTD或当周发生额）加总，再除以所选业务类型的对应【计数基础字段】（YTD或当周发生额）加总。
        *   **“占比”类指标**：按定义计算。
        *   **不可聚合指标**：如自主系数，在聚合视图下不展示或标记为不适用。
4.  **单位统一**：计算过程中务必注意单位换算（万元 vs 元，百分比处理）。最终展示时也需明确单位，金额类指标默认显示两位小数（如 “123.45 万元”），件数取整，百分比默认保留两位小数（如 “12.34%”）。
5.  **空值处理**：如果某个业务类型在某个周期缺少必要的基础字段数据，则该业务类型不参与该周期的聚合计算。聚合结果中如果分子或分母为0或NaN，则结果显示为 "N/A"。
6.  **数据来源重要提示**：
    *   `total_loss_amount` (总赔款) 指的是 **已报告赔款**。基于此计算的 `loss_ratio` (满期赔付率) 的分子是已报告赔款，**需在报表或指标说明中注明此情况**。

---

## 一、指标分类与字段定义

**分类标签：** `保费类`, `保单类`, `赔付类`, `费用类`, `占比类`, `综合类`

| 分类  | 指标名称     | 字段名 (JSON中/衍生)           | 单位 | JSON提供类型   | 计算逻辑 / 说明 (聚合时分子/分母基础字段)                                                                                                                                                                                             |
| :---- | :------- | :----------------------------- | :--- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **保费类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 保费类   | 跟单保费     | `premium_written`              | 万元 | 原始 (金额)     | **JSON提供 (YTD)**：直接值。<br/>**聚合**：SUM(`premium_written`)                                                                                                                                                    |
| 保费类   | 满期保费     | `premium_earned`               | 万元 | 原始 (金额)     | **JSON提供 (YTD)**：直接值。<br/>**聚合**：SUM(`premium_earned`)                                                                                                                                                    |
| 保费类   | 单均保费     | `avg_premium_per_policy`       | 元   | 原始 (均值)     | **JSON提供 (YTD)**：预计算值 (`premium_written` (元) / 原始保单件数)。<br/>**前端聚合**：SUM(`premium_written` \* 10000) / SUM(衍生`policy_count`)                                                                           |
| 保费类   | 增量保费     | `premium_increment` (环比绝对值) | 万元 | 衍生 (金额)     | **计算**：当前期聚合`premium_written` - 对比期(环比)聚合`premium_written`。KPI卡片中为`changeAbsolute`。                                                                                                                                      |
| 保费类   | 保费满期率    | `premium_earned_ratio`         | %    | 原始 (率值)     | **JSON提供 (YTD)**：预计算值 (`premium_earned` / `premium_written` \* 100)。<br/>**聚合**：SUM(`premium_earned`) / SUM(`premium_written`) \* 100                                                                              |
| **保单类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 保单类   | 保单数量     | `policy_count`                 | 件   | 衍生 (数量)     | **计算 (基于YTD值)**：(`premium_written` (万元) \* 10000) / `avg_premium_per_policy` (元)。<br/>**聚合**：SUM(各业务类型计算出的 `policy_count`)                                                                                               |
| 保单类   | 增量保单     | `policy_increment` (环比绝对值)  | 件   | 衍生 (数量)     | **计算**：当前期聚合`policy_count` - 对比期(环比)聚合`policy_count`。KPI卡片中为`changeAbsolute`。                                                                                                                                         |
| **赔付类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 赔付类   | 总赔款      | `total_loss_amount`            | 万元 | 原始 (金额)     | **JSON提供 (YTD)**：直接值 (**注意：此为已报告赔款**)。<br/>**聚合**：SUM(`total_loss_amount`)                                                                                                                                  |
| 赔付类   | 增量赔款     | `loss_increment` (环比绝对值)    | 万元 | 衍生 (金额)     | **计算**：当前期聚合`total_loss_amount` - 对比期(环比)聚合`total_loss_amount`。KPI卡片中为`changeAbsolute`。                                                                                                                            |
| 赔付类   | 满期赔付率    | `loss_ratio`                   | %    | 原始 (率值)     | **JSON提供 (YTD)**：预计算值 (`total_loss_amount` (已报告赔款) / `premium_earned` \* 100)。<br/>**聚合**：SUM(`total_loss_amount`) / SUM(`premium_earned`) \* 100 <br/>**(需注明分子为已报告赔款)**                                          |
| 赔付类   | 满期出险率    | `claim_frequency`              | %    | 原始 (率值)     | **JSON提供 (YTD)**：预计算值 (`claim_count` / `policy_count_earned` \* 100)。<br/>**聚合**：SUM(`claim_count`) / SUM(`policy_count_earned`) \* 100 (依赖JSON提供`claim_count`和`policy_count_earned`)                      |
| 赔付类   | 案均赔款     | `avg_loss_per_case`            | 元   | 原始 (均值)     | **JSON提供 (YTD)**：预计算值 (`total_loss_amount` (元) / `claim_count`)。<br/>**聚合**：SUM(`total_loss_amount` \* 10000) / SUM(`claim_count`) (依赖JSON提供`claim_count`)                                                      |
| **费用类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 费用类   | 费用(额)    | `expense_amount`               | 万元 | 衍生 (金额)     | **计算 (基于YTD值)**：`premium_written` \* (`expense_ratio` / 100)。<br/>**聚合**：聚合`premium_written` \* (聚合`expense_ratio` / 100)。这里的聚合`expense_ratio`指基于跟单保费的费用率。                                                    |
| 费用类   | 增量费用     | `expense_increment` (环比绝对值) | 万元 | 衍生 (金额)     | **计算**：当前期聚合`expense_amount` - 对比期(环比)聚合`expense_amount`。KPI卡片中为`changeAbsolute`。                                                                                                                                  |
| 费用类   | 费用率      | `expense_ratio`                | %    | 原始 (率值)     | **JSON提供 (YTD)**：预计算值 (`expense_amount_raw` / `premium_written` \* 100)。<br/>**聚合**：SUM(`expense_amount_raw`) / SUM(`premium_written`) \* 100 (依赖JSON提供`expense_amount_raw`)。这是独立显示的费用率。                                          |
| 费用类   | 增量费用率    | `expense_increment_ratio`      | %    | 衍生 (率值)     | **计算**：`expense_increment` / `premium_increment` \* 100 (注意分母可能为0或负数，需处理除零异常)。*此指标目前未在KPI看板直接展示*                                                                                                            |
| **占比类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 占比类   | 保费占比     | `premium_share`                | %    | 衍生 (占比)     | **计算**：聚合`premium_written` (所选业务类型或合计) / **总计`premium_written` (全量数据中该周期的 `totals_for_period.total_premium_written_overall`)** \* 100                                                                       |
| 占比类   | 增量保费占比   | `premium_increment_share`      | %    | 衍生 (占比)     | **计算**：`premium_increment` (所选业务类型) / `premium_increment` (**当前筛选的所有业务类型合计**) \* 100。*此指标目前未在KPI看板直接展示*                                                                                                      |
| 占比类   | 增量赔款占比   | `loss_increment_share`         | %    | 衍生 (占比)     | **计算**：`loss_increment` (所选业务类型) / `loss_increment` (**当前筛选的所有业务类型合计**) \* 100。*此指标目前未在KPI看板直接展示*                                                                                                          |
| 占比类   | 增量费用占比   | `expense_increment_share`      | %    | 衍生 (占比)     | **计算**：`expense_increment` (所选业务类型) / `expense_increment` (**当前筛选的所有业务类型合计**) \* 100。*此指标目前未在KPI看板直接展示*                                                                                                    |
| **综合类** |         |                                |      |               |                                                                                                                                                                                                                                       |
| 综合类   | 变动成本率    | `variable_cost_ratio`          | %    | 原始 (率值)     | **JSON提供 (YTD单业务类型)**：预计算值 (`expense_ratio` + `loss_ratio`)。即 (`expense_amount_raw`/`premium_written`)\*100 + (`total_loss_amount`/`premium_earned`)\*100。<br/>**KPI看板聚合**：为满足`边际贡献率 = 100% - 变动成本率`关系，聚合`variable_cost_ratio` = 聚合`loss_ratio` (基于满期保费) + (`聚合expense_amount_raw` / `聚合premium_earned` * 100)。注意：这不等于看板上独立显示的“费用率”+“满期赔付率”。                             |
| 综合类   | 自主系数     | `avg_commercial_index`         | -    | 原始 (数值)     | **JSON提供 (YTD)**：直接值。<br/>**不聚合**。单选业务类型时显示JSON提供值，多选或合计时不显示或标记为不适用。                                                                                                                                     |
| 综合类   | 边际贡献率    | `marginal_contribution_ratio`  | %    | 衍生 (率值)     | **计算**：为满足`边际贡献率 = 100% - 变动成本率`关系，聚合`marginal_contribution_ratio` = 100% - 聚合`variable_cost_ratio` (按上述KPI看板聚合方式计算)。                                                                                                              |
| 综合类   | 边贡额      | `marginal_contribution_amount` | 万元 | 衍生 (金额)     | **计算**：`聚合premium_earned` * (`聚合marginal_contribution_ratio` / 100)。这里的“聚合marginal_contribution_ratio”是按上述KPI看板方式计算得出。                                                                                                                                   |

**备注：**
*   “增量XX”指标在KPI看板上主要体现为环比的“绝对值变化”。
*   “当周发生额分析”模式下，上表中的所有“聚合”逻辑同样适用，但其输入的基础字段值是经过“当周发生额”计算处理后的。

---

## 二、JSON 数据结构 (`public/data/insurance_data_v4.json`)

**目的**：为前端提供计算所需的 **年度累计 (YTD)** 基础数据和单业务类型下的预计算值。

```json
[
  {
    "period_id": "2025-W22",
    "period_label": "2025年第22周",
    "comparison_period_id_yoy": "2024-W22", 
    "comparison_period_id_mom": "2025-W21",
    "business_data": [
      {
        "business_type": "非营业客车新车",
        
        "premium_written": 652.9,
        "premium_earned": 131.2,
        "total_loss_amount": 183.35,
        "expense_amount_raw": 124.7039, 
        "claim_count": 323,
        "policy_count_earned": 652,     
        
        "avg_premium_per_policy": 2013.3,
        "avg_loss_per_case": 5676.4,
        "avg_commercial_index": 0.9479,
        "loss_ratio": 139.7,
        "expense_ratio": 19.1,
        "variable_cost_ratio": 158.8, 
        "premium_earned_ratio": 20.1, 
        "claim_frequency": 49.5
      }
      
    ],
    "totals_for_period": {
        "total_premium_written_overall": 20243.5
    }
  },
  {
    "period_id": "2025-W21",
    "period_label": "2025年第21周",
    "comparison_period_id_yoy": "2024-W21", 
    "comparison_period_id_mom": "2025-W20", 
    "business_data": [
      {
        "business_type": "非营业客车新车",
        "premium_written": 626.2,
        "premium_earned": 118.9,
        "total_loss_amount": 171.37,
        "expense_amount_raw": 117.0994, 
        "claim_count": 298,
        "policy_count_earned": 589,     
        "avg_premium_per_policy": 2020.0,
        "avg_loss_per_case": 5750.6,
        "avg_commercial_index": 0.9474,
        "loss_ratio": 144.1,
        "expense_ratio": 18.7,
        "variable_cost_ratio": 162.8, 
        "premium_earned_ratio": 19.0,  
        "claim_frequency": 50.6
      }
      
    ],
    "totals_for_period": {
      "total_premium_written_overall": 19461.6
    }
  }
  
]
```

**JSON 字段说明：**
*   所有金额单位在 JSON 中若无特殊说明，默认为“万元”。“元”单位的字段会特别注明。
*   所有率值、频度单位在 JSON 中为数值，例如 60.87 代表 60.87%。
*   `business_type` 应确保在同一周期内唯一。
*   提供 `comparison_period_id_yoy` 和 `comparison_period_id_mom` 是为了方便前端直接查找对比期数据进行同比环比计算。
*   JSON 中的 `expense_amount_raw`, `policy_count_earned`, `premium_earned_ratio` 是根据您提供的原始数据和V4.0字典中的公式衍生计算得出的YTD值。如果源系统能直接提供这些YTD基础值，则优先使用源系统的。

---

## 三、高亮风险规则

| 指标        | 阈值    | 条件类型 | 高亮等级 | 样式说明            |
| :---------- | :------ | :------- | :------- | :------------------ |
| 满期赔付率    | > 70%   | 单周期   | 红色     | 数值标红 + 加粗       |
| 费用率      | > 14.5% | 单周期   | 橙色     | 数值标橙            |
| 变动成本率    | > 90%   | 单周期   | 红色     | KPI卡片红边框提示    |
| 所有核心指标 | 连续恶化 | 连续2周期以上 | 红色预警 | 图表趋势警示标记 (待实现) |

**“连续恶化”判断逻辑：**
指某指标在连续两个（或以上）时间周期中数值持续向不利方向变动。
*   **不利方向定义：**
    *   成本/比率类 (满期赔付率, 费用率, 变动成本率, 满期出险率): **升高**为恶化。
    *   规模/收益类 (跟单保费, 满期保费, 保单数量, 总赔款, 边贡额): **降低**为恶化。
    *   特定比率 (保费满期率, 边际贡献率): 通常**降低**为恶化。
    *   均值类 (单均保费, 案均赔款): 需根据业务目标判断，例如案均赔款**升高**可能为恶化。
*   此规则适用于主要核心指标，具体应用哪些指标及方向需要最终业务确认并实现。

---

## 四、前端开发核心关注点

1.  **数据聚合逻辑的准确实现**：严格区分单选业务类型和多选（或合计）业务类型时的计算路径，以及“累计值”与“当周发生额”模式下的计算差异。
2.  **单位换算与格式化**：确保金额单位（万元与元）、百分比、件数的正确处理和显示。
3.  **分子分母匹配**：计算各种比率时，确保分子和分母的业务含义及数据来源正确匹配。
4.  **“已报告赔款”的透明化**：对于使用“已报告赔款”计算的“满期赔付率”，务必在界面上清晰告知用户。
5.  **不可聚合指标的处理**：如“自主系数”，在聚合视图（多选业务类型或合计）下应不显示或标记为“不适用”。
6.  **同比环比计算**：正确关联当前期与对比期数据，并准确计算同比/环比值及变动幅度。
7.  **空值与除零处理**：妥善处理计算中可能出现的空值、NaN或分母为零的情况，避免程序错误，并给出友好提示。
8.  **性能考量**：对于大量数据的计算和渲染，考虑前端性能优化。
9.  **业务类型筛选**：尽快实现业务类型筛选功能，以完整验证聚合逻辑。
10. **图表数据源**：更新各图表的数据源，使其正确反映当前分析模式和筛选条件下的数据。
11. **AI智能摘要**：确保传递给AI模型的数据结构与模型期望一致。
12. **KPI看板指标关系**：注意“边际贡献率”和“变动成本率”在KPI看板上为了满足 `MCR = 1 - VCR` 而进行的计算调整，这可能导致看板上的“变动成本率”不直接等于独立显示的“费用率”与“满期赔付率”之和。

