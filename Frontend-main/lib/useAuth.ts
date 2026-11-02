"use client";

import { useSyncExternalStore } from "react";

const KEY = "access_token";
const EVENT = "auth-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): boolean {
  return localStorage.getItem(KEY) !== null;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsLoggedIn(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event(EVENT));
}
