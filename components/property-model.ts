import type { Client } from "./today-state";
import type { Item, Task } from "./today-data";
import { employees } from "./today-data.ts";

export type PropertyScope = "mine" | "team";
export type PropertyKind =
  "apartment" | "house" | "commercial" | "land" | "other";
export type PropertyStatus =
  | "available"
  | "held"
  | "unavailable"
  | "sold"
  | "rented"
  | "withdrawn"
  | "unknown";
export type PriceUnit = "total" | "month" | "sqm-month";
export type Property = {
  id: string;
  scope: PropertyScope;
  kind: PropertyKind;
  city: string;
  district: string;
  address: string;
  addressVisibility: "internal" | "public" | "approximate";
  area?: number;
  areaUnit: "sqm" | "sotka" | "ha";
  rooms?: number;
  floor?: number;
  floors?: number;
  market: string;
  features: string[];
  photos: string[];
  photoPrivate?: boolean;
  note: string;
};
export type Listing = {
  id: string;
  propertyId: string;
  scope: PropertyScope;
  operation: "sale" | "rent";
  price?: number;
  currency: "USD" | "UZS";
  unit: PriceUnit;
  status: PropertyStatus;
  archived: boolean;
  source: string;
  sourceUnavailable?: boolean;
  assignee: string;
  visibility: "workspace" | "assigned";
  createdAt: string;
  updatedAt: string;
  version: number;
  checks: Partial<
    Record<
      "price" | "availability" | "conditions",
      { at: string; source: string }
    >
  >;
  needsReview?: boolean;
  conditions: string;
};
export type PropertyLink = {
  listingId: string;
  clientId: string;
  requestId: string;
  at: string;
};
export type PropertyEvent = {
  id: string;
  listingId: string;
  at: string;
  title: string;
  detail: string;
  scope: PropertyScope;
};
export type DuplicateDecision = {
  id: string;
  left: string;
  right: string;
  kind: "same" | "different";
  previousPropertyId: string;
  movedListingIds: string[];
  versions: Record<string,number>;
  at: string;
  undone?: boolean;
};
export type PropertyState = {
  properties: Property[];
  listings: Listing[];
  links: PropertyLink[];
  history: PropertyEvent[];
  decisions: DuplicateDecision[];
  rules: { rent: number; sale: number };
  operations: string[];
};
export type PropertyDraft = {
  kind: PropertyKind;
  city: string;
  district: string;
  address: string;
  addressVisibility: Property["addressVisibility"];
  area: string;
  areaUnit: Property["areaUnit"];
  rooms: string;
  floor: string;
  floors: string;
  market: string;
  features: string[];
  photos: string[];
  note: string;
  operation: Listing["operation"];
  price: string;
  currency: Listing["currency"];
  unit: PriceUnit;
  source: string;
  conditions: string;
  duplicateConfirmed: boolean;
};
export type ReviewDraft = {
  availability: "yes" | "no" | "unknown";
  price: "yes" | "changed" | "unknown";
  conditions: "yes" | "changed" | "unknown";
  newPrice: string;
  currency: Listing["currency"];
  newConditions: string;
  unavailableStatus: PropertyStatus;
  source: string;
  note: string;
};
export type PropertyRequest = {
  id: string;
  label: string;
  operation?: Listing["operation"];
  price?: number;
  currency?: string;
  districts?: string[];
};
export type PropertyTarget = {
  id: string;
  name: string;
  scope: PropertyScope;
  requests: PropertyRequest[];
};
export type PropertyAccess = { role: string; lost: boolean; offline: boolean };
export type PropertyCommand = { operationId: string } & (
  | { type: "create"; id: string; scope: PropertyScope; draft: PropertyDraft }
  | { type: "edit"; id: string; version: number; draft: PropertyDraft }
  | { type: "review"; id: string; version: number; review: ReviewDraft }
  | {
      type: "status";
      id: string;
      version: number;
      status: PropertyStatus;
      note: string;
    }
  | { type: "archive"; id: string; version: number; archived: boolean }
  | { type: "assign"; id: string; version: number; assignee: string }
  | {
      type: "link" | "unlink";
      id: string;
      version: number;
      clientId: string;
      requestId: string;
    }
  | {
      type: "task";
      id: string;
      version: number;
      taskId: string;
      title: string;
      dueAt: string;
      assignee: string;
    }
  | {
      type: "duplicate";
      id: string;
      version: number;
      otherId: string;
      otherVersion: number;
      decision: "same" | "different";
    }
  | { type: "undoDuplicate"; decisionId: string }
  | { type: "rules"; rent: number; sale: number }
  | { type: "seed"; size: number }
  | { type: "external"; id: string }
);
export type PropertyView = {
  scope: PropertyScope;
  query: string;
  segment: string;
  sort: string;
  filters: PropertyFilters;
  limit: number;
};
export type PropertyFilters = {
  operation: string;
  kinds: string[];
  city: string;
  districts: string[];
  currency: string;
  unit: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  minArea: string;
  maxArea: string;
  minFloor: string;
  maxFloor: string;
  minFloors: string;
  maxFloors: string;
  market: string;
  status: string;
  freshness: string;
  source: string;
  assignee: string;
  features: string[];
};
export const kindLabels: Record<PropertyKind, string> = {
  apartment: "Квартира",
  house: "Дом",
  commercial: "Коммерческое помещение",
  land: "Земельный участок",
  other: "Другое",
};
export const statusLabels: Record<PropertyStatus, string> = {
  available: "Доступен",
  held: "Предварительно занят",
  unavailable: "Временно недоступен",
  sold: "Продан",
  rented: "Сдан",
  withdrawn: "Снят с предложения",
  unknown: "Неизвестно",
};
export const operationLabels = { sale: "Продажа", rent: "Аренда" };
export const unitLabels: Record<PriceUnit, string> = {
  total: "Полная цена",
  month: "В месяц",
  "sqm-month": "За м² в месяц",
};
export const districts = [
  "Чиланзар",
  "Юнусабад",
  "Яккасарай",
  "Мирабад",
  "Мирзо-Улугбек",
  "Шайхантахур",
  "Сергелийский",
  "Яшнабад",
  "Бектемир",
  "Алмазар",
  "Учтепа",
  "Янгихаёт",
];
export const sources = [
  "Добавлено вручную",
  "Собственник",
  "Агентство",
  "Внешняя ссылка",
];
export const featureLabels = ["Мебель", "Парковка", "Лифт", "Отдельный вход"];
export const emptyFilters: PropertyFilters = {
  operation: "all",
  kinds: [],
  city: "",
  districts: [],
  currency: "USD",
  unit: "total",
  minPrice: "",
  maxPrice: "",
  rooms: "",
  minArea: "",
  maxArea: "",
  minFloor: "",
  maxFloor: "",
  minFloors: "",
  maxFloors: "",
  market: "",
  status: "",
  freshness: "",
  source: "",
  assignee: "",
  features: [],
};
export const emptyPropertyDraft: PropertyDraft = {
  kind: "apartment",
  city: "Ташкент",
  district: "",
  address: "",
  addressVisibility: "internal",
  area: "",
  areaUnit: "sqm",
  rooms: "",
  floor: "",
  floors: "",
  market: "",
  features: [],
  photos: [],
  note: "",
  operation: "rent",
  price: "",
  currency: "USD",
  unit: "month",
  source: "Добавлено вручную",
  conditions: "",
  duplicateConfirmed: false,
};
export function createPropertyState(): PropertyState {
  return {
    properties: [],
    listings: [],
    links: [],
    history: [],
    decisions: [],
    rules: { rent: 3, sale: 14 },
    operations: [],
  };
}
export function defaultPropertyView(
  scope: PropertyScope = "mine",
): PropertyView {
  return {
    scope,
    query: "",
    segment: "all",
    sort: "new",
    filters: { ...emptyFilters },
    limit: 30,
  };
}
export function normalizePropertyText(value: string) {
  const text = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ʻʼ’`']/g, "")
    .replace(/ё/g, "е");
  const variants: Record<string, string> = {
    chilonzor: "чиланзар",
    chilanzar: "чиланзар",
    yunusobod: "юнусабад",
    yunusabad: "юнусабад",
    yakkasaroy: "яккасарай",
    mirobod: "мирабад",
    toshkent: "ташкент",
    tashkent: "ташкент",
    sergeli: "сергелийский",
    yashnobod: "яшнабад",
    olmazor: "алмазар",
    uchtepa: "учтепа",
    shayxontohur: "шайхантахур",
    yangihayot: "янгихаёт",
  };
  return text
    .replace(/[a-z-]+/g, (word) => variants[word] ?? word)
    .replace(/\s+/g, " ")
    .trim();
}
export function canViewListing(listing: Listing, access: PropertyAccess) {
  return (
    !access.lost &&
    (listing.scope === "mine" ||
      (["agent", "owner"].includes(access.role) &&
        (listing.visibility !== "assigned" ||
          listing.assignee === "Вы" ||
          access.role === "owner")))
  );
}
export function canEditListing(listing: Listing, access: PropertyAccess) {
  return (
    canViewListing(listing, access) &&
    (listing.scope === "mine" ||
      access.role === "owner" ||
      listing.assignee === "Вы")
  );
}
export function isAssignedPropertyTask(task: Task, state: PropertyState, access: PropertyAccess) {
  const listing=state.listings.find(value=>value.id===task.propertyListingId && value.scope===task.scope);
  return Boolean(access.role==='agent' && task.assignee==='Вы' && listing && canEditListing(listing,access));
}
export function displayAddress(
  property: Property,
  listing: Listing,
  access: PropertyAccess,
) {
  return property.addressVisibility === "internal" &&
    !canEditListing(listing, access)
    ? "Точный адрес скрыт"
    : property.address || "Адрес не указан";
}
export function propertyArea(property: Pick<Property, "area" | "areaUnit">) {
  return property.area == null
    ? undefined
    : property.area *
        (property.areaUnit === "sotka"
          ? 100
          : property.areaUnit === "ha"
            ? 10000
            : 1);
}
export function priceLabel(
  listing: Pick<Listing, "price" | "currency" | "unit">,
) {
  return listing.price == null
    ? "Цена не указана"
    : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(listing.price)} ${listing.currency === "USD" ? "$" : "сум"}${listing.unit === "month" ? " / мес." : listing.unit === "sqm-month" ? " / м² / мес." : ""}`;
}
export function propertyDate(at: string) {
  return new Date(at).toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function freshnessReasons(
  listing: Listing,
  rules: PropertyState["rules"],
  now: string,
) {
  const reasons: string[] = [];
  if (listing.sourceUnavailable) reasons.push("Источник перестал обновляться");
  if (listing.needsReview) reasons.push("Назначена повторная проверка");
  for (const [key, label] of [
    ["availability", "Наличие"],
    ["price", "Цена"],
  ] as const) {
    const check = listing.checks[key];
    if (!check)
      reasons.push(`${label} не подтвержден${key === "price" ? "а" : "о"}`);
    else if (
      Date.parse(now) - Date.parse(check.at) >=
      rules[listing.operation] * 86400000
    )
      reasons.push(`${label}: срок проверки истёк`);
  }
  return reasons;
}
export function requestTargets(
  clients: Client[],
  items: Item[],
): PropertyTarget[] {
  return clients
    .filter((client) => !client.archived)
    .map((client) => {
      const captures = items
        .filter(
          (item) =>
            item.clientId === client.id &&
            item.scope === client.scope &&
            item.capture,
        )
        .map((item) => ({
          id: item.id,
          label: [
            item.capture!.need,
            item.capture!.districts,
            item.capture!.price
              ? `${item.capture!.price} ${item.capture!.currency}`
              : "Бюджет не указан",
          ]
            .filter(Boolean)
            .join(" · "),
          operation:
            item.capture!.need === "Купить"
              ? ("sale" as const)
              : item.capture!.need === "Снять"
                ? ("rent" as const)
                : undefined,
          price: item.capture!.price ? Number(item.capture!.price) : undefined,
          currency: item.capture!.currency,
          districts: item
            .capture!.districts.split(/[,;]+/)
            .map((value) => value.trim())
            .filter(Boolean),
        }));
      const primary: PropertyRequest[] = client.request.trim() && !captures.some(request => request.id === client.primaryRequestId)
        ? [{ id: `client:${client.id}`, label: client.request }]
        : [];
      const requests: PropertyRequest[] = [...primary, ...captures];
      return {
        id: client.id,
        name: client.name,
        scope: client.scope,
        requests,
      };
    });
}
function inRange(value: number | undefined, min: string, max: string) {
  return (
    (!min && !max) ||
    (value != null &&
      (!min || value >= Number(min)) &&
      (!max || value <= Number(max)))
  );
}
export function filterError(filters: PropertyFilters) {
  for (const [min, max] of [
    [filters.minPrice, filters.maxPrice],
    [filters.minArea, filters.maxArea],
    [filters.minFloor, filters.maxFloor],
    [filters.minFloors, filters.maxFloors],
  ]) {
    if (
      [min, max].some(
        (value) =>
          value !== "" &&
          (!Number.isFinite(Number(value)) || Number(value) < 0),
      )
    )
      return "Диапазоны должны содержать неотрицательные числа.";
    if (min && max && Number(min) > Number(max))
      return "Значение «От» не должно превышать «До».";
  }
  if ((filters.minPrice || filters.maxPrice) && filters.operation === "all")
    return "Для диапазона цены выберите продажу или аренду.";
  return "";
}
export function selectProperties(
  state: PropertyState,
  view: PropertyView,
  access: PropertyAccess,
  now: string,
) {
  const f = view.filters,
    needle = normalizePropertyText(view.query);
  const all = state.listings.filter(
    (listing) =>
      listing.scope === view.scope && canViewListing(listing, access),
  );
  const active = all.filter((listing) => !listing.archived);
  const counts = {
    all: active.length,
    available: active.filter((l) => l.status === "available").length,
    review: active.filter((l) => freshnessReasons(l, state.rules, now).length)
      .length,
  };
  let entries = all
    .filter((l) => (view.segment === "archive" ? l.archived : !l.archived))
    .filter((l) =>
      view.segment === "available"
        ? l.status === "available"
        : view.segment === "review"
          ? freshnessReasons(l, state.rules, now).length > 0
          : view.segment === "held"
            ? l.status === "held"
            : true,
    )
    .flatMap((listing) => {
      const property = state.properties.find(
        (p) => p.id === listing.propertyId && p.scope === listing.scope,
      );
      if (!property) return [];
      if (
        needle &&
        !normalizePropertyText(
          [
            listing.id,
            property.city,
            property.district,
            displayAddress(property, listing, access),
            kindLabels[property.kind],
          ].join(" "),
        ).includes(needle)
      )
        return [];
      if (
        (f.operation !== "all" && listing.operation !== f.operation) ||
        (f.kinds.length && !f.kinds.includes(property.kind)) ||
        (f.city &&
          !normalizePropertyText(property.city).includes(
            normalizePropertyText(f.city),
          )) ||
        (f.districts.length &&
          !f.districts.some(
            (d) =>
              normalizePropertyText(d) ===
              normalizePropertyText(property.district),
          ))
      )
        return [];
      if (
        (f.minPrice || f.maxPrice || view.sort.startsWith("price")) &&
        (listing.currency !== f.currency ||
          listing.unit !== f.unit ||
          f.operation === "all" ||
          listing.operation !== f.operation)
      )
        return [];
      if (
        !inRange(listing.price, f.minPrice, f.maxPrice) ||
        !inRange(propertyArea(property), f.minArea, f.maxArea) ||
        !inRange(property.floor, f.minFloor, f.maxFloor) ||
        !inRange(property.floors, f.minFloors, f.maxFloors)
      )
        return [];
      if (
        f.rooms &&
        (property.rooms == null ||
          (f.rooms === "4+"
            ? property.rooms < 4
            : property.rooms !== Number(f.rooms)))
      )
        return [];
      if (
        (f.market &&
          (f.market === "unknown"
            ? Boolean(property.market)
            : property.market !== f.market)) ||
        (f.status && listing.status !== f.status) ||
        (f.source && listing.source !== f.source) ||
        (f.assignee &&
          (f.assignee === "unassigned"
            ? Boolean(listing.assignee)
            : listing.assignee !== f.assignee)) ||
        !f.features.every((feature) => property.features.includes(feature))
      )
        return [];
      const reasons = freshnessReasons(listing, state.rules, now);
      if (
        (f.freshness === "fresh" && reasons.length) ||
        (f.freshness === "review" && !reasons.length) ||
        (f.freshness === "never" &&
          (listing.checks.price || listing.checks.availability))
      )
        return [];
      return [{ listing, property }];
    });
  const checked = (l: Listing) =>
    Math.min(
      ...(["price", "availability"] as const).map((k) =>
        l.checks[k] ? Date.parse(l.checks[k]!.at) : 0,
      ),
    );
  entries = entries.sort((a, b) => {
    const x = a.listing,
      y = b.listing;
    const diff =
      view.sort === "updated"
        ? Date.parse(y.updatedAt) - Date.parse(x.updatedAt)
        : view.sort === "checked"
          ? checked(y) - checked(x)
          : view.sort === "old-check"
            ? checked(x) - checked(y)
            : view.sort.startsWith("price")
              ? x.price == null && y.price == null
                ? 0
                : x.price == null
                  ? 1
                  : y.price == null
                    ? -1
                    : (x.price - y.price) *
                      (view.sort === "price-desc" ? -1 : 1)
              : Date.parse(y.createdAt) - Date.parse(x.createdAt);
    return diff || x.id.localeCompare(y.id, undefined, { numeric: true });
  });
  return {
    counts,
    total: entries.length,
    entries: entries.slice(0, view.limit),
  };
}
export function propertyDraft(
  property: Property,
  listing: Listing,
): PropertyDraft {
  return {
    ...property,
    area: property.area?.toString() ?? "",
    rooms: property.rooms?.toString() ?? "",
    floor: property.floor?.toString() ?? "",
    floors: property.floors?.toString() ?? "",
    operation: listing.operation,
    price: listing.price?.toString() ?? "",
    currency: listing.currency,
    unit: listing.unit,
    source: listing.source,
    conditions: listing.conditions,
    duplicateConfirmed: false,
  };
}
export function draftError(draft: PropertyDraft) {
  if (
    !Object.hasOwn(kindLabels, draft.kind) ||
    !draft.city.trim() ||
    !draft.district.trim()
  )
    return "Укажите тип, город и район.";
  if (
    !["sale", "rent"].includes(draft.operation) ||
    !["USD", "UZS"].includes(draft.currency) ||
    !["sqm", "sotka", "ha"].includes(draft.areaUnit) ||
    !sources.includes(draft.source) ||
    !["public", "internal", "approximate"].includes(draft.addressVisibility)
  )
    return "Проверьте значения полей.";
  if (
    draft.operation === "sale"
      ? draft.unit !== "total"
      : !["month", "sqm-month"].includes(draft.unit)
  )
    return "Единица цены не соответствует операции.";
  for (const [key, label] of [
    ["price", "цену"],
    ["area", "площадь"],
    ["rooms", "число комнат"],
    ["floor", "этаж"],
    ["floors", "этажность"],
  ] as const) {
    const value = draft[key];
    if (
      value !== "" &&
      (!/^\d+(\.\d{1,2})?$/.test(value) ||
        Number(value) <= 0 ||
        Number(value) > 1e15 ||
        (["rooms", "floor", "floors"].includes(key) &&
          !Number.isInteger(Number(value))))
    )
      return `Укажите корректную ${label}.`;
  }
  if (draft.floor && draft.floors && Number(draft.floor) > Number(draft.floors))
    return "Этаж не может быть выше этажности здания.";
  if (
    [draft.city, draft.district].some((v) => v.length > 120) ||
    draft.address.length > 300 ||
    draft.note.length > 2000 ||
    draft.conditions.length > 2000
  )
    return "Сократите текст полей.";
  if (
    draft.photos.some(
      (p) =>
        ![
          "/images/property-living.png",
          "/images/property-kitchen.png",
          "/images/demo-missing.jpg",
        ].includes(p),
    ) ||
    draft.features.some((f) => !featureLabels.includes(f))
  )
    return "Выберите доступные демо-материалы.";
  return "";
}
export function possibleDuplicates(
  state: PropertyState,
  property: Property,
  excludeId = "",
) {
  return state.listings
    .filter(
      (l) => l.id !== excludeId && l.scope === property.scope && !l.archived,
    )
    .filter((l) => {
      const p = state.properties.find((p) => p.id === l.propertyId);
      return (
        p &&
        p.id !== property.id &&
        p.kind === property.kind &&
        Boolean(property.address.trim()) &&
        normalizePropertyText(p.address) ===
          normalizePropertyText(property.address) &&
        normalizePropertyText(p.city) === normalizePropertyText(property.city)
      );
    });
}
export function validStatus(
  operation: Listing["operation"],
  status: PropertyStatus,
) {
  return (
    Object.hasOwn(statusLabels, status) &&
    !(operation === "sale" && status === "rented") &&
    !(operation === "rent" && status === "sold")
  );
}
function fromDraft(
  d: PropertyDraft,
  id: string,
  scope: PropertyScope,
): Property {
  return {
    id,
    scope,
    kind: d.kind,
    city: d.city.trim(),
    district: d.district.trim(),
    address: d.address.trim(),
    addressVisibility: d.addressVisibility,
    area: d.area ? Number(d.area) : undefined,
    areaUnit: d.areaUnit,
    rooms:
      d.kind === "land" ? undefined : d.rooms ? Number(d.rooms) : undefined,
    floor:
      d.kind === "land" || d.kind === "house"
        ? undefined
        : d.floor
          ? Number(d.floor)
          : undefined,
    floors:
      d.kind === "land" ? undefined : d.floors ? Number(d.floors) : undefined,
    market: ["apartment", "house"].includes(d.kind) ? d.market : "",
    features: d.features,
    photos: d.photos,
    note: d.note.trim(),
  };
}
export function applyPropertyCommand(
  state: PropertyState,
  command: PropertyCommand,
  access: PropertyAccess,
  targets: PropertyTarget[],
  now: string,
): { state: PropertyState; error: string } {
  const reject = (error: string) => ({ state, error });
  if (access.lost) return reject("Доступ отозван. Данные ��крыты.");
  if (access.offline)
    return reject(
      "Нет соединения. Изменения не сохранены; ввод остался в форме.",
    );
  if (!command.operationId || state.operations.includes(command.operationId))
    return { state, error: "" };
  let next: PropertyState = {
    ...state,
    operations: [...state.operations, command.operationId],
  };
  const event = (listing: Listing, title: string, detail = "") => {
    next.history = [
      {
        id: command.operationId,
        listingId: listing.id,
        at: now,
        title,
        detail,
        scope: listing.scope,
      },
      ...next.history,
    ];
  };
  const listing =
    "id" in command
      ? state.listings.find((l) => l.id === command.id)
      : undefined;
  if ("version" in command && (!listing || !canViewListing(listing, access)))
    return reject("Объект не найден или недоступен.");
  if ("version" in command && listing!.version !== command.version)
    return reject(
      "Объект был изменён. Посмотрите изменения и обновите версию формы. Ваш ввод сохранён.",
    );
  if (
    listing &&
    !["link", "unlink"].includes(command.type) &&
    !canEditListing(listing, access) &&
    command.type !== "external"
  )
    return reject("Вы не можете изменить этот объект.");
  const update = (change: Partial<Listing>) => {
    next.listings = next.listings.map((l) =>
      l.id === listing!.id
        ? { ...l, ...change, version: l.version + 1, updatedAt: now }
        : l,
    );
  };
  if (command.type === "seed") {
    if (![1, 8, 1000].includes(command.size))
      return reject("Неизвестный демо-набор.");
    const seeded = demoProperties(now, command.size);
    next = {
      ...next,
      properties: [
        ...state.properties,
        ...seeded.properties.filter(
          (p) => !state.properties.some((v) => v.id === p.id),
        ),
      ],
      listings: [
        ...state.listings,
        ...seeded.listings.filter(
          (l) => !state.listings.some((v) => v.id === l.id),
        ),
      ],
    };
  } else if (command.type === "rules") {
    if (
      ![command.rent, command.sale].every(
        (v) => Number.isInteger(v) && v >= 1 && v <= 365,
      )
    )
      return reject("Порог проверки: от 1 до 365 дней.");
    next.rules = { rent: command.rent, sale: command.sale };
  } else if (command.type === "create" || command.type === "edit") {
    const error = draftError(command.draft);
    if (error) return reject(error);
    const scope = command.type === "create" ? command.scope : listing!.scope;
    if (scope === "team" && !["agent", "owner"].includes(access.role))
      return reject("Нет доступа к агентской базе.");
    if (
      command.type === "create" &&
      state.listings.some((l) => l.id === command.id)
    )
      return reject("Запись уже создана.");
    const physicalId =
      command.type === "create"
        ? `property:${command.id}`
        : listing!.propertyId;
    const property = fromDraft(command.draft, physicalId, scope);
    if (
      possibleDuplicates(state, property, command.id).length &&
      !command.draft.duplicateConfirmed
    )
      return reject(
        "Есть похожая запись. Сравните объекты или подтвердите отдельное предложение.",
      );
    if (
      command.type === "edit" &&
      state.listings.some(
        (l) =>
          l.propertyId === physicalId &&
          l.id !== listing!.id &&
          !canEditListing(l, access),
      )
    )
      return reject(
        "Физический объект связан с чужим предложением. Его параметры здесь доступны только для чтения.",
      );
    next.properties = state.properties.some((p) => p.id === physicalId)
      ? state.properties.map((p) => (p.id === physicalId ? property : p))
      : [...state.properties, property];
    if (command.type === "create") {
      const created: Listing = {
        id: command.id,
        propertyId: physicalId,
        scope,
        operation: command.draft.operation,
        price: command.draft.price ? Number(command.draft.price) : undefined,
        currency: command.draft.currency,
        unit: command.draft.unit,
        status: "unknown",
        archived: false,
        source: command.draft.source,
        assignee: "Вы",
        visibility: "workspace",
        createdAt: now,
        updatedAt: now,
        version: 1,
        checks: {},
        conditions: command.draft.conditions.trim(),
      };
      next.listings = [...state.listings, created];
      event(
        created,
        "Объект добавлен вручную",
        "Доступность и цена пока не подтверждены. Публикация не выполнялась.",
      );
    } else {
      const d = command.draft,
        checks = { ...listing!.checks };
      if (
        d.price !== String(listing!.price ?? "") ||
        d.currency !== listing!.currency ||
        d.unit !== listing!.unit
      )
        delete checks.price;
      if (d.conditions.trim() !== listing!.conditions) delete checks.conditions;
      if (d.operation !== listing!.operation) {
        delete checks.availability;
        delete checks.price;
      }
      update({
        operation: d.operation,
        price: d.price ? Number(d.price) : undefined,
        currency: d.currency,
        unit: d.unit,
        source: d.source,
        conditions: d.conditions.trim(),
        checks,
        status:
          d.operation !== listing!.operation ? "unknown" : listing!.status,
      });
      next.listings = next.listings.map((l) =>
        l.propertyId === physicalId && l.id !== listing!.id
          ? { ...l, version: l.version + 1, updatedAt: now }
          : l,
      );
      event(
        listing!,
        "Данные объекта изменены",
        `Цена: ${priceLabel(listing!)} → ${priceLabel(next.listings.find((l) => l.id === listing!.id)!)}. Изменение данных не подтверждает актуальность.`,
      );
    }
  } else if (command.type === "review") {
    const r = command.review;
    if (
      !["yes", "no", "unknown"].includes(r.availability) ||
      !["yes", "changed", "unknown"].includes(r.price) ||
      !["yes", "changed", "unknown"].includes(r.conditions)
    )
      return reject("Выберите допустимые результаты проверки.");
    if (
      !r.source ||
      r.note.length > 2000 ||
      ![
        "Собственник сообщил",
        "Представитель сообщил",
        "Доступная система",
        "Другие сведения",
      ].includes(r.source)
    )
      return reject("Укажите источник проверки.");
    if (
      r.price === "changed" &&
      (!/^\d+(\.\d{1,2})?$/.test(r.newPrice) ||
        Number(r.newPrice) <= 0 ||
        Number(r.newPrice) > 1e15 ||
        !["USD", "UZS"].includes(r.currency))
    )
      return reject("Укажите новую положительную цену и валюту.");
    if (r.price === "yes" && listing!.price == null)
      return reject("Цена неизвестна. Укажите новую цену или «Не уточнял».");
    if (r.conditions === "changed" && !r.newConditions.trim())
      return reject("Опишите новые условия.");
    if (
      r.availability === "no" &&
      (!validStatus(listing!.operation, r.unavailableStatus) ||
        !["unavailable", "sold", "rented", "withdrawn"].includes(
          r.unavailableStatus,
        ))
    )
      return reject("Укажите причину недоступности.");
    const checks = { ...listing!.checks },
      check = { at: now, source: r.source };
    if (r.availability !== "unknown") checks.availability = check;
    if (r.price !== "unknown") checks.price = check;
    if (r.conditions !== "unknown") checks.conditions = check;
    update({
      checks,
      needsReview: r.availability === "unknown" || r.price === "unknown",
      status:
        r.availability === "yes"
          ? "available"
          : r.availability === "no"
            ? r.unavailableStatus
            : listing!.status,
      price: r.price === "changed" ? Number(r.newPrice) : listing!.price,
      currency: r.price === "changed" ? r.currency : listing!.currency,
      conditions:
        r.conditions === "changed"
          ? r.newConditions.trim()
          : listing!.conditions,
    });
    event(
      listing!,
      "Проверка объекта сохранена",
      `${r.source}. Наличие: ${r.availability === "yes" ? "подтверждено" : r.availability === "no" ? statusLabels[r.unavailableStatus] : "не уточнено"}. Цена: ${r.price === "changed" ? `${priceLabel(listing!)} → ${priceLabel(next.listings.find((l) => l.id === listing!.id)!)}` : r.price === "yes" ? "подтверждена" : "не уточнена"}. Условия: ${r.conditions === "unknown" ? "не уточнялись" : r.conditions === "changed" ? r.newConditions : "подтверждены"}. ${r.note.trim()}`,
    );
  } else if (command.type === "status") {
    if (
      !validStatus(listing!.operation, command.status) ||
      command.note.length > 2000
    )
      return reject("Статус не соответствует операции.");
    if (listing!.status === command.status)
      return reject("Этот статус уже установлен.");
    const checks = { ...listing!.checks };
    delete checks.availability;
    update({ status: command.status, checks, needsReview: true });
    event(
      listing!,
      "Статус объекта изменён",
      `${statusLabels[listing!.status]} → ${statusLabels[command.status]}. Отметка вручную, не бронь и не сделка. ${command.note.trim()}`,
    );
  } else if (command.type === "archive") {
    if (listing!.archived === command.archived)
      return reject("Состояние архива уже установлено.");
    update({ archived: command.archived });
    event(
      listing!,
      command.archived
        ? "Предложение перенесено в архив"
        : "Предложение восстановлено",
      "Связи с клиентами и история сохранены.",
    );
  } else if (command.type === "assign") {
    if (
      access.role !== "owner" ||
      listing!.scope !== "team" ||
      !["", "Вы", ...employees].includes(command.assignee)
    )
      return reject("Назначать сотрудника может руководитель.");
    update({ assignee: command.assignee });
    event(
      listing!,
      "Ответственный изменён",
      command.assignee || "Без ответственного",
    );
  } else if (command.type === "link" || command.type === "unlink") {
    const target = targets.find(
      (t) =>
        t.id === command.clientId &&
        t.scope === listing!.scope &&
        t.requests.some((r) => r.id === command.requestId),
    );
    if (!target)
      return reject("Выберите доступный запрос клиента из этого пространства.");
    const exists = state.links.some(
      (l) =>
        l.listingId === listing!.id &&
        l.clientId === target.id &&
        l.requestId === command.requestId,
    );
    if (
      command.type === "link" &&
      (listing!.archived || listing!.status !== "available")
    )
      return reject(
        "Для новой связи выберите доступное неархивное предложение.",
      );
    if (command.type === "link" && exists)
      return reject("Объект уже связан с этим запросом.");
    if (command.type === "unlink" && !exists)
      return reject("Связь уже удалена.");
    next.links =
      command.type === "link"
        ? [
            ...state.links,
            {
              listingId: listing!.id,
              clientId: target.id,
              requestId: command.requestId,
              at: now,
            },
          ]
        : state.links.filter(
            (l) =>
              !(
                l.listingId === listing!.id &&
                l.clientId === target.id &&
                l.requestId === command.requestId
              ),
          );
    event(
      listing!,
      command.type === "link"
        ? "Объект связан с запросом"
        : "Связь с запросом удалена",
      `${target.name} · ${target.requests.find((r) => r.id === command.requestId)!.label}. Сообщение не отправлялось.`,
    );
  } else if (command.type === "task") {
    if (
      !command.title.trim() ||
      command.title.length > 200 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(command.dueAt)
    )
      return reject("Укажите название и срок задачи.");
    if (
      listing!.scope === "team" &&
      access.role !== "owner" &&
      command.assignee !== "Вы"
    )
      return reject("Сотрудник может назначить задачу только себе.");
    event(
      listing!,
      "Задача по объекту создана",
      `${command.title} · ${command.dueAt.replace("T", " · ")} · ${command.assignee || "Вы"}. Выполнение задачи не подтверждает сведения объекта.`,
    );
  } else if (command.type === "duplicate") {
    const other = state.listings.find((l) => l.id === command.otherId);
    if (
      !other ||
      !canEditListing(other, access) ||
      other.scope !== listing!.scope ||
      other.version !== command.otherVersion ||
      other.propertyId === listing!.propertyId
    )
      return reject(
        "Сравниваемое предложение изменено, объединено или недоступно.",
      );
    const moved = state.listings.filter(
      (l) => l.propertyId === other.propertyId,
    );
    if (
      command.decision === "same" &&
      moved.some((l) => !canEditListing(l, access))
    )
      return reject("Нет прав на все предложения этого физического объекта.");
    if (command.decision === "same")
      next.listings = state.listings.map((l) =>
        l.propertyId === other.propertyId
          ? {
              ...l,
              propertyId: listing!.propertyId,
              version: l.version + 1,
              updatedAt: now,
            }
          : l,
      );
    next.decisions = [
      ...state.decisions,
      {
        id: command.operationId,
        left: listing!.id,
        right: other.id,
        kind: command.decision,
        previousPropertyId: other.propertyId,
        movedListingIds: moved.map((l) => l.id),
        versions: Object.fromEntries(next.listings.filter(l=>l.propertyId===listing!.propertyId).map(l=>[l.id,l.version])),
        at: now,
      },
    ];
    event(
      listing!,
      command.decision === "same"
        ? "Подтверждён один физический объект"
        : "Подтверждены разные объекты",
      "Предложения, исходные записи, источники, цены, связи и история не удалены.",
    );
  } else if (command.type === "undoDuplicate") {
    const decision = state.decisions.find(
      (d) => d.id === command.decisionId && !d.undone && d.kind === "same",
    );
    if (!decision) return reject("Объединение уже отменено или не найдено.");
    const left = state.listings.find((l) => l.id === decision.left),
      right = state.listings.find((l) => l.id === decision.right);
    if (
      !left ||
      !right ||
      !canEditListing(left, access) ||
      !canEditListing(right, access)
    )
      return reject("Нет прав на отмену объединения.");
    if (
      state.listings.some(
        (l) =>
          l.propertyId === left.propertyId &&
          decision.versions[l.id] !== l.version,
      )
    )
      return reject(
        "После объединения появились изменения. Отмена недоступна, чтобы не потерять новые данные.",
      );
    if (
      state.listings
        .filter((l) => decision.movedListingIds.includes(l.id))
        .some((l) => !canEditListing(l, access))
    )
      return reject("Нет прав на отмену всех связанных предложений.");
    next.listings = state.listings.map((l) =>
      decision.movedListingIds.includes(l.id)
        ? {
            ...l,
            propertyId: decision.previousPropertyId,
            version: l.version + 1,
            updatedAt: now,
          }
        : l,
    );
    next.decisions = state.decisions.map((d) =>
      d.id === decision.id ? { ...d, undone: true } : d,
    );
    event(
      left,
      "Объединение отменено",
      "Исходная запись физического объекта восстановлена.",
    );
  } else if (command.type === "external") {
    if (!listing || !canViewListing(listing, access))
      return reject("Нет доступного объекта.");
    update({ conditions: `Демо-изменение коллеги · ${propertyDate(now)}` });
    event(
      listing,
      "Демо: данные изменены коллегой",
      "Версия обновлена. Несохранённая форма не перезаписывается.",
    );
  }
  return { state: next, error: "" };
}
export function demoProperties(now: string, size = 8): PropertyState {
  const state = createPropertyState();
  const rows = [
    [
      "248",
      "apartment",
      "Чиланзар",
      "rent",
      520,
      "USD",
      "month",
      "available",
      65,
      2,
      "Собственник",
    ],
    [
      "317",
      "apartment",
      "Юнусабад",
      "sale",
      92000,
      "USD",
      "total",
      "available",
      84,
      3,
      "Добавлено вручную",
    ],
    [
      "401",
      "apartment",
      "Яккасарай",
      "rent",
      700,
      "USD",
      "month",
      "available",
      92,
      3,
      "Внешняя ссылка",
    ],
    [
      "192",
      "apartment",
      "Мирабад",
      "rent",
      600,
      "USD",
      "month",
      "rented",
      58,
      2,
      "Собственник",
    ],
    [
      "509",
      "land",
      "Сергелийский",
      "sale",
      null,
      "UZS",
      "total",
      "unknown",
      6,
      null,
      "Добавлено вручную",
    ],
    [
      "610",
      "commercial",
      "Мирабад",
      "rent",
      12,
      "USD",
      "sqm-month",
      "held",
      120,
      null,
      "Агентство",
    ],
    [
      "718",
      "house",
      "Юнусабад",
      "sale",
      2100000000,
      "UZS",
      "total",
      "available",
      180,
      5,
      "Собственник",
    ],
    [
      "249",
      "apartment",
      "Чиланзар",
      "rent",
      550,
      "USD",
      "month",
      "available",
      65,
      2,
      "Добавлено вручную",
    ],
  ] as const;
  for (let index = 0; index < size; index++) {
    const row = rows[index % rows.length],
      scope: PropertyScope =
        index >= rows.length && index % 5 === 0 ? "team" : "mine",
      id = index < rows.length ? row[0] : String(10000 + index),
      at = new Date(Date.parse(now) - (index + 1) * 3600000).toISOString();
    const property: Property = {
      id: `demo-property:${id}`,
      scope,
      kind: row[1],
      city: "Ташкент",
      district: row[2],
      address:
        index === 7
          ? "квартал 7, дом 12"
          : `квартал ${(index % 7) + 7}, дом ${(index % 9) + 12}`,
      addressVisibility:
        index % 3 === 1
          ? "internal"
          : index % 3 === 2
            ? "approximate"
            : "public",
      area: row[8],
      areaUnit: row[1] === "land" ? "sotka" : "sqm",
      rooms: row[9] ?? undefined,
      floor: row[1] === "apartment" ? 3 : undefined,
      floors: row[1] === "apartment" ? 9 : undefined,
      market: row[1] === "apartment" ? "Вторичное жильё" : "",
      features: index % 2 === 0 ? ["Мебель", "Лифт"] : [],
      photos:
        index === 0 || index === 7
          ? ["/images/property-living.png", "/images/property-kitchen.png"]
          : index === 1
            ? ["/images/property-kitchen.png"]
            : [],
      note: "Внутренняя демонстрационная заметка. Документы и право распоряжения не проверены.",
    };
    const listing: Listing = {
      id,
      propertyId: property.id,
      scope,
      operation: row[3],
      price: row[4] ?? undefined,
      currency: row[5],
      unit: row[6],
      status: row[7],
      archived: index === 3,
      source: row[10],
      sourceUnavailable: index === 2,
      assignee: scope === "team" ? "Анна" : "Вы",
      visibility:
        index % 10 === 0 && scope === "team" ? "assigned" : "workspace",
      createdAt: at,
      updatedAt: at,
      version: 1,
      checks:
        index === 0
          ? {
              price: { at: now, source: "Собственник сообщил" },
              availability: { at: now, source: "Собственник сообщил" },
            }
          : index === 2
            ? {
                availability: {
                  at: new Date(Date.parse(now) - 10 * 86400000).toISOString(),
                  source: "Другие сведения",
                },
              }
            : {},
      conditions: "",
    };
    state.properties.push(property);
    state.listings.push(listing);
  }
  if (size === 8) {
    for (const [id, assignee, visibility] of [
      ["agency-1", "Вы", "workspace"],
      ["agency-2", "Анна", "workspace"],
      ["agency-private", "Тимур", "assigned"],
    ] as const) {
      const p = {
        ...state.properties[1],
        id: `demo-property:${id}`,
        scope: "team" as const,
        address: "Закрытый адрес агентства",
        addressVisibility: "internal" as const,
      };
      state.properties.push(p);
      state.listings.push({
        ...state.listings[1],
        id,
        propertyId: p.id,
        scope: "team",
        assignee,
        visibility,
      });
    }
  }
  return state;
}
