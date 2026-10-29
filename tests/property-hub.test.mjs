import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPropertyCommand,
  canViewListing,
  createPropertyState,
  defaultPropertyView,
  demoProperties,
  draftError,
  emptyFilters,
  emptyPropertyDraft,
  filterError,
  freshnessReasons,
  possibleDuplicates,
  priceLabel,
  propertyArea,
  propertyDraft,
  requestTargets,
  selectProperties,
} from "../components/property-model.ts";
import {
  applyPropertyWorkspace,
  clientHistory,
  createWorkspace,
  reduceWorkspace,
} from "../components/today-state.ts";
const now = "2026-10-30T07:00:00.000Z";
const solo = { role: "solo", lost: false, offline: false },
  owner = { ...solo, role: "owner" },
  agent = { ...solo, role: "agent" };
const fixture = () => demoProperties(now);
const command = (type, id = "248", rest = {}) => ({
  type,
  id,
  version: 1,
  operationId: `${type}:${JSON.stringify(rest)}`,
  ...rest,
});
const run = (state, cmd, access = solo, targets = []) =>
  applyPropertyCommand(state, cmd, access, targets, now);
const select = (state, change = {}, access = solo) =>
  selectProperties(state, { ...defaultPropertyView(), ...change }, access, now);
const request = [
  {
    id: "client-1",
    name: "Мадина",
    scope: "mine",
    requests: [
      { id: "request-1", label: "Аренда · до 600 USD" },
      { id: "request-2", label: "Продажа · до 100000 USD" },
    ],
  },
];
const review = (rest = {}) => ({
  availability: "unknown",
  price: "unknown",
  conditions: "unknown",
  newPrice: "",
  currency: "USD",
  newConditions: "",
  unavailableStatus: "unavailable",
  source: "Собственник сообщил",
  note: "",
  ...rest,
});

