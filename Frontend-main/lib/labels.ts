const STATUS_LABELS: Record<string, string> = {
  create: "待付款",
  completed: "已完成",
  cancelled: "已取消",
  pending: "待审核",
  accept: "已上架",
  rejected: "已拒绝",
  all: "全部",
};

const ROLE_LABELS: Record<string, string> = {
  client: "普通用户",
  moderator: "审核员",
  superadmin: "超级管理员",
};

const COLOR_LABELS: Record<string, string> = {
  black: "黑色", white: "白色", gray: "灰色", grey: "灰色", silver: "银色",
  blue: "蓝色", green: "绿色", purple: "紫色", red: "红色", "rose gold": "玫瑰金色",
};

const CATEGORY_LABELS: Record<string, string> = {
  Laptops: "笔记本电脑", Smartphones: "智能手机", Headphones: "耳机",
  Smartwatches: "智能手表", Tablets: "平板电脑", Cameras: "相机",
  Keyboards: "键盘", Monitors: "显示器", Speakers: "音箱", "Gaming Consoles": "游戏主机",
};

const TRANSACTION_LABELS: Record<string, string> = {
  deposit: "余额充值", withdraw: "余额提现", "Order checkout": "订单付款", "Order refund": "订单退款",
};

export function statusLabel(value: string): string {
  return STATUS_LABELS[value] ?? value;
}

export function roleLabel(value = "client"): string {
  return ROLE_LABELS[value] ?? value;
}

export function colorLabel(value: string): string {
  return COLOR_LABELS[value.toLowerCase()] ?? value;
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

export function transactionLabel(value: string): string {
  return TRANSACTION_LABELS[value] ?? value;
}
