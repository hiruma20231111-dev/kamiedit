"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** 起動時に一度だけ Drive からの読み込み（無UIサインイン）を試みる */
export function StoreInit() {
  const init = useStore((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  return null;
}
