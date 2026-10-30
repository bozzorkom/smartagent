import test from "node:test";
import assert from "node:assert/strict";
import { applyPropertyCommand, demoProperties, propertyRequestWarnings, requestTargets } from "../components/property-model.ts";
import { applyPropertyWorkspace, clientHistory, createWorkspace } from "../components/today-state.ts";

const now = "2026-10-30T07:00:00.000Z";
const access = { role: "solo", lost: false, offline: false };
const request = { id: "r1", label: "Снять · Чиланзар · до 600 USD", operation: "rent", price: 600, currency: "USD", unit: "month", districts: ["Чиланзар"] };
const targets = [{ id: "c1", name: "Мадина", scope: "mine", requests: [request, { ...request, id: "r2" }] }];
const fixture = () => demoProperties(now);
const command = (rest = {}) => ({ type: "linkMany", operationId: "selection-1", scope: "mine", clientId: "c1", requestId: "r1", selections: [{ id: "248", version: 1 }, { id: "249", version: 1 }], ...rest });
const run = (state, action = command(), permissions = access, clients = targets) => applyPropertyCommand(state, action, permissions, clients, now);
const warnings = (listingPatch = {}, requestPatch = {}, propertyPatch = {}) => {
  const state = fixture();
  return propertyRequestWarnings({ ...state.properties[0], ...propertyPatch }, { ...state.listings[0], ...listingPatch }, { ...request, ...requestPatch });
};

test("comparison reports budget overrun only for comparable currency, operation and units", () => {
  assert.ok(warnings({ price: 700 }).some((text) => text.includes("превышает")));
  for (const patch of [{ currency: "UZS", price: 1000000 }, { unit: "sqm-month", price: 1000 }, { operation: "sale", price: 100000 }]) {
    const result = warnings(patch);
    assert.ok(result.length);
    assert.equal(result.some((text) => text.includes("превышает")), false);
  }
  assert.equal(warnings({ price: 600 }).length, 0);
});

test("unknown budget, unit and property price never become a zero or an invented comparison", () => {
  assert.ok(warnings({ price: undefined }).some((text) => text.includes("Цена объекта не указана")));
  assert.ok(warnings({}, { price: undefined }).some((text) => text.includes("бюджет не указан")));
  assert.ok(warnings({ price: 1000 }, { unit: undefined }).some((text) => text.includes("Единицы цены")));
  assert.equal(warnings({ price: 1000 }, { unit: undefined }).some((text) => text.includes("превышает")), false);
});

test("comparison respects district OR, Uzbek aliases and missing relevant characteristics", () => {
  assert.equal(warnings({}, { districts: ["Мирабад", "Chilonzor"] }).length, 0);
  assert.ok(warnings({}, { districts: ["Юнусабад"] }).some((text) => text.includes("Район отличается")));
  assert.ok(warnings({}, {}, { area: undefined, rooms: undefined }).some((text) => text.includes("Площадь")));
  assert.ok(warnings({}, {}, { rooms: undefined }).some((text) => text.includes("комнат")));
  assert.equal(warnings({}, {}, { kind: "land", rooms: undefined }).some((text) => text.includes("комнат")), false);
});

test("request targets preserve structured units without parsing free-text primary requests", () => {
  const clients = [{ id: "c1", name: "Мадина", scope: "mine", request: "Аренда до 600 USD" }];
  const requests = requestTargets(clients, [{ id: "capture", clientId: "c1", scope: "mine", capture: { need: "Снять", price: "600", currency: "USD", districts: "Чиланзар" } }])[0].requests;
  assert.equal(requests[0].price, undefined);
  assert.equal(requests[0].unit, undefined);
  assert.equal(requests[1].unit, "month");
  assert.equal(requests[1].price, 600);
});

