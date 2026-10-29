"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { employees, type Task } from "./today-data";
import { localDateTime, workspaceDate } from "./today-state";
import {
  PropertyCard,
  PropertyEditor,
  PropertyFacts,
  PropertyField,
  PropertyFiltersPanel,
  PropertyPhoto,
  PropertyReview,
} from "./property-panels";
import {
  canEditListing,
  canViewListing,
  defaultPropertyView,
  emptyFilters,
  emptyPropertyDraft,
  freshnessReasons,
  kindLabels,
  operationLabels,
  possibleDuplicates,
  priceLabel,
  propertyDate,
  propertyDraft,
  selectProperties,
  statusLabels,
  validStatus,
  type Listing,
  type PropertyAccess,
  type PropertyCommand,
  type PropertyDraft,
  type PropertyRequest,
  type PropertyState,
  type PropertyTarget,
  type PropertyView,
  type ReviewDraft,
} from "./property-model";
import "./property-hub.css";

export type PropertyPanel = {
  type:
    | "list"
    | "detail"
    | "menu"
    | "filters"
    | "create"
    | "edit"
    | "review"
    | "status"
    | "archive"
    | "link"
    | "task"
    | "duplicates"
    | "settings"
    | "preview";
  id?: string;
  version?: number;
};
export type PropertySession = {
  scope: "mine" | "team";
  views: Record<"mine" | "team", PropertyView>;
  panel: PropertyPanel;
  drafts: Record<string, PropertyDraft>;
  reviews: Record<string, ReviewDraft>;
  taskDrafts: Record<
    string,
    { title: string; dueAt: string; assignee: string }
  >;
  statusDrafts: Record<
    string,
    { status: Listing["status"]; note: string; confirmed: boolean }
  >;
  contextClientId: string;
  contextRequestId: string;
  demo: string;
  failNext: boolean;
  scroll: number;
  focusId: string;
  selected: string[];
};
export function createPropertySession(): PropertySession {
  return {
    scope: "mine",
    views: { mine: defaultPropertyView(), team: defaultPropertyView("team") },
    panel: { type: "list" },
    drafts: {},
    reviews: {},
    taskDrafts: {},
    statusDrafts: {},
    contextClientId: "",
    contextRequestId: "",
    demo: "normal",
    failNext: false,
    scroll: 0,
    focusId: "",
    selected: [],
  };
}
export function requestPropertyView(
  request?: PropertyRequest,
  scope: "mine" | "team" = "mine",
): PropertyView {
  return {
    ...defaultPropertyView(scope),
    filters: {
      ...emptyFilters,
      operation: request?.operation ?? "all",
      maxPrice:
        request?.operation && request?.price ? String(request.price) : "",
      currency: request?.currency ?? "USD",
      unit: request?.operation === "rent" ? "month" : "total",
      districts: request?.districts ?? [],
    },
  };
}
const segments = [
  ["all", "Все"],
  ["available", "Доступны"],
  ["review", "Требуют проверки"],
  ["held", "Предварительно заняты"],
  ["archive", "Архив"],
];
const sorts = {
  new: "Сначала новые",
  updated: "Недавно обновлённые",
  "price-asc": "Цена: по возрастанию",
  "price-desc": "Цена: по убыванию",
  checked: "Недавно проверенные",
  "old-check": "Давно не проверялись",
};
type Props = {
  state: PropertyState;
  session: PropertySession;
  access: PropertyAccess;
  targets: PropertyTarget[];
  tasks: Task[];
  onChange: (change: Partial<PropertySession>) => void;
  onCommand: (command: PropertyCommand) => string;
  onClient: (id: string) => void;
  onTask: (task: Task) => void;
  onBusy: (busy: boolean) => void;
};
export function PropertyHub({
  state,
  session: s,
  access,
  targets,
  tasks,
  onChange,
  onCommand,
  onClient,
  onTask,
  onBusy,
}: Props) {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState(0);
  const lock = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const now = new Date().toISOString(),
    view = s.views[s.scope],
    panel = s.panel;
  const listing = state.listings.find(
    (l) =>
      l.id === panel.id && canViewListing(l, access) && l.scope === s.scope,
  );
  const property = listing
    ? state.properties.find((p) => p.id === listing.propertyId)
    : undefined;
  const context = targets.find(
      (t) => t.id === s.contextClientId && t.scope === s.scope,
    ),
    request = context?.requests.find((r) => r.id === s.contextRequestId);
  const result = selectProperties(state, view, access, now);
  const changeView = (change: Partial<PropertyView>) =>
    onChange({
      views: {
        ...s.views,
        [s.scope]: { ...view, ...change, limit: change.limit ?? 30 },
      },
    });
  function navigate(next: PropertyPanel) {
    if (lock.current) return;
    if (panel.type === "list") {
      const d = document.querySelector<HTMLDialogElement>(".property-dialog");
      onChange({ scroll: d?.scrollTop ?? 0, focusId: next.id ?? "" });
    }
    onChange({ panel: next });
    setError("");
    setNotice("");
    setPhoto(0);
  }
  function back() {
    navigate(
      panel.type === "filters" ||
        panel.type === "create" ||
        panel.type === "settings" ||
        panel.type === "detail"
        ? { type: "list" }
        : { type: "detail", id: panel.id },
    );
  }
  function open(type: PropertyPanel["type"], id = listing?.id) {
    const l = state.listings.find((v) => v.id === id);
    navigate({ type, id, version: l?.version });
  }
  function run(
    command: PropertyCommand,
    next: PropertyPanel = panel,
    message = "Изменение сохранено в демо-сеансе.",
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    timer.current = setTimeout(() => {
      const error = onCommand(command);
      lock.current = false;
      setBusy(false);
      onBusy(false);
      if (error) {
        setError(error);
        return;
      }
      const change: Partial<PropertySession> = { panel: next };
      if (command.type === "create" || command.type === "edit") {
        const drafts = { ...s.drafts };
        delete drafts[
          command.type === "create" ? `new:${s.scope}` : command.id
        ];
        change.drafts = drafts;
      }
      if (command.type === "review") {
        const reviews = { ...s.reviews };
        delete reviews[command.id];
        change.reviews = reviews;
      }
      if (command.type === "task") {
        const taskDrafts = { ...s.taskDrafts };
        delete taskDrafts[command.id];
        change.taskDrafts = taskDrafts;
      }
      if (command.type === "status") {
        const statusDrafts = { ...s.statusDrafts };
        delete statusDrafts[command.id];
        change.statusDrafts = statusDrafts;
      }
      onChange(change);
      setNotice(message);
    }, 250);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      onBusy(false);
    },
    [onBusy],
  );
  useEffect(() => {
    if (s.demo !== "loading") return;
    const id = setTimeout(() => onChange({ demo: "normal" }), 900);
    return () => clearTimeout(id);
  }, [s.demo, onChange]);
  useEffect(() => {
    const dialog =
      document.querySelector<HTMLDialogElement>(".property-dialog");
    const title = dialog?.querySelector<HTMLElement>("#today-sheet-title");
    if (panel.type === "list" && s.focusId) {
      const item = dialog?.querySelector<HTMLElement>(
        `[data-property-focus="${CSS.escape(s.focusId)}"]`,
      );
      (item ?? title)?.focus({ preventScroll: true });
      if (dialog) dialog.scrollTop = s.scroll;
    } else {
      title?.setAttribute("tabindex", "-1");
      title?.focus({ preventScroll: true });
      if (dialog) dialog.scrollTop = 0;
    }
  }, [panel.type, panel.id]);
  const cmd = (
    type:
      | "review"
      | "edit"
      | "status"
      | "archive"
      | "link"
      | "unlink"
      | "task"
      | "assign",
  ) => ({
    type,
    id: listing!.id,
    version: panel.version ?? listing!.version,
    operationId: crypto.randomUUID(),
  });
  const updateDraft = (d: PropertyDraft) =>
    onChange({
      drafts: {
        ...s.drafts,
        [panel.type === "create" ? `new:${s.scope}` : listing!.id]: d,
      },
    });
  const activeDraft =
    s.drafts[
      panel.type === "create" ? `new:${s.scope}` : (listing?.id ?? "")
    ] ??
    (property && listing
      ? propertyDraft(property, listing)
      : { ...emptyPropertyDraft });
  const hasFilters =
    JSON.stringify(view.filters) !== JSON.stringify(emptyFilters);
  const newId = () => `P-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const linked = listing
    ? state.links.filter((l) => l.listingId === listing.id)
    : [];
  const reasons = listing ? freshnessReasons(listing, state.rules, now) : [];
  const editable = listing && canEditListing(listing, access);
  const visibleTargets = targets.filter((t) => t.scope === s.scope);
  const readOnly = listing && !editable;
  const taskDraft = listing
    ? (s.taskDrafts[listing.id] ?? {
        title: `Уточнить актуальность объекта №${listing.id}`,
        dueAt: `${workspaceDate(new Date(Date.now() + 86400000).toISOString())}T11:00`,
        assignee: "Вы",
      })
    : undefined;
  const statusDraft = listing
    ? (s.statusDrafts[listing.id] ?? {
        status: listing.status,
        note: "",
        confirmed: false,
      })
    : undefined;
  const editTaskDraft = (change: Partial<NonNullable<typeof taskDraft>>) =>
    onChange({
      taskDrafts: {
        ...s.taskDrafts,
        [listing!.id]: { ...taskDraft!, ...change },
      },
    });
  const editStatusDraft = (change: Partial<NonNullable<typeof statusDraft>>) =>
    onChange({
      statusDrafts: {
        ...s.statusDrafts,
        [listing!.id]: { ...statusDraft!, ...change },
      },
    });
  const duplicates = property
    ? possibleDuplicates(state, property, listing?.id).filter(
        (l) =>
          canViewListing(l, access) &&
          !state.decisions.some(
            (d) =>
              !d.undone &&
              ((d.left === listing!.id && d.right === l.id) ||
                (d.right === listing!.id && d.left === l.id)),
          ),
      )
    : [];
  const demoControls = (
    <details className="property-demo">
      <summary>Демо · сценарии объектов</summary>
      <div className="property-form">
        <PropertyField label="Состояние каталога">
          <select
            disabled={busy}
            value={s.demo}
            onChange={(e) => onChange({ demo: e.target.value })}
          >
            {Object.entries({
              normal: "Обычная работа",
              loading: "Загрузка",
              loadError: "Ошибка загрузки",
              offline: "Нет соединения",
              lost: "Доступ отозван",
              partial: "Источник недоступен",
              brokenPhoto: "Ошибка фотографии",
            }).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </PropertyField>
        <button
          disabled={busy}
          className="today-secondary"
          onClick={() => onChange({ failNext: !s.failNext })}
        >
          {s.failNext
            ? "Сбой сохранения включён · отключить"
            : "Ошибка следующего сохранения"}
        </button>
        {listing && (
          <button
            disabled={busy}
            className="today-secondary"
            onClick={() => {
              const error = onCommand({
                type: "external",
                id: listing.id,
                operationId: crypto.randomUUID(),
              });
              if (error) setError(error);
              else
                setNotice(
                  "Демо: версия объекта изменена коллегой. Ваш ввод остался в форме.",
                );
            }}
          >
            Имитировать изменение коллегой
          </button>
        )}
        <div className="property-two">
          {[1, 8, 1000].map((size) => (
            <button
              disabled={busy}
              key={size}
              className="today-secondary"
              onClick={() =>
                run(
                  { type: "seed", size, operationId: crypto.randomUUID() },
                  panel,
                  `Добавлен демо-набор: ${size}. Ваши записи сохранены.`,
                )
              }
            >
              Добавить {size} {size === 1 ? "пример" : "примеров"}
            </button>
          ))}
        </div>
        <p>
          Все записи вымышлены. Сеть и права имитируются. Данные и черновики
          исчезнут после перезагрузки или выхода. Сервер, карта, импорт, кадастр
          и публикация не подключены.
        </p>
      </div>
    </details>
  );
  if (access.lost)
    return (
      <div className="property-hub">
        <h2 id="today-sheet-title">Доступ отозван</h2>
        <p className="property-info" role="alert">
          Объекты, контакты и закрытые данные скрыты. Черновики не удалены.
        </p>
        {s.demo === "lost" && (
          <button
            className="today-primary"
            onClick={() => onChange({ demo: "normal" })}
          >
            Восстановить демо-доступ
          </button>
        )}
      </div>
    );
  if (s.scope === "team" && access.role === "solo")
    return (
      <div className="property-hub">
        <h2 id="today-sheet-title">Нет доступа к базе агентства</h2>
        <button
          className="today-primary"
          onClick={() =>
            onChange({
              scope: "mine",
              panel: { type: "list" },
              selected: [],
              contextClientId: "",
              contextRequestId: "",
            })
          }
        >
          Открыть мою базу
        </button>
      </div>
    );
  return (
    <div className="property-hub" aria-busy={busy}>
      {panel.type !== "list" && (
        <button className="property-back" disabled={busy} onClick={back}>
          <ArrowLeft size={16} />
          {["detail", "create", "filters", "settings"].includes(panel.type)
            ? "Назад к каталогу"
            : "Назад к объекту"}
        </button>
      )}
      {access.offline && (
        <div className="property-banner" role="status">
          <strong>Нет соединения</strong>
          <p>
            Показаны последние данные демо-сеанса. Изменения не сохраняются;
            ввод остаётся в форме.
          </p>
          {s.demo === "offline" && (
            <button
              className="today-link"
              onClick={() => onChange({ demo: "normal" })}
            >
              Восстановить демо-соединение
            </button>
          )}
        </div>
      )}
      {s.demo === "partial" && (
        <p className="property-info" role="status">
          Данные источника могут быть неполными. Записи в базе доступны; импорт
          и проверка внешних систем не выполняются.
        </p>
      )}
      {panel.type === "list" && (
        <>
          <header className="property-header">
            <div>
              <span className="property-kicker">PROPERTY HUB · ДЕМО</span>
              <h2 id="today-sheet-title">
                {context ? `Объекты для ${context.name}` : "Объекты"}
              </h2>
              <p className="today-muted">
                {request?.label ?? "Вся ваша недвижимость в одном месте"}
              </p>
            </div>
            <button
              className="today-icon"
              aria-label="Добавить объект"
              disabled={busy}
              onClick={() => navigate({ type: "create" })}
            >
              <Plus size={22} />
            </button>
          </header>
          {access.role !== "solo" && (
            <div
              className="today-segment"
              role="group"
              aria-label="База объектов"
            >
              {[
                ["mine", "Мои"],
                ["team", "Агентство"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={s.scope === key}
                  onClick={() => {
                    onChange({
                      scope: key as "mine" | "team",
                      panel: { type: "list" },
                      contextClientId: "",
                      contextRequestId: "",
                      selected: [],
                      focusId: "",
                      scroll: 0,
                    });
                    setNotice("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {context && (
            <div className="property-banner">
              <strong>Выбор к запросу, не автоматический подбор</strong>
              {context.requests.length > 1 && (
                <PropertyField label="Запрос клиента">
                  <select
                    value={s.contextRequestId}
                    onChange={(e) => {
                      const r = context.requests.find(
                        (r) => r.id === e.target.value,
                      );
                      onChange({
                        contextRequestId: e.target.value,
                        selected: [],
                        views: {
                          ...s.views,
                          [s.scope]: requestPropertyView(r, s.scope),
                        },
                      });
                    }}
                  >
                    {context.requests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </PropertyField>
              )}
              <p>
                Предзаполнены только сохранённые параметры. Неизвестные условия
                нужно уточнить. Выбор и связь не отправляют сообщения.
              </p>
              <button
                className="today-link"
                onClick={() =>
                  onChange({
                    contextClientId: "",
                    contextRequestId: "",
                    selected: [],
                  })
                }
              >
                Убрать контекст клиента
              </button>
            </div>
          )}
          <div className="property-metrics">
            {[
              ["all", "Предложения"],
              ["available", "Доступны"],
              ["review", "Требуют проверки"],
            ].map(([key, label]) => (
              <button
                key={key}
                disabled={s.demo === "loading" || s.demo === "loadError"}
                onClick={() =>
                  changeView({
                    segment: key,
                    query: "",
                    filters: { ...emptyFilters },
                  })
                }
              >
                <strong>
                  {s.demo === "loadError"
                    ? "—"
                    : s.demo === "loading"
                      ? "…"
                      : result.counts[key as keyof typeof result.counts]}
                </strong>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <label className="property-search">
            <Search size={18} />
            <span className="sr-only">Номер, адрес или район</span>
            <input
              type="search"
              aria-label="Номер, адрес или район"
              placeholder="Номер, адрес или район"
              value={view.query}
              onChange={(e) => changeView({ query: e.target.value })}
            />
            {view.query && (
              <button
                aria-label="Очистить поиск"
                className="today-icon"
                onClick={() => changeView({ query: "" })}
              >
                <X size={16} />
              </button>
            )}
          </label>
          <div
            className="property-segments"
            role="group"
            aria-label="Сегмент каталога"
          >
            {segments.map(([key, label]) => (
              <button
                key={key}
                aria-pressed={view.segment === key}
                onClick={() => changeView({ segment: key })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="property-toolbar">
            <button onClick={() => navigate({ type: "filters" })}>
              <SlidersHorizontal size={16} />
              Фильтры{hasFilters ? " · выбраны" : ""}
            </button>
            <select
              aria-label="Сортировка объектов"
              value={view.sort}
              onChange={(e) => {
                const sort = e.target.value;
                if (
                  sort.startsWith("price") &&
                  view.filters.operation === "all"
                ) {
                  setNotice(
                    "Сначала выберите операцию в фильтрах. Сортировка цены не смешивает продажу и аренду.",
                  );
                  navigate({ type: "filters" });
                  return;
                }
                changeView({ sort });
              }}
            >
              {Object.entries(sorts).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {view.sort.startsWith("price") && (
            <p className="property-info">
              Сравниваются только{" "}
              {view.filters.operation === "sale" ? "продажа" : "аренда"} ·{" "}
              {view.filters.currency} ·{" "}
              {view.filters.unit === "month"
                ? "в месяц"
                : view.filters.unit === "sqm-month"
                  ? "за м² в месяц"
                  : "полная цена"}
              . Конвертации валют нет; неизвестные цены в конце.
            </p>
          )}
          <div className="property-count">
            <span>
              <List size={14} />
              Список · {s.demo === "loadError" ? "нет данных" : result.total}
            </span>
            <button
              className="today-link"
              onClick={() => navigate({ type: "settings" })}
            >
              Настройки базы
            </button>
          </div>
          {s.demo === "loading" ? (
            <div role="status" className="property-skeleton">
              Загружаем демо-каталог…
            </div>
          ) : s.demo === "loadError" ? (
            <div className="property-empty" role="alert">
              <h3>Не удалось загрузить объекты</h3>
              <p>
                Записи не удалены. Ноль вместо недоступных данных не показываем.
              </p>
              <button
                className="today-primary"
                onClick={() => onChange({ demo: "normal" })}
              >
                Повторить
              </button>
            </div>
          ) : result.entries.length ? (
            <div className="property-list">
              {result.entries.map(({ listing, property }) => (
                <PropertyCard
                  key={listing.id}
                  property={property}
                  listing={listing}
                  state={state}
                  now={now}
                  access={access}
                  broken={
                    s.demo === "brokenPhoto" && Boolean(property.photos.length)
                  }
                  onOpen={() => open("detail", listing.id)}
                  onMenu={() => open("menu", listing.id)}
                  selected={s.selected.includes(listing.id)}
                  onSelect={
                    context && request
                      ? () =>
                          onChange({
                            selected: s.selected.includes(listing.id)
                              ? s.selected.filter((id) => id !== listing.id)
                              : [...s.selected, listing.id],
                          })
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="property-empty">
              <House size={31} strokeWidth={1.3} />
              <h3>
                {view.query || hasFilters
                  ? "Объекты не найдены"
                  : view.segment === "archive"
                    ? "В архиве пока нет объектов"
                    : view.segment === "review"
                      ? "Нет объектов с открытой проверкой"
                      : view.segment === "available"
                        ? "Пока нет доступных предложений"
                        : "Ваша база недвижимости начинается здесь"}
              </h3>
              <p>
                {view.query || hasFilters
                  ? "Попробуйте другой номер, адрес или фильтр."
                  : "Добавляйте объекты, проверяйте актуальность и связывайте предложения с клиентами."}
              </p>
              {view.query || hasFilters || view.segment !== "all" ? (
                <button
                  className="today-primary"
                  onClick={() =>
                    changeView({ ...defaultPropertyView(s.scope) })
                  }
                >
                  Сбросить фильтры
                </button>
              ) : (
                <>
                  <button
                    className="today-primary"
                    onClick={() => navigate({ type: "create" })}
                  >
                    Добавить объект
                  </button>
                  <button
                    className="today-link"
                    disabled={busy}
                    onClick={() =>
                      run(
                        {
                          type: "seed",
                          size: 8,
                          operationId: crypto.randomUUID(),
                        },
                        { type: "list" },
                        "Добавлены вымышленные примеры недвижимости.",
                      )
                    }
                  >
                    Посмотреть демо-базу
                  </button>
                </>
              )}
            </div>
          )}
          {result.total > view.limit && s.demo === "normal" && (
            <button
              className="today-secondary"
              onClick={() => changeView({ limit: view.limit + 30 })}
            >
              Показать ещё 30 · осталось {result.total - view.limit}
            </button>
          )}
          {context && request && s.selected.length > 0 && (
            <div className="property-selection">
              <button
                className="today-primary"
                disabled={busy}
                onClick={() => {
                  const chosen = s.selected.map((id) =>
                    state.listings.find(
                      (l) =>
                        l.id === id &&
                        canViewListing(l, access) &&
                        l.scope === s.scope &&
                        !l.archived &&
                        l.status === "available",
                    ),
                  );
                  if (chosen.some((l) => !l)) {
                    setError(
                      "Один из объектов стал недоступен. Пересмотрите выбор.",
                    );
                    return;
                  }
                  const errors: string[] = [];
                  let added = 0;
                  for (const l of chosen) {
                    if (
                      state.links.some(
                        (link) =>
                          link.listingId === l!.id &&
                          link.clientId === context.id &&
                          link.requestId === request.id,
                      )
                    )
                      continue;
                    const error = onCommand({
                      type: "link",
                      operationId: crypto.randomUUID(),
                      id: l!.id,
                      version: l!.version,
                      clientId: context.id,
                      requestId: request.id,
                    });
                    if (error) {
                      errors.push(error);
                      break;
                    }
                    added++;
                  }
                  if (errors.length)
                    setError(
                      `${added ? "Часть связей уже сохранена. " : ""}${errors[0]}`,
                    );
                  else {
                    onChange({ selected: [] });
                    setNotice(
                      added
                        ? `Связано с запросом: ${added}. Сообщения не отправлялись.`
                        : "Выбранные объекты уже связаны с запросом.",
                    );
                  }
                }}
              >
                Добавить к запросу · {s.selected.length}
              </button>
            </div>
          )}
        </>
      )}
      {panel.type === "filters" && (
        <PropertyFiltersPanel
          initial={view.filters}
          onCancel={() => navigate({ type: "list" })}
          onApply={(filters) => {
            changeView({
              filters,
              sort:
                view.sort.startsWith("price") && filters.operation === "all"
                  ? "new"
                  : view.sort,
            });
            navigate({ type: "list" });
          }}
        />
      )}
      {(panel.type === "create" ||
        (panel.type === "edit" && property && listing && editable)) && (
        <PropertyEditor
          draft={activeDraft}
          onChange={updateDraft}
          editing={panel.type === "edit"}
          busy={busy}
          onSave={() => {
            const id = panel.type === "create" ? newId() : listing!.id;
            run(
              panel.type === "create"
                ? {
                    type: "create",
                    id,
                    scope: s.scope,
                    draft: activeDraft,
                    operationId: crypto.randomUUID(),
                  }
                : { ...cmd("edit"), type: "edit", draft: activeDraft },
              { type: "detail", id },
              panel.type === "create"
                ? "Объект добавлен. Наличие ещё не подтверждено."
                : "Изменения сохранены. Проверка актуальности — отдельное действие.",
            );
          }}
        />
      )}
      {panel.type === "settings" && (
        <>
          <h2 id="today-sheet-title">Настройки базы</h2>
          <p className="property-info">
            Порог свежести — настраиваемое правило этого демо-сеанса, не
            отраслевой стандарт. Цена и наличие проверяются отдельно. Просрочка
            проверки не означает, что объект сдан.
          </p>
          <form
            className="property-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              run(
                {
                  type: "rules",
                  rent: Number(data.get("rent")),
                  sale: Number(data.get("sale")),
                  operationId: crypto.randomUUID(),
                },
                { type: "list" },
                "Правила свежести обновлены. Статусы объектов не изменены.",
              );
            }}
          >
            <PropertyField label="Аренда · срок проверки, дней">
              <input
                name="rent"
                type="number"
                min={1}
                max={365}
                required
                defaultValue={state.rules.rent}
              />
            </PropertyField>
            <PropertyField label="Продажа · срок проверки, дней">
              <input
                name="sale"
                type="number"
                min={1}
                max={365}
                required
                defaultValue={state.rules.sale}
              />
            </PropertyField>
            <button disabled={busy} className="today-primary">
              Сохранить правила
            </button>
          </form>
          <section className="property-info">
            <h3>Границы модуля</h3>
            <p>
              Карта, разрешённый импорт, Smart Match, юридические проверки,
              показы и публикация не подключены. Все основные действия базы
              доступны без них. Данные хранятся только в памяти сеанса.
            </p>
          </section>
        </>
      )}
      {!["list", "filters", "create", "settings"].includes(panel.type) &&
      (!listing || !property) ? (
        <>
          <h2 id="today-sheet-title">Объект недоступен</h2>
          <p className="property-info">
            Запись не найдена или права изменились. Закрытые сведения не
            показываются.
          </p>
        </>
      ) : (
        listing &&
        property && (
          <>
            {panel.type === "detail" && (
              <>
                <header>
                  <span className="property-kicker">
                    {kindLabels[property.kind]} ·{" "}
                    {operationLabels[listing.operation]}
                  </span>
                  <h2 id="today-sheet-title">Объект №{listing.id}</h2>
                </header>
                <div className="property-detail-hero">
                  <strong className="property-price">
                    {priceLabel(listing)}
                  </strong>
                  <span>
                    {listing.archived ? "Архив · " : ""}
                    {statusLabels[listing.status]}
                  </span>
                </div>
                {property.photos.length > 0 ? (
                  <div className="property-gallery">
                    <PropertyPhoto
                      key={`${listing.id}:${photo}`}
                      property={property}
                      index={photo}
                      large
                    />
                    <div className="property-gallery-controls">
                      <button
                        aria-label="Предыдущее фото"
                        disabled={photo === 0}
                        onClick={() => setPhoto((v) => v - 1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span>
                        {photo + 1} / {property.photos.length} ·
                        Демо-иллюстрация
                      </span>
                      <button
                        aria-label="Следующее фото"
                        disabled={photo === property.photos.length - 1}
                        onClick={() => setPhoto((v) => v + 1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <PropertyPhoto property={property} large />
                )}
                <PropertyFacts
                  property={property}
                  listing={listing}
                  access={access}
                />
                {readOnly && (
                  <p className="property-info">
                    Чужое предложение · только просмотр и связь с разрешённым
                    запросом. Контакт собственника и внутренняя заметка скрыты.
                  </p>
                )}
                <section className="property-banner">
                  <h3>Актуальность сведений</h3>
                  {(["availability", "price", "conditions"] as const).map(
                    (key) => (
                      <p key={key}>
                        {key === "availability"
                          ? "Наличие"
                          : key === "price"
                            ? "Цена"
                            : "Условия"}
                        :{" "}
                        {listing.checks[key]
                          ? `${propertyDate(listing.checks[key]!.at)} · ${listing.checks[key]!.source}`
                          : "не подтверждались"}
                      </p>
                    ),
                  )}
                  {reasons.map((reason) => (
                    <p className="property-freshness" data-warning key={reason}>
                      {reason}
                    </p>
                  ))}
                  <small>
                    Правило демо: аренда — {state.rules.rent} дн., продажа —{" "}
                    {state.rules.sale} дн. Право распоряжения и документы не
                    проверены.
                  </small>
                </section>
                <div className="property-actions">
                  {editable && (
                    <button onClick={() => open("review")}>
                      Проверить актуальность
                    </button>
                  )}
                  <button
                    disabled={
                      listing.archived || listing.status !== "available"
                    }
                    onClick={() => open("link")}
                  >
                    Добавить клиенту
                  </button>
                  {editable && (
                    <>
                      <button onClick={() => open("status")}>
                        Изменить статус
                      </button>
                      <button onClick={() => open("task")}>
                        Создать задачу
                      </button>
                      <button onClick={() => open("edit")}>
                        Редактировать
                      </button>
                    </>
                  )}
                  <button onClick={() => open("preview")}>
                    Клиентское превью
                  </button>
                </div>
                {duplicates.length > 0 && (
                  <button
                    className="today-option"
                    onClick={() => open("duplicates")}
                  >
                    <span>
                      <strong>Возможный дубль · {duplicates.length}</strong>
                      <small>
                        Одинаковый адрес ещё не означает один объект
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                )}
                <section className="property-form">
                  <h3>Связанные запросы · {linked.length}</h3>
                  {linked.length ? (
                    linked.map((link) => {
                      const target = visibleTargets.find(
                        (t) => t.id === link.clientId,
                      );
                      return (
                        <div
                          className="property-link-row"
                          key={`${link.clientId}:${link.requestId}`}
                        >
                          <strong>{target?.name ?? "Клиент недоступен"}</strong>
                          <small>
                            {target?.requests.find(
                              (r) => r.id === link.requestId,
                            )?.label ?? "Сохранённая связь с запросом"}
                          </small>
                          <small>
                            {listing.status !== "available" || listing.archived
                              ? "Предложение больше не доступно, связь сохранена."
                              : "Связано, не отправлено."}
                          </small>
                          {target && (
                            <>
                              <button
                                className="today-link"
                                onClick={() => onClient(target.id)}
                              >
                                Открыть клиента
                              </button>
                              <button
                                disabled={busy}
                                className="today-link"
                                onClick={() =>
                                  run(
                                    {
                                      ...cmd("unlink"),
                                      type: "unlink",
                                      clientId: link.clientId,
                                      requestId: link.requestId,
                                    },
                                    { type: "detail", id: listing.id },
                                    "Связь удалена, история сохранена.",
                                  )
                                }
                              >
                                Удалить ошибочную связь
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="today-muted">
                      Объект ещё не связан с запросами.
                    </p>
                  )}
                </section>
                <section className="property-form">
                  <h3>Задачи по объекту</h3>
                  {tasks
                    .filter(
                      (t) =>
                        t.propertyListingId === listing.id &&
                        t.scope === listing.scope,
                    )
                    .map((task) => (
                      <button
                        className="today-option"
                        key={task.id}
                        onClick={() => onTask(task)}
                      >
                        <span>
                          <strong>{task.title}</strong>
                          <small>
                            {task.done
                              ? "Выполнено"
                              : task.dueAt?.replace("T", " · ")}{" "}
                            · {task.assignee ?? "Вы"}
                          </small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  <p className="today-muted">
                    Выполнение задачи не меняет дату проверки и доступность.
                  </p>
                </section>
                <details>
                  <summary className="today-link">
                    История изменений и цены
                  </summary>
                  <div className="property-events">
                    {state.history
                      .filter((e) => e.listingId === listing.id)
                      .map((e) => (
                        <article key={e.id}>
                          <time>{propertyDate(e.at)}</time>
                          <h4>{e.title}</h4>
                          <p>{e.detail}</p>
                        </article>
                      ))}
                    {!state.history.some((e) => e.listingId === listing.id) && (
                      <p className="today-muted">
                        Изменений текущего демо-сеанса ещё нет.
                      </p>
                    )}
                  </div>
                </details>
                {editable && (
                  <button
                    className="today-secondary"
                    onClick={() => open("archive")}
                  >
                    {listing.archived ? "Восстановить из архива" : "В архив"}
                  </button>
                )}
              </>
            )}
            {panel.type === "menu" && (
              <>
                <h2 id="today-sheet-title">Действия с объектом</h2>
                <p className="today-muted">
                  №{listing.id} · {statusLabels[listing.status]}
                </p>
                {[
                  ["detail", "Открыть объект"],
                  ["link", "Добавить клиенту"],
                  ...(editable
                    ? [
                        ["review", "Проверить актуальность"],
                        ["status", "Изменить статус"],
                        ["task", "Создать задачу"],
                        ["edit", "Редактировать"],
                        [
                          "archive",
                          listing.archived
                            ? "Восстановить из архива"
                            : "В архив",
                        ],
                      ]
                    : []),
                ].map(([type, label]) => (
                  <button
                    key={type}
                    className="today-option"
                    disabled={
                      type === "link" &&
                      (listing.archived || listing.status !== "available")
                    }
                    onClick={() => open(type as PropertyPanel["type"])}
                  >
                    {label}
                    <ChevronRight size={17} />
                  </button>
                ))}
              </>
            )}
            {panel.type === "review" && editable && (
              <PropertyReview
                listing={listing}
                busy={busy}
                draft={
                  s.reviews[listing.id] ?? {
                    availability: "unknown",
                    price: "unknown",
                    conditions: "unknown",
                    newPrice: "",
                    currency: listing.currency,
                    newConditions: "",
                    unavailableStatus: "unavailable",
                    source: "",
                    note: "",
                  }
                }
                onChange={(review) =>
                  onChange({ reviews: { ...s.reviews, [listing.id]: review } })
                }
                onSave={() =>
                  run(
                    {
                      ...cmd("review"),
                      type: "review",
                      review: s.reviews[listing.id] ?? {
                        availability: "unknown",
                        price: "unknown",
                        conditions: "unknown",
                        newPrice: "",
                        currency: listing.currency,
                        newConditions: "",
                        unavailableStatus: "unavailable",
                        source: "",
                        note: "",
                      },
                    },
                    { type: "detail", id: listing.id },
                    "Проверка сохранена. Обновлены только указанные сведения.",
                  )
                }
              />
            )}
            {panel.type === "status" && editable && (
              <form
                className="property-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  run(
                    {
                      ...cmd("status"),
                      type: "status",
                      status: data.get("status") as Listing["status"],
                      note: String(data.get("note") ?? ""),
                    },
                    { type: "detail", id: listing.id },
                    "Статус обновлён. История и связи сохранены.",
                  );
                }}
              >
                <h2 id="today-sheet-title">Статус объекта</h2>
                <p className="property-info">
                  После подтверждения «Продан» или «Сдан» предложение исчезнет
                  из доступных. «Предварительно занят» — рабочая отметка, а не
                  юридическая бронь. Возврат в доступные требует отдельной
                  проверки актуальности.
                </p>
                <PropertyField label="Новый статус">
                  <select
                    name="status"
                    value={statusDraft!.status}
                    onChange={(e) =>
                      editStatusDraft({
                        status: e.target.value as Listing["status"],
                        confirmed: false,
                      })
                    }
                  >
                    {Object.entries(statusLabels)
                      .filter(([key]) =>
                        validStatus(
                          listing.operation,
                          key as Listing["status"],
                        ),
                      )
                      .map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                  </select>
                </PropertyField>
                <PropertyField label="Причина изменения">
                  <textarea
                    name="note"
                    maxLength={2000}
                    value={statusDraft!.note}
                    onChange={(e) => editStatusDraft({ note: e.target.value })}
                  />
                </PropertyField>
                <label className="property-check">
                  <input
                    required
                    type="checkbox"
                    checked={statusDraft!.confirmed}
                    onChange={(e) =>
                      editStatusDraft({ confirmed: e.target.checked })
                    }
                  />
                  <span>
                    Подтверждаю изменение рабочего статуса. Это не подтверждение
                    сделки или права собственности.
                  </span>
                </label>
                <button className="today-primary" disabled={busy}>
                  Подтвердить статус
                </button>
              </form>
            )}
            {panel.type === "archive" && editable && (
              <>
                <h2 id="today-sheet-title">
                  {listing.archived
                    ? "Восстановить предложение?"
                    : "Перенести предложение в архив?"}
                </h2>
                <p className="property-info">
                  №{listing.id}. История, задачи и связи с запросами останутся.{" "}
                  {listing.archived
                    ? "Восстановление не подтверждает доступность или цену."
                    : "Из активного каталога запись будет исключена."}
                </p>
                <button
                  disabled={busy}
                  className="today-primary"
                  onClick={() =>
                    run(
                      {
                        ...cmd("archive"),
                        type: "archive",
                        archived: !listing.archived,
                      },
                      { type: "detail", id: listing.id },
                      listing.archived
                        ? "Предложение восстановлено."
                        : "Предложение в архиве; связи сохранены.",
                    )
                  }
                >
                  {listing.archived
                    ? "Восстановить из архива"
                    : "Подтвердить архивирование"}
                </button>
              </>
            )}
            {panel.type === "link" && (
              <PropertyLinkPanel
                key={listing.id}
                targets={visibleTargets}
                listing={listing}
                state={state}
                initialClient={s.contextClientId}
                initialRequest={s.contextRequestId}
                busy={busy}
                onSave={(clientId, requestId) =>
                  run(
                    { ...cmd("link"), type: "link", clientId, requestId },
                    { type: "detail", id: listing.id },
                    "Объект связан с запросом. Сообщение не отправлено.",
                  )
                }
              />
            )}
            {panel.type === "task" && editable && (
              <form
                className="property-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  run(
                    {
                      ...cmd("task"),
                      type: "task",
                      taskId: crypto.randomUUID(),
                      title: String(data.get("title")),
                      dueAt: String(data.get("dueAt")),
                      assignee: String(data.get("assignee")),
                    },
                    { type: "detail", id: listing.id },
                    "Задача создана и доступна в общем разделе задач.",
                  );
                }}
              >
                <h2 id="today-sheet-title">Задача по объекту</h2>
                <PropertyField label="Название задачи">
                  <input
                    required
                    name="title"
                    maxLength={200}
                    value={taskDraft!.title}
                    onChange={(e) => editTaskDraft({ title: e.target.value })}
                  />
                </PropertyField>
                <PropertyField label="Срок · время Ташкента">
                  <input
                    required
                    name="dueAt"
                    type="datetime-local"
                    min={localDateTime()}
                    value={taskDraft!.dueAt}
                    onChange={(e) => editTaskDraft({ dueAt: e.target.value })}
                  />
                </PropertyField>
                <PropertyField label="Ответственный">
                  <select
                    name="assignee"
                    value={taskDraft!.assignee}
                    onChange={(e) =>
                      editTaskDraft({ assignee: e.target.value })
                    }
                  >
                    {[
                      "Вы",
                      ...(listing.scope === "team" && access.role === "owner"
                        ? employees
                        : []),
                    ].map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </PropertyField>
                <p className="property-info">
                  Связь: объект №{listing.id}. Задача появится в общем плане. Её
                  выполнение само по себе не подтвердит наличие или цену.
                </p>
                <button disabled={busy} className="today-primary">
                  Создать задачу
                </button>
              </form>
            )}
            {panel.type === "preview" && (
              <>
                <h2 id="today-sheet-title">Что увидит клиент</h2>
                {!property.photoPrivate && property.photos.length > 0 && (
                  <PropertyPhoto property={property} large />
                )}
                <div className="property-detail-hero">
                  <strong className="property-price">
                    {priceLabel(listing)}
                  </strong>
                  <span>{operationLabels[listing.operation]}</span>
                </div>
                <h3>
                  {kindLabels[property.kind]} · {property.district}
                </h3>
                <p>
                  {property.city} ·{" "}
                  {property.area != null
                    ? `${property.area} ${property.areaUnit === "sqm" ? "м²" : property.areaUnit === "sotka" ? "сот." : "га"}`
                    : "Площадь не уточнена"}
                  {property.rooms ? ` · ${property.rooms} комн.` : ""}
                </p>
                {property.addressVisibility === "public" &&
                  property.address && <p>{property.address}</p>}
                <p className="property-info">
                  {statusLabels[listing.status]}
                  {listing.archived ? " · Архив" : ""}.{" "}
                  {reasons.length
                    ? "Сведения требуют проверки."
                    : "Цена и наличие отмечены проверенными в демо."}{" "}
                  Точный внутренний адрес, заметки, контакты и документы не
                  включены.
                </p>
                <button className="today-secondary" disabled>
                  Отправка не подключена
                </button>
                <p className="today-muted">
                  Просмотр превью не означает отправку. Подборки и публикация —
                  отдельные последующие модули.
                </p>
              </>
            )}
            {panel.type === "duplicates" && (
              <>
                <h2 id="today-sheet-title">Похожие объекты</h2>
                <p className="property-info">
                  Совпадение адреса и фото не доказывает один физический объект.
                  Объединение сохраняет отдельные предложения и все исходные
                  записи.
                </p>
                {duplicates.map((other) => {
                  const p = state.properties.find(
                    (p) => p.id === other.propertyId,
                  )!;
                  return (
                    <section className="property-form" key={other.id}>
                      <div className="property-compare">
                        {[
                          { listing, property },
                          { listing: other, property: p },
                        ].map((pair) => (
                          <div key={pair.listing.id}>
                            <PropertyPhoto property={pair.property} />
                            <h3>№{pair.listing.id}</h3>
                            <p>
                              {kindLabels[pair.property.kind]} ·{" "}
                              {pair.property.district}
                            </p>
                            <p>
                              {pair.property.addressVisibility === "internal" &&
                              !canEditListing(pair.listing, access)
                                ? "Адрес скрыт"
                                : pair.property.address}
                            </p>
                            <p>
                              {pair.property.area ?? "—"}{" "}
                              {pair.property.areaUnit} · этаж{" "}
                              {pair.property.floor ?? "—"}
                            </p>
                            <p>
                              {priceLabel(pair.listing)} ·{" "}
                              {operationLabels[pair.listing.operation]}
                            </p>
                            <p>
                              {pair.listing.source} ·{" "}
                              {pair.listing.assignee || "Без ответственного"}
                            </p>
                          </div>
                        ))}
                      </div>
                      {editable && canEditListing(other, access) && (
                        <>
                          <button
                            className="today-primary"
                            disabled={busy}
                            onClick={() =>
                              run(
                                {
                                  type: "duplicate",
                                  id: listing.id,
                                  version: listing.version,
                                  otherId: other.id,
                                  otherVersion: other.version,
                                  decision: "same",
                                  operationId: crypto.randomUUID(),
                                },
                                { type: "detail", id: listing.id },
                                "Физические объекты связаны. Оба предложения и исходные данные сохранены.",
                              )
                            }
                          >
                            Подтверждаю: это один объект
                          </button>
                          <button
                            className="today-secondary"
                            disabled={busy}
                            onClick={() =>
                              run(
                                {
                                  type: "duplicate",
                                  id: listing.id,
                                  version: listing.version,
                                  otherId: other.id,
                                  otherVersion: other.version,
                                  decision: "different",
                                  operationId: crypto.randomUUID(),
                                },
                                panel,
                                "Отмечено: это разные объекты.",
                              )
                            }
                          >
                            Это разные объекты
                          </button>
                        </>
                      )}
                    </section>
                  );
                })}
                {!duplicates.length && (
                  <p className="today-muted">
                    Неразобранных совпадений адреса нет.
                  </p>
                )}
                <button className="today-link" onClick={() => open("detail")}>
                  Проверить позже
                </button>
              </>
            )}
            {panel.type === "detail" &&
              state.decisions
                .filter(
                  (d) =>
                    d.kind === "same" &&
                    !d.undone &&
                    (d.left === listing.id || d.right === listing.id),
                )
                .map((d) => (
                  <div key={d.id} className="property-banner">
                    <p>
                      Связаны физические объекты №{d.left} и №{d.right}.
                      Предложения остаются раздельными.
                    </p>
                    <button
                      className="today-link"
                      disabled={busy}
                      onClick={() =>
                        run(
                          {
                            type: "undoDuplicate",
                            decisionId: d.id,
                            operationId: crypto.randomUUID(),
                          },
                          panel,
                          "Объединение отменено. Исходные объекты восстановлены.",
                        )
                      }
                    >
                      Отменить объединение
                    </button>
                  </div>
                ))}
            {panel.type === "detail" &&
              listing.scope === "team" &&
              access.role === "owner" && (
                <PropertyField label="Назначить ответственного за объект">
                  <select
                    value={listing.assignee}
                    disabled={busy}
                    onChange={(e) =>
                      run(
                        {
                          ...cmd("assign"),
                          type: "assign",
                          assignee: e.target.value,
                        },
                        panel,
                        "Ответственный за объект обновлён.",
                      )
                    }
                  >
                    <option value="">Без ответственного</option>
                    {["Вы", ...employees].map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </PropertyField>
              )}
            {panel.version != null &&
              listing.version !== panel.version &&
              !["detail", "menu"].includes(panel.type) && (
                <div className="property-banner" role="alert">
                  <strong>Объект был изменён</strong>
                  <p>
                    Текущая версия: {listing.version}. Цена:{" "}
                    {priceLabel(listing)}. Статус:{" "}
                    {statusLabels[listing.status]}. Условия:{" "}
                    {listing.conditions || "не уточнены"}. Сравните эти данные
                    со своим вводом перед повторным сохранением.
                  </p>
                  <button
                    disabled={busy}
                    className="today-secondary"
                    onClick={() =>
                      onChange({
                        panel: { ...panel, version: listing.version },
                      })
                    }
                  >
                    Я сверил изменения · обновить версию формы
                  </button>
                </div>
              )}
          </>
        )
      )}
      {error && (
        <p className="today-inline-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="property-notice" role="status">
          <Check size={14} style={{ display: "inline", marginRight: 6 }} />
          {notice}
        </p>
      )}
      {demoControls}
      <p className="property-footer">
        Только демо-данные · Изменения в памяти сеанса
        <br />
        Связать ≠ отправить · Выполнить задачу ≠ подтвердить актуальность
      </p>
    </div>
  );
}
function PropertyLinkPanel({
  targets,
  listing,
  state,
  initialClient,
  initialRequest,
  busy,
  onSave,
}: {
  targets: PropertyTarget[];
  listing: Listing;
  state: PropertyState;
  initialClient: string;
  initialRequest: string;
  busy: boolean;
  onSave: (clientId: string, requestId: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [clientId, setClientId] = useState(initialClient),
    [requestId, setRequestId] = useState(initialRequest),
    [ack, setAck] = useState(false);
  const target = targets.find((t) => t.id === clientId),
    request = target?.requests.find((r) => r.id === requestId);
  const exists = state.links.some(
    (l) =>
      l.listingId === listing.id &&
      l.clientId === clientId &&
      l.requestId === requestId,
  );
  return (
    <form
      className="property-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (target && request && ack) onSave(clientId, requestId);
      }}
    >
      <h2 id="today-sheet-title">Для какого клиента?</h2>
      <p className="today-muted">
        Объект №{listing.id} · {priceLabel(listing)} ·{" "}
        {statusLabels[listing.status]}
      </p>
      <PropertyField label="Найти клиента">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Имя клиента"
        />
      </PropertyField>
      <PropertyField label="Клиент">
        <select
          required
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setRequestId("");
            setAck(false);
          }}
        >
          <option value="">Выберите клиента</option>
          {targets
            .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </PropertyField>
      {!targets.length && (
        <p className="property-info">
          В этом пространстве нет клиентов. Добавьте клиента и запрос в разделе
          «Клиенты», затем вернитесь к объекту.
        </p>
      )}
      {target && (
        <PropertyField label="Запрос клиента">
          <select
            required
            value={requestId}
            onChange={(e) => {
              setRequestId(e.target.value);
              setAck(false);
            }}
          >
            <option value="">Выберите запрос</option>
            {target.requests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </PropertyField>
      )}
      {target && !target.requests.length && (
        <p className="property-info">
          У клиента нет сохранённого запроса. Сначала уточните его потребность в
          Client 360°.
        </p>
      )}
      {request && (
        <>
          <p className="property-info">
            {target!.name} · {request.label}
            <br />
            Совпадение по всем условиям не проверяется автоматически.
            Неизвестные параметры нужно уточнить.{" "}
            {request.price &&
            listing.price &&
            listing.currency === request.currency &&
            listing.price > request.price
              ? "Внимание: цена превышает сохранённый бюджет."
              : ""}{" "}
            {request.operation && request.operation !== listing.operation
              ? "Внимание: операция отличается от запроса."
              : ""}
          </p>
          <label className="property-check">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <span>
              Я проверил выбранный запрос и связываю этот объект вручную.
              Сообщение отправлено не будет.
            </span>
          </label>
        </>
      )}
      {exists && (
        <p role="status" className="property-info">
          Объект уже связан с этим запросом.
        </p>
      )}
      <button
        disabled={
          busy ||
          exists ||
          !request ||
          !ack ||
          listing.archived ||
          listing.status !== "available"
        }
        className="today-primary"
        type="submit"
      >
        Добавить к запросу
      </button>
    </form>
  );
}
