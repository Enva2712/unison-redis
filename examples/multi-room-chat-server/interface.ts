// This file defines the interface shared between client & server

import { Observable, OperatorFunction } from "rxjs";
import { filter } from "rxjs/operators";
import {
  object,
  string,
  literal,
  union,
  unknown,
  array,
  is,
  Struct,
  Failure,
  Infer,
} from "superstruct";

export type ClientEventSubscribe = Infer<typeof ClientEventSubscribe>;
export const ClientEventSubscribe = object({
  type: literal("subscribe"),
  room: string(),
});

export type ClientEventUnsubscribe = Infer<typeof ClientEventUnsubscribe>;
export const ClientEventUnsubscribe = object({
  type: literal("unsubscribe"),
  room: string(),
});

export type ClientEventSendMessage = Infer<typeof ClientEventSendMessage>;
export const ClientEventSendMessage = object({
  type: literal("send-message"),
  room: string(),
  content: string(),
});

export type ClientEventSetUsername = Infer<typeof ClientEventSetUsername>;
export const ClientEventSetUsername = object({
  type: literal("set-username"),
  username: string(),
});

export type ClientEvent = Infer<typeof ClientEvent>;
export const ClientEvent = union([
  ClientEventSubscribe,
  ClientEventUnsubscribe,
  ClientEventSendMessage,
  ClientEventSetUsername,
]);

export type ServerEventMessage = Infer<typeof ServerEventMessage>;
export const ServerEventMessage = object({
  type: literal("message"),
  username: string(),
  room: string(),
  content: string(),
});

export type ServerEventInvalidClientEvent = Infer<
  typeof ServerEventInvalidClientEvent
>;
export const ServerEventInvalidClientEvent = object({
  type: literal("invalid-client-event"),
  event: unknown(),
});

export type ServerEvent = Infer<typeof ServerEvent>;
export const ServerEvent = union([
  ServerEventMessage,
  ServerEventInvalidClientEvent,
]);
