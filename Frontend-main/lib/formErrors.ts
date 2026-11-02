"use client";

import { useState } from "react";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function messageFor(el: Control): string {
  const v = el.validity;
  if (v.valueMissing) return "此项为必填项";
  if (v.typeMismatch) return el.type === "email" ? "请输入有效的邮箱地址" : "请输入有效的值";
  if (v.rangeUnderflow) return `不能小于 ${(el as HTMLInputElement).min}`;
  if (v.rangeOverflow) return `不能大于 ${(el as HTMLInputElement).max}`;
  if (v.tooShort) return `至少输入 ${(el as HTMLInputElement).minLength} 个字符`;
  if (v.tooLong) return `最多输入 ${(el as HTMLInputElement).maxLength} 个字符`;
  if (v.stepMismatch) return "请输入有效的金额";
  if (v.patternMismatch) return "请按要求的格式填写";
  if (v.badInput) return "请输入有效的值";
  return "请检查此项内容";
}

function isControl(el: Element): el is Control {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

export function collectErrors(form: HTMLFormElement): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if (!isControl(el) || !el.name || el.disabled || el.validity.valid) continue;
    errors[el.name] = messageFor(el);
  }
  return errors;
}

export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(onValid: (form: HTMLFormElement) => void | Promise<void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const found = collectErrors(form);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        const first = form.querySelector<Control>(`[name="${CSS.escape(Object.keys(found)[0])}"]`);
        first?.focus();
        return;
      }
      return onValid(form);
    };
  }

  function clear(name: string) {
    setErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
  }

  return { errors, setErrors, onSubmit, clear };
}
