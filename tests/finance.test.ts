import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  summarize,
  revenue,
  cost,
  rangeOrders,
  DEMO_TODAY,
  type Order,
} from "../src/lib/data";
const order: Order = {
  id: "test",
  serviceId: "s1",
  customer: "Demo",
  quantity: 2500,
  status: "Completed",
  date: DEMO_TODAY,
  sellPer1000: 1250,
  costPer1000: 650,
};
test("reseller margin uses quantity and historical sell/cost snapshots", () => {
  assert.equal(revenue(order), 3125);
  assert.equal(cost(order), 1625);
  assert.equal(summarize([order]).profit, 1500);
  assert.equal(summarize([order]).margin, 48);
});
test("pending, processing and canceled orders never recognize revenue or cost", () => {
  for (const status of ["Pending", "Processing", "Canceled"] as const) {
    assert.equal(revenue({ ...order, status }), 0);
    assert.equal(cost({ ...order, status }), 0);
  }
});
test("date filters include boundaries and exclude other dates", () => {
  const rows = rangeOrders(DEMO_TODAY, DEMO_TODAY);
  assert.equal(rows.length, 8);
  assert.ok(rows.every((o) => o.date === DEMO_TODAY));
  assert.equal(rangeOrders("2030-01-01", "2030-01-02").length, 0);
});
test("empty period has zero margin and all demo orders reconcile", () => {
  assert.equal(summarize([]).margin, 0);
  const t = summarize(demo.orders);
  assert.equal(t.total, t.completed + t.pending + t.canceled);
  assert.equal(t.revenue - t.cost, t.profit);
});
