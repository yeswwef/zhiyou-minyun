/**
 * @module-note features/help/seed.ts
 * 便民设施内置示例数据：高德 key 不可用时兜底，保证「设施可查找」验收不被外部依赖卡死。
 * 坐标为福州城区近似位置，仅供演示与距离排序，不代表官方精确坐标。
 */
import type { FacilityType } from "./types";

export type SeedFacility = {
  type: FacilityType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
};

/** 每类 8 条，覆盖鼓楼、台江、仓山、晋安四个城区。 */
export const SEED_FACILITIES: SeedFacility[] = [
  // ---- 公共厕所 ----
  { type: "TOILET", name: "三坊七巷游客服务中心卫生间", address: "鼓楼区南后街 88 号", lat: 26.0821, lng: 119.2952 },
  { type: "TOILET", name: "南后街中段公共卫生间", address: "鼓楼区南后街中段", lat: 26.0805, lng: 119.2944 },
  { type: "TOILET", name: "西湖公园东门公厕", address: "鼓楼区湖滨路 70 号", lat: 26.0912, lng: 119.2861 },
  { type: "TOILET", name: "于山风景区公厕", address: "鼓楼区于山路 2 号", lat: 26.0791, lng: 119.3025 },
  { type: "TOILET", name: "上下杭游客中心公厕", address: "台江区上下杭路", lat: 26.0562, lng: 119.3088 },
  { type: "TOILET", name: "烟台山公园公厕", address: "仓山区烟台山", lat: 26.0435, lng: 119.3121 },
  { type: "TOILET", name: "乌山历史风貌区公厕", address: "鼓楼区乌山路", lat: 26.0768, lng: 119.2934 },
  { type: "TOILET", name: "五一广场公共卫生间", address: "鼓楼区古田路", lat: 26.0803, lng: 119.3058 },

  // ---- 停车场 ----
  { type: "PARKING", name: "三坊七巷北入口停车场", address: "鼓楼区杨桥东路", lat: 26.0862, lng: 119.2938, phone: "0591-87510000" },
  { type: "PARKING", name: "西湖公园停车场", address: "鼓楼区湖滨路", lat: 26.0905, lng: 119.2850 },
  { type: "PARKING", name: "鼓山下院停车场", address: "晋安区鼓山下院", lat: 26.0588, lng: 119.3822 },
  { type: "PARKING", name: "于山宾馆停车场", address: "鼓楼区于山路", lat: 26.0785, lng: 119.3012 },
  { type: "PARKING", name: "上下杭地下停车场", address: "台江区江滨西大道", lat: 26.0551, lng: 119.3070 },
  { type: "PARKING", name: "烟台山片区停车场", address: "仓山区麦园路", lat: 26.0428, lng: 119.3108 },
  { type: "PARKING", name: "乌山停车场", address: "鼓楼区乌山西路", lat: 26.0752, lng: 119.2915 },
  { type: "PARKING", name: "五一广场地下停车场", address: "鼓楼区古田路", lat: 26.0798, lng: 119.3062 },

  // ---- 充电桩 ----
  { type: "CHARGING", name: "东街口东方百货充电站", address: "鼓楼区东街 8 号", lat: 26.0855, lng: 119.2988 },
  { type: "CHARGING", name: "福州火车站南广场充电站", address: "晋安区华林路", lat: 26.1152, lng: 119.3192 },
  { type: "CHARGING", name: "西湖公园充电站", address: "鼓楼区湖滨路", lat: 26.0899, lng: 119.2866 },
  { type: "CHARGING", name: "三坊七巷停车场充电桩", address: "鼓楼区杨桥东路", lat: 26.0860, lng: 119.2941 },
  { type: "CHARGING", name: "五一广场充电站", address: "鼓楼区古田路", lat: 26.0801, lng: 119.3051 },
  { type: "CHARGING", name: "台江万达充电站", address: "台江区鳌峰路", lat: 26.0523, lng: 119.3305 },
  { type: "CHARGING", name: "仓山万达充电站", address: "仓山区浦上大道", lat: 26.0312, lng: 119.2802 },
  { type: "CHARGING", name: "鼓山索道下站充电站", address: "晋安区鼓山", lat: 26.0575, lng: 119.3801 },

  // ---- 医疗点 ----
  { type: "MEDICAL", name: "福州市第一医院", address: "台江区达道路 190 号", lat: 26.0601, lng: 119.3095, phone: "0591-83269925" },
  { type: "MEDICAL", name: "福建医科大学附属协和医院", address: "鼓楼区新权路 29 号", lat: 26.0778, lng: 119.2975, phone: "0591-83357896" },
  { type: "MEDICAL", name: "福建省立医院", address: "鼓楼区东街 134 号", lat: 26.0851, lng: 119.3001, phone: "0591-87557768" },
  { type: "MEDICAL", name: "福州市中医院", address: "鼓楼区鼓东路 102 号", lat: 26.0871, lng: 119.2962, phone: "0591-87678569" },
  { type: "MEDICAL", name: "鼓楼区社区卫生服务中心", address: "鼓楼区五四路", lat: 26.0922, lng: 119.2981 },
  { type: "MEDICAL", name: "台江区社区卫生服务中心", address: "台江区八一七中路", lat: 26.0635, lng: 119.3052 },
  { type: "MEDICAL", name: "仓山区社区卫生服务中心", address: "仓山区上三路", lat: 26.0432, lng: 119.3012 },
  { type: "MEDICAL", name: "晋安区社区卫生服务中心", address: "晋安区福新中路", lat: 26.1002, lng: 119.3255 },
];
