"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { PropertyField } from "./property-panels";
import {
  canViewListing,
  freshnessReasons,
  kindLabels,
  normalizePropertyText,
  operationLabels,
  priceLabel,
  propertyRequestWarnings,
  statusLabels,
  type PropertyAccess,
  type PropertyState,
  type PropertyTarget,
} from "./property-model";

type Selection = { id: string; version: number };
type Props = {
  targets: PropertyTarget[];
  state: PropertyState;
  access: PropertyAccess;
  selections: Selection[];
  initialClient: string;
  initialRequest: string;
  busy: boolean;
  now: string;
  onSave: (clientId: string, requestId: string) => void;
  onRefresh: (selections: Selection[]) => void;
  onRemove?: (id: string) => void;
};

export function PropertyLinkPanel({ targets, state, access, selections, initialClient, initialRequest, busy, now, onSave, onRefresh, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState(initialClient);
  const [requestId, setRequestId] = useState(initialRequest);
  const [ackKey, setAckKey] = useState("");
  const target = targets.find((value) => value.id === clientId);
  const request = target?.requests.find((value) => value.id === requestId);
  const matches = targets.filter((value) => normalizePropertyText(value.name).includes(normalizePropertyText(query)));
  const entries = selections.map((selection) => {
    const listing = state.listings.find((value) => value.id === selection.id && canViewListing(value, access));
    const property = listing && state.properties.find((value) => value.id === listing.propertyId && value.scope === listing.scope);
    const visible = Boolean(listing && property && listing.scope === target?.scope);
    const exists = state.links.some((link) => link.listingId === selection.id && link.clientId === clientId && link.requestId === requestId);
    return { selection, listing: visible ? listing : undefined, property: visible ? property : undefined, exists };
  });
  const stale = entries.some(({ selection, listing }) => listing && selection.version !== listing.version);
  const blocked = entries.some(({ listing }) => !listing || listing.archived || listing.status !== "available");
  const newCount = entries.filter(({ exists }) => !exists).length;
  const reviewKey = JSON.stringify({ target, requestId, entries, rules: state.rules });
  const acknowledged = ackKey === reviewKey;
  const disabled = busy || !request || !selections.length || selections.length > 100 || stale || blocked || !newCount || !acknowledged;

  return (
    <form className="property-form" onSubmit={(event) => { event.preventDefault(); if (!disabled) onSave(clientId, requestId); }}>
      <h2 id="today-sheet-title">{onRemove ? "Проверьте выбор" : "Для какого клиента?"}</h2>
      <p className="today-muted">Связь с запросом — не отправка. Клиент не получит сообщение или уведомление.</p>
      <fieldset className="property-fieldset" disabled={busy}>
        <PropertyField label="Найти клиента">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Имя клиента" />
        </PropertyField>
        <PropertyField label="Клиент">
          <select required value={target ? clientId : ""} onChange={(event) => { setClientId(event.target.value); setRequestId(""); setAckKey(""); }}>
            <option value="">Выберите клиента</option>
            {target && !matches.some((value) => value.id === target.id) && <option value={target.id}>{target.name} · выбран</option>}
            {matches.map((value) => <option key={value.id} value={value.id}>{value.name}</option>)}
          </select>
        </PropertyField>
        {Boolean(query.trim()) && !matches.length && <p className="property-info" role="status">Клиенты не найдены. Попробуйте другое имя.{target ? " Выбранный клиент сохранён." : ""}</p>}
        {!targets.length && <p className="property-info">В этом пространстве нет клиентов. Добавьте клиента и запрос в разделе «Клиенты», затем вернитесь к объекту.</p>}
        {target && <PropertyField label="Запрос клиента">
          <select required value={request ? requestId : ""} onChange={(event) => { setRequestId(event.target.value); setAckKey(""); }}>
            <option value="">Выберите запрос</option>
            {target.requests.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}
          </select>
        </PropertyField>}
        {target && !target.requests.length && <p className="property-info">У клиента нет сохранённого запроса. Сначала уточните его потребность в Client 360°.</p>}
        {target && request && <>
          <div className="property-banner"><strong>{target.name}</strong><p>{request.label}</p><p>Сверяем только сохранённые параметры. Совпадение по всем требованиям и юридическая проверка не подтверждаются.</p></div>
          <p className="today-muted" role="status">Выбрано: {entries.length} · Новых связей: {newCount}</p>
          <div className="property-link-list">
            {entries.map(({ selection, listing, property, exists }) => {
              const warnings = listing && property ? [
                ...propertyRequestWarnings(property, listing, request),
                ...freshnessReasons(listing, state.rules, now),
              ] : [];
              return <article key={selection.id} className="property-link-item">
                <div className="property-link-heading">
                  <h3>{listing ? `Объект №${listing.id}` : "Объект недоступен"}</h3>
                  {onRemove && <button type="button" className="today-icon" aria-label={listing ? `Убрать объект №${listing.id} из выбора` : "Убрать недоступный объект из выбора"} onClick={() => onRemove(selection.id)}><X size={17} /></button>}
                </div>
                {listing && property ? <>
                  <p className="property-price">{priceLabel(listing)}</p>
                  <p>{operationLabels[listing.operation]} · {kindLabels[property.kind]} · {property.district || "Район не указан"}</p>
                  <p className="today-muted">{statusLabels[listing.status]}{listing.archived ? " · В архиве" : ""}</p>
                  {exists && <p className="property-info">Объект уже добавлен к этому запросу. Повторная связь не создаётся.</p>}
                  {(listing.archived || listing.status !== "available") && <p className="today-inline-error">Для новой связи объект недоступен. Уберите его из выбора.</p>}
                  {selection.version !== listing.version && <p className="today-inline-error">Сведения изменились после выбора. Ниже показаны текущие данные; сверьте их и обновите версии.</p>}
                  {warnings.length > 0 && <div className="property-link-warnings"><span><TriangleAlert size={15} aria-hidden="true" />Нужно учесть</span><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
                </> : <p className="today-inline-error">Запись не найдена или доступ изменился. Закрытые данные не показываются.</p>}
              </article>;
            })}
          </div>
          {!selections.length && <p className="property-info">Выбор пуст. Вернитесь к каталогу, чтобы выбрать объекты.</p>}
          {selections.length > 100 && <p className="today-inline-error">За один раз можно связать не более 100 предложений. Уменьшите выбор.</p>}
          {stale && <button className="today-secondary" type="button" onClick={() => onRefresh(entries.map(({ listing, selection }) => listing ? { id: listing.id, version: listing.version } : selection))}>Я сверил изменения · обновить версии</button>}
          {!stale && !blocked && newCount > 0 && <label className="property-check">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAckKey(event.target.checked ? reviewKey : "")} />
            <span>Я проверил выбранный запрос, состав объектов и предупреждения. Связываю вручную, без отправки клиенту.</span>
          </label>}
        </>}
        <button className="today-primary" type="submit" disabled={disabled}>{busy ? "Сохраняем связи…" : onRemove ? `Добавить к запросу · ${newCount}` : "Добавить к запросу"}</button>
      </fieldset>
    </form>
  );
}
