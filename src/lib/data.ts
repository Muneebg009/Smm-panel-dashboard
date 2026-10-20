export type OrderStatus = "Completed" | "Pending" | "Processing" | "Canceled";
export interface Provider {
  id: string;
  name: string;
  region: string;
  reliability: number;
}
export interface Service {
  id: string;
  name: string;
  platform: string;
  providerId: string;
  sellPer1000: number;
  costPer1000: number;
}
export interface Order {
  id: string;
  serviceId: string;
  customer: string;
  quantity: number;
  status: OrderStatus;
  date: string;
  sellPer1000: number;
  costPer1000: number;
}
export interface Expense {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: string;
}
export interface DemoRepository {
  mode: "demo";
  providers: Provider[];
  services: Service[];
  orders: Order[];
  expenses: Expense[];
}
export const DEMO_TODAY = "2026-10-21";
const providers: Provider[] = [
  { id: "p1", name: "SocialBoost", region: "Singapore", reliability: 99.2 },
  { id: "p2", name: "PeakSocial", region: "United States", reliability: 98.5 },
  { id: "p3", name: "ViralHub", region: "Germany", reliability: 97.8 },
  { id: "p4", name: "GrowthWave", region: "United Kingdom", reliability: 99.6 },
];
const services: Service[] = [
  {
    id: "s1",
    name: "Instagram Followers • Premium",
    platform: "Instagram",
    providerId: "p1",
    sellPer1000: 1250,
    costPer1000: 650,
  },
  {
    id: "s2",
    name: "YouTube Views • High Retention",
    platform: "YouTube",
    providerId: "p2",
    sellPer1000: 850,
    costPer1000: 420,
  },
  {
    id: "s3",
    name: "TikTok Views • Instant",
    platform: "TikTok",
    providerId: "p3",
    sellPer1000: 350,
    costPer1000: 130,
  },
  {
    id: "s4",
    name: "Facebook Page Likes",
    platform: "Facebook",
    providerId: "p4",
    sellPer1000: 950,
    costPer1000: 550,
  },
  {
    id: "s5",
    name: "Instagram Likes • Real",
    platform: "Instagram",
    providerId: "p1",
    sellPer1000: 450,
    costPer1000: 190,
  },
  {
    id: "s6",
    name: "YouTube Subscribers",
    platform: "YouTube",
    providerId: "p2",
    sellPer1000: 3500,
    costPer1000: 2200,
  },
];
const orders: Order[] = Array.from({ length: 240 }, (_, i) => {
  const service = services[i % services.length];
  const day = 21 - Math.floor(i / 8);
  return {
    id: `PS-${24860 - i}`,
    serviceId: service.id,
    customer: [
      "Ahmed Raza",
      "Ayesha Khan",
      "Bilal Ahmed",
      "Sara Malik",
      "Hamza Ali",
    ][i % 5],
    quantity: [1000, 2500, 5000, 10000, 1500, 3000, 2000][i % 7],
    status: (
      [
        "Completed",
        "Completed",
        "Completed",
        "Completed",
        "Completed",
        "Processing",
        "Pending",
        "Canceled",
      ] as OrderStatus[]
    )[i % 8],
    date:
      day > 0
        ? `2026-10-${String(day).padStart(2, "0")}`
        : `2026-09-${String(30 + day).padStart(2, "0")}`,
    sellPer1000: service.sellPer1000,
    costPer1000: service.costPer1000,
  };
});
export const demo: DemoRepository = {
  mode: "demo",
  providers,
  services,
  orders,
  expenses: [
    {
      id: "e1",
      name: "Cloud hosting",
      category: "Infrastructure",
      amount: 4200,
      date: "2026-10-01",
    },
    {
      id: "e2",
      name: "Design subscription",
      category: "Software",
      amount: 2800,
      date: "2026-10-10",
    },
    {
      id: "e3",
      name: "Demo marketing campaign",
      category: "Marketing",
      amount: 6500,
      date: "2026-10-18",
    },
  ],
};
// Snapshot rates on orders preserve historical margins when service rates change.
// Canceled and unsettled orders are excluded from recognized demo revenue/cost.
export const revenue = (o: Order) =>
  o.status === "Completed" ? (o.quantity / 1000) * o.sellPer1000 : 0;
export const cost = (o: Order) =>
  o.status === "Completed" ? (o.quantity / 1000) * o.costPer1000 : 0;
export const profit = (o: Order) => revenue(o) - cost(o);
export function summarize(rows: Order[]) {
  const sales = rows.reduce((s, o) => s + revenue(o), 0);
  const spending = rows.reduce((s, o) => s + cost(o), 0);
  return {
    revenue: sales,
    cost: spending,
    profit: sales - spending,
    margin: sales ? ((sales - spending) / sales) * 100 : 0,
    total: rows.length,
    completed: rows.filter((o) => o.status === "Completed").length,
    pending: rows.filter(
      (o) => o.status === "Pending" || o.status === "Processing",
    ).length,
    canceled: rows.filter((o) => o.status === "Canceled").length,
  };
}
export const money = (n: number) =>
  `Rs ${Math.round(n).toLocaleString("en-PK")}`;
export function rangeOrders(start: string, end: string) {
  return demo.orders.filter((o) => o.date >= start && o.date <= end);
}
export const sections = [
  "Dashboard",
  "Profit & Loss",
  "Orders",
  "Services",
  "Providers",
  "Top Services",
  "Reports",
  "Expenses",
  "Settings",
] as const;
export const slug = (name: string) =>
  name === "Dashboard"
    ? ""
    : name.toLowerCase().replaceAll(" & ", "-").replaceAll(" ", "-");
