"use client";
import { useState, type ReactNode } from "react";
import {
  House,
  ImageOff,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { employees } from "./today-data";
import {
  canEditListing,
  displayAddress,
  districts,
  featureLabels,
  filterError,
  freshnessReasons,
  kindLabels,
  operationLabels,
  priceLabel,
  propertyDate,
  sources,
  statusLabels,
  unitLabels,
  validStatus,
  type Listing,
  type Property,
  type PropertyAccess,
  type PropertyDraft,
  type PropertyFilters,
  type PropertyState,
  type ReviewDraft,
} from "./property-model";

export function PropertyField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="property-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function PropertyPhoto({
  property,
  index = 0,
  large = false,
  broken = false,
}: {
  property: Property;
  index?: number;
  large?: boolean;
  broken?: boolean;
}) {
  const [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false);
  const src = broken ? "/images/demo-missing.jpg" : property.photos[index];
  return (
    <div className={`property-photo${large ? " property-photo-large" : ""}`}>
      {src && !failed && !property.photoPrivate ? (
        <>
          <img
            src={src}
            alt={`${kindLabels[property.kind]} · ${property.district} · демонстрационное изображение ${index + 1}`}
            loading="lazy"
            width={large ? 640 : 128}
            height={large ? 420 : 144}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
          {!loaded && (
            <span className="property-photo-loading">Загрузка фото…</span>
          )}
        </>
      ) : (
        <span className="property-no-photo">
          {failed ? (
            <ImageOff size={23} />
          ) : (
            <House size={24} strokeWidth={1.4} />
          )}
          <small>
            {failed
              ? "Фото недоступно"
              : property.photoPrivate
                ? "Внутреннее фото"
                : "Без фото"}
          </small>
        </span>
      )}
    </div>
  );
}
export function PropertyCard({
  property,
  listing,
  state,
  now,
  access,
  onOpen,
  onMenu,
  broken,
  selected,
  onSelect,
}: {
  property: Property;
  listing: Listing;
  state: PropertyState;
  now: string;
  access: PropertyAccess;
  onOpen: () => void;
  onMenu: () => void;
  broken?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const reasons = freshnessReasons(listing, state.rules, now);
  return (
    <article className="property-card" data-property-row={listing.id}>
      <button
        className="property-card-main"
        data-property-focus={listing.id}
        onClick={onOpen}
        aria-label={`Объект №${listing.id}. ${operationLabels[listing.operation]}. ${kindLabels[property.kind]}. ${property.district}. ${priceLabel(listing)}. ${statusLabels[listing.status]}. ${reasons.length ? "Требует проверки" : "Цена и наличие проверены"}. Открыть объект`}
      >
        <PropertyPhoto
          key={`${listing.id}:${broken}`}
          property={property}
          broken={broken}
        />
        <span className="property-card-info">
          <span className="property-card-eyebrow">
            №{listing.id}
            <span>{operationLabels[listing.operation]}</span>
          </span>
          <strong className="property-price">{priceLabel(listing)}</strong>
          <span className="property-card-location">
            {property.district} ·{" "}
            {property.kind === "apartment" || property.kind === "house"
              ? property.rooms
                ? `${property.rooms} комн.`
                : kindLabels[property.kind]
              : kindLabels[property.kind]}
          </span>
          <span className="property-card-params">
            {property.area != null
              ? `${property.area} ${property.areaUnit === "sotka" ? "сот." : property.areaUnit === "ha" ? "га" : "м²"}`
              : "Площадь не указана"}
            {property.floor != null
              ? ` · ${property.floor}/${property.floors ?? "?"} этаж`
              : ""}
          </span>
          <span
            className="property-status"
            data-status={
              listing.status === "available" && reasons.length
                ? "unknown"
                : listing.status
            }
          >
            {listing.archived ? "Архив · " : ""}
            {statusLabels[listing.status]}
          </span>
        </span>
      </button>
      <div className="property-card-bottom">
        <span className="property-freshness" data-warning={reasons.length > 0}>
          {reasons.length ? <Clock3 size={14} /> : <ShieldCheck size={14} />}
          <span>
            {reasons[0] ?? "Цена и наличие проверены"}
            {!reasons.length && listing.checks.availability
              ? ` · ${new Date(listing.checks.availability.at).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent", day: "numeric", month: "short" })}`
              : ""}
          </span>
        </span>
        <button
          className="today-icon"
          aria-label={`Действия с объектом №${listing.id}`}
          onClick={onMenu}
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
      {onSelect && listing.status === "available" && !listing.archived && (
        <button
          className="property-select"
          aria-pressed={Boolean(selected)}
          onClick={onSelect}
        >
          {selected ? "Выбран · убрать" : "Выбрать к запросу"}
          <ChevronRight size={15} />
        </button>
      )}
    </article>
  );
}
function Options({
  values,
  value,
  onChange,
}: {
  values: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.entries(values).map(([key, label]) => (
        <option value={key} key={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
function Multiple({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: Record<string, string>;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset className="property-multiple">
      <legend>{label}</legend>
      {Object.entries(values).map(([key, value]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, key]
                  : selected.filter((v) => v !== key),
              )
            }
          />
          <span>{value}</span>
        </label>
      ))}
    </fieldset>
  );
}
export function PropertyFiltersPanel({
  initial,
  onApply,
  onCancel,
}: {
  initial: PropertyFilters;
  onApply: (f: PropertyFilters) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ ...initial }),
    [error, setError] = useState("");
  const set = (change: Partial<PropertyFilters>) => {
    setF((v) => ({ ...v, ...change }));
    setError("");
  };
  const numeric = (key: keyof PropertyFilters, label: string) => (
    <PropertyField key={key} label={label}>
      <input
        inputMode="decimal"
        value={f[key] as string}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </PropertyField>
  );
  const landOnly = f.kinds.length === 1 && f.kinds[0] === "land";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const error = filterError(f);
        if (error) return setError(error);
        onApply(f);
      }}
      className="property-form"
    >
      <h2 id="today-sheet-title">Фильтры объектов</h2>
      <p className="today-muted">
        Разные группы — «И», районы и типы внутри группы — «ИЛИ». Изменения
        применятся только после подтверждения.
      </p>
      <PropertyField label="Операция">
        <Options
          value={f.operation}
          values={{ all: "Все", sale: "Продажа", rent: "Аренда" }}
          onChange={(operation) =>
            set({
              operation,
              unit: operation === "rent" ? "month" : "total",
              minPrice: "",
              maxPrice: "",
            })
          }
        />
      </PropertyField>
      <Multiple
        label="Тип недвижимости"
        values={kindLabels}
        selected={f.kinds}
        onChange={(kinds) =>
          set({
            kinds,
            rooms: kinds.length === 1 && kinds[0] === "land" ? "" : f.rooms,
          })
        }
      />
      <PropertyField label="Город">
        <input
          value={f.city}
          placeholder="Любой город"
          maxLength={120}
          onChange={(e) => set({ city: e.target.value })}
        />
      </PropertyField>
      <Multiple
        label="Районы Ташкента"
        values={Object.fromEntries(districts.map((d) => [d, d]))}
        selected={f.districts}
        onChange={(districts) => set({ districts })}
      />
      <fieldset className="property-fieldset">
        <legend>Цена</legend>
        <PropertyField label="Валюта">
          <Options
            values={{ USD: "USD", UZS: "UZS" }}
            value={f.currency}
            onChange={(currency) => set({ currency })}
          />
        </PropertyField>
        <PropertyField label="Единица цены">
          <Options
            value={f.unit}
            values={
              f.operation === "rent"
                ? { month: "В месяц", "sqm-month": "За м² в месяц" }
                : { total: "Полная цена" }
            }
            onChange={(unit) => set({ unit })}
          />
        </PropertyField>
        <div className="property-two">
          {numeric("minPrice", "Цена от")}
          {numeric("maxPrice", "Цена до")}
        </div>
        <small>
          Для диапазона и сортировки цены нужна одна операция, валюта и единица.
          Курс не применяется.
        </small>
      </fieldset>
      {!landOnly && (
        <PropertyField label="Комнаты">
          <Options
            values={{ "": "Любое", "1": "1", "2": "2", "3": "3", "4+": "4+" }}
            value={f.rooms}
            onChange={(rooms) => set({ rooms })}
          />
        </PropertyField>
      )}
      <fieldset className="property-fieldset">
        <legend>Площадь, м²</legend>
        <div className="property-two">
          {numeric("minArea", "Площадь от")}
          {numeric("maxArea", "Площадь до")}
        </div>
        <small>
          1 сотка = 100 м²; 1 гектар = 10 000 м². Неизвестные значения не равны
          нулю.
        </small>
      </fieldset>
      {!landOnly && (
        <>
          <div className="property-two">
            {numeric("minFloor", "Этаж от")}
            {numeric("maxFloor", "Этаж до")}
          </div>
          <div className="property-two">
            {numeric("minFloors", "Этажность от")}
            {numeric("maxFloors", "Этажность до")}
          </div>
          <PropertyField label="Тип рынка">
            <Options
              values={{
                "": "Любой",
                Новостройка: "Новостройка",
                "Вторичное жильё": "Вторичное жильё",
                unknown: "Не указано",
              }}
              value={f.market || ""}
              onChange={(market) => set({ market })}
            />
          </PropertyField>
        </>
      )}
      <PropertyField label="Статус доступности">
        <Options
          values={{ "": "Любой", ...statusLabels }}
          value={f.status}
          onChange={(status) => set({ status })}
        />
      </PropertyField>
      <PropertyField label="Актуальность">
        <Options
          values={{
            "": "Любая",
            fresh: "Цена и наличие подтверждены недавно",
            review: "Требует проверки",
            never: "Никогда не подтверждалась",
          }}
          value={f.freshness}
          onChange={(freshness) => set({ freshness })}
        />
      </PropertyField>
      <PropertyField label="Источник">
        <Options
          values={{
            "": "Любой",
            ...Object.fromEntries(sources.map((s) => [s, s])),
          }}
          value={f.source}
          onChange={(source) => set({ source })}
        />
      </PropertyField>
      <PropertyField label="Ответственный">
        <Options
          values={{
            "": "Все разрешённые",
            unassigned: "Без ответственного",
            Вы: "Я",
            ...Object.fromEntries(employees.map((s) => [s, s])),
          }}
          value={f.assignee}
          onChange={(assignee) => set({ assignee })}
        />
      </PropertyField>
      <Multiple
        label="Характеристики"
        values={Object.fromEntries(featureLabels.map((s) => [s, s]))}
        selected={f.features}
        onChange={(features) => set({ features })}
      />
      {error && (
        <p role="alert" className="today-inline-error">
          {error}
        </p>
      )}
      <button className="today-primary" type="submit">
        Показать объекты
      </button>
      <button
        className="today-secondary"
        type="button"
        onClick={() => {
          setF({
            ...initial,
            operation: "all",
            kinds: [],
            city: "",
            districts: [],
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
          });
          setError("");
        }}
      >
        Сбросить
      </button>
      <button className="today-link" type="button" onClick={onCancel}>
        Отменить фильтры
      </button>
    </form>
  );
}
export function PropertyEditor({
  draft: d,
  onChange,
  editing,
  busy,
  onSave,
}: {
  draft: PropertyDraft;
  onChange: (d: PropertyDraft) => void;
  editing: boolean;
  busy: boolean;
  onSave: () => void;
}) {
  const set = (change: Partial<PropertyDraft>) => onChange({ ...d, ...change });
  const number = (
    key: "price" | "area" | "rooms" | "floor" | "floors",
    label: string,
  ) => (
    <PropertyField key={key} label={label}>
      <input
        inputMode="decimal"
        maxLength={18}
        value={d[key]}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </PropertyField>
  );
  return (
    <form
      className="property-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2 id="today-sheet-title">
        {editing ? "Редактировать объект" : "Добавить объект"}
      </h2>
      <p className="today-muted">
        Короткая запись в демо-базу. Неизвестные параметры можно оставить
        пустыми. Ничего не публикуется.
      </p>
      <fieldset disabled={busy} className="property-fieldset">
        <PropertyField label="Тип недвижимости">
          <Options
            values={kindLabels}
            value={d.kind}
            onChange={(kind) =>
              set({
                kind: kind as PropertyDraft["kind"],
                areaUnit: "sqm",
                rooms: kind === "land" ? "" : d.rooms,
                floor: kind === "land" || kind === "house" ? "" : d.floor,
                floors: kind === "land" ? "" : d.floors,
                market:
                  kind === "land" || kind === "commercial" ? "" : d.market,
              })
            }
          />
        </PropertyField>
        <PropertyField label="Операция">
          <Options
            values={operationLabels}
            value={d.operation}
            onChange={(operation) =>
              set({
                operation: operation as Listing["operation"],
                unit: operation === "rent" ? "month" : "total",
              })
            }
          />
        </PropertyField>
        <PropertyField label="Город">
          <input
            required
            maxLength={120}
            value={d.city}
            onChange={(e) => set({ city: e.target.value })}
          />
        </PropertyField>
        <PropertyField label="Район">
          <input
            required
            list="property-districts"
            value={d.district}
            maxLength={120}
            onChange={(e) => set({ district: e.target.value })}
          />
          <datalist id="property-districts">
            {districts.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </datalist>
        </PropertyField>
        <PropertyField label="Адрес или ориентир">
          <input
            value={d.address}
            maxLength={300}
            onChange={(e) => set({ address: e.target.value })}
          />
        </PropertyField>
        <PropertyField label="Видимость адреса">
          <Options
            values={{
              internal: "Только внутри базы",
              public: "Разрешён для клиента",
              approximate: "Приблизительное местоположение",
            }}
            value={d.addressVisibility}
            onChange={(addressVisibility) =>
              set({
                addressVisibility:
                  addressVisibility as PropertyDraft["addressVisibility"],
              })
            }
          />
        </PropertyField>
        <div className="property-two">
          {number("price", "Цена · необязательно")}
          <PropertyField label="Валюта">
            <Options
              values={{ USD: "USD", UZS: "UZS" }}
              value={d.currency}
              onChange={(currency) =>
                set({ currency: currency as Listing["currency"] })
              }
            />
          </PropertyField>
        </div>
        <PropertyField label="Единица цены">
          <Options
            values={
              d.operation === "sale"
                ? { total: unitLabels.total }
                : {
                    month: unitLabels.month,
                    "sqm-month": unitLabels["sqm-month"],
                  }
            }
            value={d.unit}
            onChange={(unit) => set({ unit: unit as Listing["unit"] })}
          />
        </PropertyField>
        <div className="property-two">
          {number("area", "Площадь")}
          <PropertyField label="Единица площади">
            <Options
              values={
                d.kind === "land"
                  ? { sqm: "м²", sotka: "Сотки", ha: "Гектары" }
                  : { sqm: "м²" }
              }
              value={d.areaUnit}
              onChange={(areaUnit) =>
                set({ areaUnit: areaUnit as PropertyDraft["areaUnit"] })
              }
            />
          </PropertyField>
        </div>
        {d.kind !== "land" && (
          <>
            {number("rooms", "Комнаты")}
            {d.kind !== "house" && (
              <div className="property-two">
                {number("floor", "Этаж")}
                {number("floors", "Этажность здания")}
              </div>
            )}
            {["house", "apartment"].includes(d.kind) && (
              <PropertyField label="Тип рынка">
                <Options
                  values={{
                    "": "Не указано",
                    Новостройка: "Новостройка",
                    "Вторичное жильё": "Вторичное жильё",
                  }}
                  value={d.market}
                  onChange={(market) => set({ market })}
                />
              </PropertyField>
            )}
          </>
        )}
        <Multiple
          label="Характеристики"
          values={Object.fromEntries(featureLabels.map((v) => [v, v]))}
          selected={d.features}
          onChange={(features) => set({ features })}
        />
        <PropertyField
          label="Фотографии демо-объекта"
          hint="Сгенерированные иллюстрации, не фотографии реальных предложений. Личные файлы не загружаются."
        >
          <select
            value={d.photos.length ? "demo" : "none"}
            onChange={(e) =>
              set({
                photos:
                  e.target.value === "demo"
                    ? [
                        "/images/property-living.png",
                        "/images/property-kitchen.png",
                      ]
                    : [],
              })
            }
          >
            <option value="none">Без фото</option>
            <option value="demo">Два демонстрационных изображения</option>
          </select>
        </PropertyField>
        <PropertyField label="Источник">
          <Options
            values={Object.fromEntries(sources.map((v) => [v, v]))}
            value={d.source}
            onChange={(source) => set({ source })}
          />
        </PropertyField>
        <PropertyField label="Условия">
          <textarea
            value={d.conditions}
            maxLength={2000}
            onChange={(e) => set({ conditions: e.target.value })}
          />
        </PropertyField>
        <PropertyField
          label="Внутренняя заметка"
          hint="Не попадёт в клиентское превью."
        >
          <textarea
            value={d.note}
            maxLength={2000}
            onChange={(e) => set({ note: e.target.value })}
          />
        </PropertyField>
        <label className="property-check">
          <input
            type="checkbox"
            checked={d.duplicateConfirmed}
            onChange={(e) => set({ duplicateConfirmed: e.target.checked })}
          />
          <span>
            Если адрес совпадает: я сравнил записи и создаю отдельный объект или
            предложение, без автоматического объединения.
          </span>
        </label>
      </fieldset>
      <button className="today-primary" type="submit" disabled={busy}>
        {busy
          ? "Сохраняем…"
          : editing
            ? "Сохранить изменения"
            : "Добавить в базу"}
      </button>
      <p className="today-muted">
        Черновик останется при возврате в каталог, до перезагрузки или выхода.
      </p>
    </form>
  );
}
export function PropertyReview({
  listing,
  draft: r,
  onChange,
  onSave,
  busy,
}: {
  listing: Listing;
  draft: ReviewDraft;
  onChange: (r: ReviewDraft) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const set = (change: Partial<ReviewDraft>) => onChange({ ...r, ...change });
  return (
    <form
      className="property-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2 id="today-sheet-title">Проверка объекта</h2>
      <p className="today-muted">
        Объект №{listing.id} · Уточните, какие сведения подтверждены. Это ручная
        демо-отметка, не юридическая проверка.
      </p>
      <fieldset disabled={busy} className="property-fieldset">
        <PropertyField label="Объект доступен?">
          <Options
            values={{ unknown: "Не удалось уточнить", yes: "Да", no: "Нет" }}
            value={r.availability}
            onChange={(availability) =>
              set({ availability: availability as ReviewDraft["availability"] })
            }
          />
        </PropertyField>
        {r.availability === "no" && (
          <PropertyField label="Причина недоступности">
            <Options
              values={Object.fromEntries(
                Object.entries(statusLabels).filter(
                  ([key]) =>
                    ["unavailable", "sold", "rented", "withdrawn"].includes(
                      key,
                    ) &&
                    validStatus(listing.operation, key as Listing["status"]),
                ),
              )}
              value={r.unavailableStatus}
              onChange={(unavailableStatus) =>
                set({
                  unavailableStatus: unavailableStatus as Listing["status"],
                })
              }
            />
          </PropertyField>
        )}
        <PropertyField label="Цена актуальна?">
          <Options
            values={{
              unknown: "Не уточнял",
              yes: "Да",
              changed: "Цена изменилась",
            }}
            value={r.price}
            onChange={(price) => set({ price: price as ReviewDraft["price"] })}
          />
        </PropertyField>
        {r.price === "changed" && (
          <div className="property-two">
            <PropertyField label="Новая цена">
              <input
                required
                inputMode="decimal"
                value={r.newPrice}
                onChange={(e) => set({ newPrice: e.target.value })}
              />
            </PropertyField>
            <PropertyField label="Новая валюта">
              <Options
                values={{ USD: "USD", UZS: "UZS" }}
                value={r.currency}
                onChange={(currency) =>
                  set({ currency: currency as Listing["currency"] })
                }
              />
            </PropertyField>
          </div>
        )}
        <PropertyField label="Условия актуальны?">
          <Options
            values={{ unknown: "Не уточнял", yes: "Да", changed: "Изменились" }}
            value={r.conditions}
            onChange={(conditions) =>
              set({ conditions: conditions as ReviewDraft["conditions"] })
            }
          />
        </PropertyField>
        {r.conditions === "changed" && (
          <PropertyField label="Новые условия">
            <textarea
              required
              maxLength={2000}
              value={r.newConditions}
              onChange={(e) => set({ newConditions: e.target.value })}
            />
          </PropertyField>
        )}
        <PropertyField label="Откуда информация?">
          <Options
            values={{
              "": "Выберите источник",
              "Собственник сообщил": "Собственник сообщил",
              "Представитель сообщил": "Представитель сообщил",
              "Доступная система": "Проверено в доступной системе",
              "Другие сведения": "Добавлено вручную по другим сведениям",
            }}
            value={r.source}
            onChange={(source) => set({ source })}
          />
        </PropertyField>
        <PropertyField label="Примечание">
          <textarea
            value={r.note}
            maxLength={2000}
            onChange={(e) => set({ note: e.target.value })}
          />
        </PropertyField>
      </fieldset>
      <button disabled={busy} type="submit" className="today-primary">
        {busy ? "Сохраняем…" : "Сохранить проверку"}
      </button>
    </form>
  );
}
export function PropertyFacts({
  property: p,
  listing: l,
  access,
}: {
  property: Property;
  listing: Listing;
  access: PropertyAccess;
}) {
  return (
    <dl className="property-facts">
      <div>
        <dt>Операция</dt>
        <dd>{operationLabels[l.operation]}</dd>
      </div>
      <div>
        <dt>Тип</dt>
        <dd>{kindLabels[p.kind]}</dd>
      </div>
      <div>
        <dt>Расположение</dt>
        <dd>
          {p.city} · {p.district}
        </dd>
      </div>
      <div>
        <dt>Адрес</dt>
        <dd>
          {displayAddress(p, l, access)}
          {p.addressVisibility === "approximate" ? " · приблизительно" : ""}
        </dd>
      </div>
      <div>
        <dt>Площадь</dt>
        <dd>
          {p.area != null
            ? `${p.area} ${p.areaUnit === "sqm" ? "м²" : p.areaUnit === "sotka" ? "сот." : "га"}`
            : "Не указана"}
        </dd>
      </div>
      {p.kind !== "land" && (
        <>
          <div>
            <dt>Комнаты</dt>
            <dd>{p.rooms ?? "Не указаны"}</dd>
          </div>
          <div>
            <dt>Этаж / этажность</dt>
            <dd>
              {p.floor ?? "—"} / {p.floors ?? "—"}
            </dd>
          </div>
        </>
      )}
      <div>
        <dt>Источник</dt>
        <dd>
          {l.source}
          {l.sourceUnavailable ? " · перестал обновляться" : ""}
        </dd>
      </div>
      <div>
        <dt>Ответственный</dt>
        <dd>{l.assignee || "Не назначен"}</dd>
      </div>
      <div>
        <dt>Условия</dt>
        <dd>{l.conditions || "Не уточнены"}</dd>
      </div>
      <div>
        <dt>Характеристики</dt>
        <dd>{p.features.join(", ") || "Не указаны"}</dd>
      </div>
      {canEditListing(l, access) && (
        <div>
          <dt>Внутренняя заметка</dt>
          <dd>{p.note || "Не добавлена"}</dd>
        </div>
      )}
      <div>
        <dt>Обновлено в базе</dt>
        <dd>
          {propertyDate(l.updatedAt)} · версия {l.version}
        </dd>
      </div>
    </dl>
  );
}
