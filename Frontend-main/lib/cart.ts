"use client";

import { useSyncExternalStore } from "react";

export interface CartItem {
  id: number;
  qty: number;
}

const KEY = "cart";
const EVENT = "cart-change";

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = [];

const EMPTY: CartItem[] = [];

function getSnapshot(): CartItem[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      cachedItems = [];
    }
  }
  return cachedItems;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function clearCart() {
  writeCart([]);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.qty, 0);
}