test("empty catalog, counts and independent scope contain no fabricated records", () => {
  assert.equal(select(createPropertyState()).total, 0);
  assert.deepEqual(select(createPropertyState()).counts, {
    all: 0,
    available: 0,
    review: 0,
  });
  const state = fixture();
  assert.equal(select(state).counts.all, 7);
  assert.equal(select(state, { segment: "archive" }).total, 1);
  assert.equal(select(state, { scope: "team" }, solo).total, 0);
  assert.equal(select(state, { scope: "team" }, agent).total, 2);
  assert.equal(select(state, { scope: "team" }, owner).total, 3);
});
test("summary availability can overlap review, archive excluded from active counts", () => {
  const state = fixture(),
    result = select(state, { segment: "available" });
  assert.ok(
    result.entries.some(
      ({ listing }) => freshnessReasons(listing, state.rules, now).length,
    ),
  );
  assert.equal(
    result.entries.some(({ listing }) => listing.archived),
    false,
  );
  assert.equal(result.counts.available, result.total);
});
test("district search supports Cyrillic, Uzbek aliases, partial numbers and spaces", () => {
  const state = fixture();
  for (const query of ["Чиланзар", "  Chilonzor  ", "Chilanzar"])
    assert.deepEqual(
      select(state, { query }).entries.map((x) => x.listing.id),
      ["248", "249"],
    );
  assert.equal(select(state, { query: "0317" }).total, 0);
  assert.equal(select(state, { query: "317" }).entries[0].listing.id, "317");
  assert.equal(select(state, { query: "yunusobod" }).total, 2);
});
test("closed addresses, internal notes and restricted offers cannot be searched by agent", () => {
  const state = fixture();
  state.properties.find((p) => p.id === "demo-property:agency-2").address =
    "Секретный адрес коллеги";
  assert.equal(
    select(state, { scope: "team", query: "Секретный адрес коллеги" }, agent)
      .total,
    0,
  );
  assert.equal(
    select(state, { scope: "team", query: "agency-private" }, agent).total,
    0,
  );
  assert.equal(
    select(state, { scope: "team", query: "Секретный адрес коллеги" }, owner)
      .total,
    1,
  );
  assert.equal(
    select(state, { query: "Внутренняя демонстрационная" }).total,
    0,
  );
  assert.equal(select(state, {}, { ...owner, lost: true }).total, 0);
});
test("filters combine groups AND and selected districts OR, inclusive ranges", () => {
  const state = fixture(),
    filters = {
      ...emptyFilters,
      operation: "rent",
      districts: ["Чиланзар", "Яккасарай"],
      minPrice: "520",
      maxPrice: "550",
      currency: "USD",
      unit: "month",
    };
  assert.equal(select(state, { filters }).total, 2);
  assert.equal(
    select(state, { filters: { ...filters, kinds: ["land", "house"] } }).total,
    0,
  );
  assert.equal(
    select(state, { filters: { ...filters, features: ["Мебель", "Лифт"] } })
      .total,
    1,
  );
});
test("unknown prices/rooms/area are not zero and land is normalized to square meters", () => {
  const state = fixture();
  assert.equal(
    priceLabel(state.listings.find((l) => l.id === "509")),
    "Цена не указана",
  );
  assert.equal(
    propertyArea(state.properties.find((p) => p.id === "demo-property:509")),
    600,
  );
  assert.equal(
    select(state, {
      filters: {
        ...emptyFilters,
        kinds: ["land"],
        minArea: "600",
        maxArea: "600",
      },
    }).total,
    1,
  );
  assert.equal(
    select(state, { filters: { ...emptyFilters, kinds: ["land"], rooms: "1" } })
      .total,
    0,
  );
  assert.equal(
    select(state, {
      filters: {
        ...emptyFilters,
        operation: "sale",
        currency: "UZS",
        unit: "total",
        minPrice: "0",
        maxPrice: "1",
      },
    }).total,
    0,
  );
});
test("price sorting never compares rent with sale, currencies or units; unknown last and stable", () => {
  const state = fixture();
  assert.equal(select(state, { sort: "price-asc" }).total, 0);
  const filters = {
    ...emptyFilters,
    operation: "rent",
    currency: "USD",
    unit: "month",
  };
  assert.deepEqual(
    select(state, { sort: "price-asc", filters }).entries.map(
      (x) => x.listing.id,
    ),
    ["248", "249", "401"],
  );
  assert.deepEqual(
    select(state, { sort: "price-desc", filters }).entries.map(
      (x) => x.listing.id,
    ),
    ["401", "249", "248"],
  );
  const sale = select(state, {
    sort: "price-asc",
    filters: { ...filters, operation: "sale", currency: "UZS", unit: "total" },
  });
  assert.deepEqual(
    sale.entries.map((x) => x.listing.id),
    ["718", "509"],
  );
});
test("filter validation rejects reversed ranges, non-numbers and mixed-operation price ranges", () => {
  assert.ok(filterError({ ...emptyFilters, minPrice: "1" }));
  assert.ok(filterError({ ...emptyFilters, minArea: "100", maxArea: "10" }));
  assert.ok(filterError({ ...emptyFilters, minFloor: "bad" }));
  assert.equal(
    filterError({
      ...emptyFilters,
      operation: "sale",
      minPrice: "0",
      maxPrice: "100",
    }),
    "",
  );
});
test("market unknown, floor versus building floors, missing values and never checked are distinct", () => {
  const state = fixture();
  assert.equal(
    select(state, {
      filters: { ...emptyFilters, market: "unknown" },
    }).entries.every((e) => !e.property.market),
    true,
  );
  assert.equal(
    select(state, {
      filters: {
        ...emptyFilters,
        minFloor: "3",
        maxFloor: "3",
        minFloors: "9",
        maxFloors: "9",
      },
    }).total,
    4,
  );
  assert.equal(
    select(state, {
      filters: { ...emptyFilters, freshness: "never" },
    }).entries.some((e) => e.listing.id === "248"),
    false,
  );
});
test("demo pagination is stable for 1000 and keeps user-created records on seed", () => {
  let state = fixture();
  state = run(state, {
    type: "seed",
    size: 1000,
    operationId: "seed-1000",
  }).state;
  const a = select(state, { limit: 30 }),
    b = select(state, { limit: 60 });
  assert.equal(a.entries.length, 30);
  assert.equal(b.entries.length, 60);
  assert.deepEqual(
    a.entries.map((e) => e.listing.id),
    b.entries.slice(0, 30).map((e) => e.listing.id),
  );
  assert.equal(
    run(state, { type: "seed", size: 1000, operationId: "seed-1000" }).state,
    state,
  );
});
test("freshness uses separate checks and an explicit threshold; a stale offer is not marked rented", () => {
  const state = fixture(),
    l = state.listings[0];
  assert.equal(freshnessReasons(l, state.rules, now).length, 0);
  assert.ok(
    freshnessReasons(l, state.rules, "2026-11-02T07:00:00.000Z").length,
  );
  assert.equal(l.status, "available");
  assert.ok(
    freshnessReasons(
      { ...l, checks: { price: l.checks.price } },
      state.rules,
      now,
    ).some((r) => r.includes("Наличие")),
  );
});
test("confirming only price does not confirm availability or legal rights", () => {
  const state = fixture(),
    result = run(
      state,
      command("review", "317", { review: review({ price: "yes" }) }),
    );
  assert.equal(result.error, "");
  const l = result.state.listings.find((l) => l.id === "317");
  assert.equal(l.checks.price.at, now);
  assert.equal(l.checks.availability, undefined);
  assert.equal(l.checks.conditions, undefined);
  assert.ok(freshnessReasons(l, state.rules, now).length);
});
test("failed owner contact keeps prior check timestamps but requires recheck", () => {
  const state = fixture();
  const result = run(state, command("review", "248", { review: review() }));
  const l = result.state.listings[0];
  assert.deepEqual(l.checks, state.listings[0].checks);
  assert.equal(l.status, "available");
  assert.equal(l.needsReview, true);
});
test("new price records old price and currency in history; conditions are independently checked", () => {
  const state = fixture();
  const result = run(
    state,
    command("review", "317", {
      review: review({
        availability: "yes",
        price: "changed",
        newPrice: "1000000000",
        currency: "UZS",
        conditions: "changed",
        newConditions: "Торг обсуждается",
      }),
    }),
  );
  const l = result.state.listings.find((l) => l.id === "317");
  assert.equal(result.error, "");
  assert.equal(l.price, 1000000000);
  assert.equal(l.currency, "UZS");
  assert.equal(l.checks.conditions.at, now);
  assert.ok(result.state.history[0].detail.includes("92"));
  assert.ok(result.state.history[0].detail.includes("сум"));
  assert.equal(freshnessReasons(l, state.rules, now).length, 0);
});
test("invalid checks do not mutate state, date, price or version", () => {
  const state = fixture();
  for (const r of [
    review({ price: "changed", newPrice: "-1" }),
    review({ source: "" }),
    review({ conditions: "changed" }),
    review({ availability: "no", unavailableStatus: "sold" }),
  ]) {
    const result = run(state, command("review", "248", { review: r }));
    assert.ok(result.error);
    assert.equal(result.state, state);
  }
  assert.ok(
    run(state, command("review", "509", { review: review({ price: "yes" }) }))
      .error,
  );
});
test("source unavailable is not silently fixed by a manual review", () => {
  const state = fixture();
  const result = run(
    state,
    command("review", "401", {
      review: review({ availability: "yes", price: "yes" }),
    }),
  );
  assert.ok(
    freshnessReasons(
      result.state.listings.find((l) => l.id === "401"),
      state.rules,
      now,
    ).includes("Источник перестал обновляться"),
  );
});
test("manual status is not verification, operation-specific status validation and archived links persist", () => {
  let state = fixture();
  state = run(
    state,
    command("link", "248", { clientId: "client-1", requestId: "request-1" }),
    solo,
    request,
  ).state;
  assert.ok(
    run(state, command("status", "248", { status: "sold", note: "" })).error,
  );
  state = run(
    state,
    command("status", "248", { status: "rented", note: "Собственник сообщил" }),
  ).state;
  assert.equal(
    select(state, { segment: "available" }).entries.some(
      (e) => e.listing.id === "248",
    ),
    false,
  );
  assert.equal(state.links.length, 1);
  state = run(
    state,
    command("archive", "248", { version: 2, archived: true }),
  ).state;
  assert.equal(state.links.length, 1);
  assert.equal(state.listings[0].archived, true);
  assert.ok(state.history.length >= 3);
  state = run(
    state,
    command("archive", "248", { version: 3, archived: false }),
  ).state;
  assert.equal(state.listings[0].status, "rented");
});
test("links choose a specific request, prevent duplicates and reject cross-scope/unavailable records", () => {
  let state = fixture();
  const action = command("link", "248", {
    clientId: "client-1",
    requestId: "request-2",
  });
  state = run(state, action, solo, request).state;
  assert.equal(state.links[0].requestId, "request-2");
  assert.equal(run(state, action, solo, request).state, state);
  assert.ok(
    run(state, { ...action, operationId: "second" }, solo, request).error,
  );
  assert.ok(
    run(state, { ...action, id: "192", operationId: "archived" }, solo, request)
      .error,
  );
  assert.ok(
    run(
      state,
      { ...action, requestId: "missing", operationId: "wrong" },
      solo,
      request,
    ).error,
  );
  assert.ok(
    run(
      state,
      { ...action, id: "agency-1", operationId: "cross" },
      owner,
      request,
    ).error,
  );
  state = run(
    state,
    { ...action, type: "unlink", operationId: "unlink" },
    solo,
    request,
  ).state;
  assert.equal(state.links.length, 0);
  assert.ok(state.history[0].title.includes("удалена"));
});
test("request selector uses actual captures and never invents multiple requests or budget", () => {
  const clients = [
    { id: "c", name: "Имя", scope: "mine", request: "Снять", primaryRequestId: "request-2" },
    { id: "empty", name: "Без запроса", scope: "mine", request: "" },
  ];
  assert.equal(requestTargets(clients, [])[0].requests[0].price, undefined);
  assert.equal(requestTargets(clients, [])[1].requests.length, 0);
  const items = [1, 2].map((n) => ({
    id: `request-${n}`,
    clientId: "c",
    scope: "mine",
    capture: {
      need: n === 1 ? "Купить" : "Снять",
      price: "600",
      currency: "USD",
      districts: "Чиланзар, Мирабад",
    },
  }));
  const targets = requestTargets(clients, items);
  assert.equal(targets[0].requests.length, 2);
  assert.equal(targets[0].requests[1].operation, "rent");
  assert.deepEqual(targets[0].requests[1].districts, ["Чиланзар", "Мирабад"]);
});
test("create validates optional numbers and units and starts unverified, no publication", () => {
  const draft = {
    ...emptyPropertyDraft,
    district: "Чиланзар",
    price: "520",
    area: "65",
  };
  for (const patch of [
    { price: "0" },
    { rooms: "1.5" },
    { area: "NaN" },
    { floor: "10", floors: "9" },
    { photos: ["https://untrusted.example/photo"] },
    { unit: "total" },
  ])
    assert.ok(draftError({ ...draft, ...patch }));
  const result = run(createPropertyState(), {
    type: "create",
    id: "new",
    scope: "mine",
    draft,
    operationId: "create",
  });
  assert.equal(result.error, "");
  assert.equal(result.state.listings[0].status, "unknown");
  assert.deepEqual(result.state.listings[0].checks, {});
  assert.equal(result.state.listings[0].price, 520);
  assert.equal(result.state.links.length, 0);
});
test("editing price invalidates only price verification and does not turn an edit into a check", () => {
  const state = fixture(),
    draft = propertyDraft(state.properties[0], state.listings[0]);
  draft.price = "540";
  draft.duplicateConfirmed = true;
  const result = run(state, command("edit", "248", { draft }));
  const l = result.state.listings[0];
  assert.equal(result.error, "");
  assert.equal(l.checks.price, undefined);
  assert.deepEqual(
    l.checks.availability,
    state.listings[0].checks.availability,
  );
  assert.equal(l.price, 540);
  assert.equal(l.status, "available");
});
test("possible duplicate needs explicit acknowledgement, not district and price alone", () => {
  const state = fixture(),
    p = state.properties[0];
  assert.equal(possibleDuplicates(state, p, "248")[0].id, "249");
  const draft = {
    ...propertyDraft(p, state.listings[0]),
    duplicateConfirmed: false,
  };
  assert.ok(
    run(state, {
      type: "create",
      id: "new",
      scope: "mine",
      draft,
      operationId: "create",
    }).error,
  );
  assert.equal(
    run(state, {
      type: "create",
      id: "new",
      scope: "mine",
      draft: { ...draft, duplicateConfirmed: true },
      operationId: "create-ack",
    }).error,
    "",
  );
});
test("physical merge preserves separate prices, sources, history and original records; undo is reversible", () => {
  const state = fixture(),
    action = command("duplicate", "248", {
      otherId: "249",
      otherVersion: 1,
      decision: "same",
    });
  const result = run(state, action);
  assert.equal(result.error, "");
  assert.equal(result.state.listings.length, state.listings.length);
  assert.equal(result.state.properties.length, state.properties.length);
  const right = result.state.listings.find((l) => l.id === "249");
  assert.equal(right.propertyId, result.state.listings[0].propertyId);
  assert.equal(right.price, 550);
  const restored = run(result.state, {
    type: "undoDuplicate",
    decisionId: action.operationId,
    operationId: "undo",
  });
  assert.equal(restored.error, "");
  assert.equal(
    restored.state.listings.find((l) => l.id === "249").propertyId,
    state.listings.find((l) => l.id === "249").propertyId,
  );
});
test("merge undo cannot destroy edits made after merging", () => {
  let state = fixture(),
    action = command("duplicate", "248", {
      otherId: "249",
      otherVersion: 1,
      decision: "same",
    });
  state = run(state, action).state;
  state = applyPropertyCommand(
    state,
    command("status", "249", { version: 2, status: "held", note: "" }),
    solo,
    [],
    now,
  ).state;
  assert.ok(
    run(state, {
      type: "undoDuplicate",
      decisionId: action.operationId,
      operationId: "undo",
    }).error,
  );
});
test("permissions guard every mutation, assigned staff can edit only their allowed corporate offers", () => {
  const state = fixture();
  const action = command("status", "agency-2", { status: "held", note: "" });
  assert.ok(run(state, action, agent).error);
  assert.equal(run(state, { ...action, id: "agency-1" }, agent).error, "");
  assert.ok(run(state, { ...action, id: "agency-private" }, agent).error);
  assert.equal(
    canViewListing(
      state.listings.find((l) => l.id === "agency-private"),
      agent,
    ),
    false,
  );
  for (const access of [
    { ...owner, lost: true },
    { ...owner, offline: true },
  ]) {
    const result = run(state, action, access);
    assert.ok(result.error);
    assert.equal(result.state, state);
  }
});
test("stale version cannot overwrite status, typed draft can retry after explicit version review", () => {
  let state = fixture();
  state = run(state, {
    type: "external",
    id: "248",
    operationId: "external",
  }).state;
  const action = command("review", "248", {
    review: review({ availability: "yes", price: "yes" }),
  });
  assert.ok(run(state, action).error.includes("изменён"));
  assert.equal(run(state, action).state, state);
  assert.equal(run(state, { ...action, version: 2 }).error, "");
});
test("duplicate delivery saves one review/event and invalid rules cannot alter freshness", () => {
  const state = fixture(),
    action = command("review", "248", { review: review({ price: "yes" }) }),
    result = run(state, action);
  assert.equal(run(result.state, action).state, result.state);
  assert.equal(result.state.history.length, 1);
  assert.ok(
    run(state, { type: "rules", rent: 0, sale: 7, operationId: "rules" }).error,
  );
  assert.equal(
    run(state, { type: "rules", rent: 5, sale: 21, operationId: "rules-good" })
      .state.rules.rent,
    5,
  );
});
test("property task joins global workspace, remains scoped, is idempotent and completion is not verification", () => {
  let state = { ...createWorkspace(), propertyHub: fixture() };
  const action = command("task", "248", {
    taskId: "property-task",
    title: "Уточнить наличие",
    dueAt: "2026-11-01T11:00",
    assignee: "Вы",
  });
  const result = applyPropertyWorkspace(state, action, solo, now);
  assert.equal(result.error, "");
  state = result.workspace;
  assert.equal(state.tasks[0].propertyListingId, "248");
  assert.equal(state.tasks[0].scope, "mine");
  assert.equal(state.tasks[0].custom, true);
  assert.equal(
    applyPropertyWorkspace(state, action, solo, now).workspace,
    state,
  );
  const checks = state.propertyHub.listings[0].checks;
  state = reduceWorkspace(
    state,
    { type: "toggleTask", taskId: "property-task" },
    now,
  );
  assert.equal(state.tasks[0].done, true);
  assert.deepEqual(state.propertyHub.listings[0].checks, checks);
  assert.ok(
    applyPropertyWorkspace(
      state,
      {
        ...action,
        taskId: "invalid",
        dueAt: "2026-02-31T11:00",
        operationId: "bad-task",
      },
      solo,
      now,
    ).error,
  );
});
test("link and later unavailability are reflected in Client 360 history without any message send", () => {
  let state = {
    ...createWorkspace(),
    propertyHub: fixture(),
    clients: [
      { id: "client-1", name: "Мадина", request: "Аренда", scope: "mine" },
    ],
  };
  state = applyPropertyWorkspace(
    state,
    command("link", "248", {
      clientId: "client-1",
      requestId: "client:client-1",
    }),
    solo,
    now,
  ).workspace;
  state = applyPropertyWorkspace(
    state,
    command("status", "248", { status: "rented", note: "" }),
    solo,
    now,
  ).workspace;
  assert.equal(state.propertyHub.links.length, 1);
  assert.equal(clientHistory(state, "client-1").length, 2);
  assert.equal(state.items.length, 0);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.calls.length, 0);
});
