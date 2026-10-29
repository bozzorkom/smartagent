import test from "node:test";
import assert from "node:assert/strict";
import { employees } from "../components/today-data.ts";
import {
  applyPropertyCommand,
  demoProperties,
  canViewListing,
  requestTargets,
  isAssignedPropertyTask,
} from "../components/property-model.ts";
import {
  applyPropertyWorkspace,
  createWorkspace,
} from "../components/today-state.ts";
const now = "2026-10-30T07:00:00.000Z";
test("every employee shown in assignment UI is accepted by property model", () => {
  const state = demoProperties(now);
  for (const assignee of employees) {
    const result = applyPropertyCommand(
      state,
      {
        type: "assign",
        id: "agency-1",
        version: 1,
        assignee,
        operationId: assignee,
      },
      { role: "owner", lost: false, offline: false },
      [],
      now,
    );
    assert.equal(result.error, "");
    assert.equal(
      result.state.listings.find((l) => l.id === "agency-1").assignee,
      assignee,
    );
  }
});
test("a separate capture does not replace an existing textual client request", () => {
  const clients = [
    {
      id: "c",
      name: "Клиент",
      scope: "mine",
      request: "Ищу квартиру для себя",
    },
  ];
  const items = [
    {
      id: "new-request",
      clientId: "c",
      scope: "mine",
      capture: {
        need: "Снять",
        price: "500",
        currency: "USD",
        districts: "Чиланзар",
      },
    },
  ];
  const targets = requestTargets(clients, items);
  assert.deepEqual(
    targets[0].requests.map((r) => r.id),
    ["client:c", "new-request"],
  );
});
test("an agent can manage only their own task on an editable assigned listing", () => {
  const state = demoProperties(now),
    access = { role: "agent", lost: false, offline: false };
  const task = {
    id: "task",
    propertyListingId: "agency-1",
    scope: "team",
    assignee: "Вы",
  };
  assert.equal(isAssignedPropertyTask(task, state, access), true);
  assert.equal(
    isAssignedPropertyTask({ ...task, assignee: "Анна" }, state, access),
    false,
  );
  assert.equal(
    isAssignedPropertyTask(
      { ...task, propertyListingId: "agency-2" },
      state,
      access,
    ),
    false,
  );
  assert.equal(
    isAssignedPropertyTask({ ...task, scope: "mine" }, state, access),
    false,
  );
  assert.equal(
    isAssignedPropertyTask(task, state, { ...access, lost: true }),
    false,
  );
});
test("property linking cannot bypass corporate client access rules", () => {
  const workspace = {
    ...createWorkspace(),
    propertyHub: demoProperties(now),
    clients: [
      {
        id: "private-client",
        name: "Закрытый клиент",
        request: "Купить",
        scope: "team",
      },
    ],
  };
  const command = {
    type: "link",
    id: "agency-1",
    version: 1,
    clientId: "private-client",
    requestId: "client:private-client",
    operationId: "restricted-link",
  };
  const agent = applyPropertyWorkspace(
    workspace,
    command,
    { role: "agent", lost: false, offline: false },
    now,
  );
  assert.ok(agent.error);
  assert.equal(agent.workspace, workspace);
  const owner = applyPropertyWorkspace(
    workspace,
    command,
    { role: "owner", lost: false, offline: false },
    now,
  );
  assert.equal(owner.error, "");
  assert.equal(owner.workspace.propertyHub.links.length, 1);
});
test("an unspecified role cannot access corporate objects", () => {
  const state = demoProperties(now);
  assert.equal(
    canViewListing(
      state.listings.find((l) => l.id === "agency-1"),
      { role: "", lost: false, offline: false },
    ),
    false,
  );
});