test("bulk linking creates all links and unique events without mutating prices or checks", () => {
  const state = fixture();
  const result = run(state);
  assert.equal(result.error, "");
  assert.deepEqual(result.state.links.map((link) => link.listingId), ["248", "249"]);
  assert.equal(new Set(result.state.history.map((event) => event.id)).size, 2);
  assert.equal(result.state.history.every((event) => event.detail.includes("Сообщение не отправлялось")), true);
  assert.deepEqual(result.state.listings, state.listings);
  assert.equal(state.links.length, 0);
});

test("bulk retries, double saves and already-linked records do not duplicate links or history", () => {
  const first = run(fixture()).state;
  assert.equal(run(first).state, first);
  const repeated = run(first, command({ operationId: "second-submit" }));
  assert.equal(repeated.error, "");
  assert.equal(repeated.state.links.length, 2);
  assert.equal(repeated.state.history.length, 2);
  const anotherRequest = run(first, command({ operationId: "other-request", requestId: "r2" }));
  assert.equal(anotherRequest.state.links.length, 4);
});

test("stale second selection rejects the entire operation and preserves the first unlinked object", () => {
  const state = fixture();
  state.listings.find((value) => value.id === "249").version = 2;
  const result = run(state);
  assert.match(result.error, /изменились/);
  assert.equal(result.state, state);
  assert.equal(state.links.length, 0);
  assert.equal(state.operations.length, 0);
  assert.equal(state.history.length, 0);
});

test("archived, unavailable, held or missing selections never partially save a batch", () => {
  for (const patch of [{ archived: true }, { status: "rented" }, { status: "held" }]) {
    const state = fixture();
    Object.assign(state.listings.find((value) => value.id === "249"), patch);
    assert.ok(run(state).error);
    assert.equal(run(state).state, state);
    assert.equal(state.links.length, 0);
  }
  const state = fixture();
  assert.ok(run(state, command({ selections: [{ id: "248", version: 1 }, { id: "missing", version: 1 }] })).error);
});

test("bulk links enforce scope, role, revoked access and offline state", () => {
  const state = fixture();
  for (const permissions of [{ ...access, lost: true }, { ...access, offline: true }]) {
    assert.ok(run(state, command(), permissions).error);
    assert.equal(run(state, command(), permissions).state, state);
  }
  assert.ok(run(state, command({ selections: [{ id: "agency-1", version: 1 }] }), { ...access, role: "owner" }).error);
  const teamTargets = [{ ...targets[0], scope: "team" }];
  const teamCommand = command({ scope: "team", selections: [{ id: "agency-private", version: 1 }] });
  assert.ok(run(state, teamCommand, { ...access, role: "agent" }, teamTargets).error);
  assert.ok(run(state, teamCommand, access, teamTargets).error);
  assert.equal(run(state, teamCommand, { ...access, role: "owner" }, teamTargets).error, "");
});

test("removed client/request and invalid selection counts are rejected without recording an operation", () => {
  const state = fixture();
  for (const patch of [
    { clientId: "missing" }, { requestId: "missing" }, { selections: [] },
    { selections: [{ id: "248", version: 1 }, { id: "248", version: 1 }] },
    { selections: Array.from({ length: 101 }, (_, i) => ({ id: String(i), version: 1 })) },
  ]) {
    const result = run(state, command(patch));
    assert.ok(result.error);
    assert.equal(result.state, state);
    assert.equal(state.operations.length, 0);
  }
});

test("bulk links write two Client 360 history entries, no messages or tasks, and replay safely", () => {
  const state = { ...createWorkspace(), propertyHub: fixture(), clients: [{ id: "c1", name: "Мадина", request: "Снять", scope: "mine" }] };
  const action = command({ requestId: "client:c1" });
  const result = applyPropertyWorkspace(state, action, access, now);
  assert.equal(result.error, "");
  assert.equal(clientHistory(result.workspace, "c1").length, 2);
  assert.equal(result.workspace.propertyHub.links.length, 2);
  assert.equal(result.workspace.items.length, 0);
  assert.equal(result.workspace.tasks.length, 0);
  assert.equal(result.workspace.calls.length, 0);
  assert.equal(applyPropertyWorkspace(result.workspace, action, access, now).workspace, result.workspace);
});
