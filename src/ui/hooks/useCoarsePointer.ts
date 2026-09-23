import { useEffect, useState } from "react";

const QUERY = "(pointer: coarse)";

function readMatches(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    // jsdom（單元測試環境）或不支援 matchMedia 時，安全降級為「非觸控」，
    // 讓滑鼠／鍵盤那條既有的「點一下直接落子」路徑維持不變。
    return false;
  }
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * 判斷目前輸入裝置是否為「粗指標」（觸控）。
 * 用 CSS media query `(pointer: coarse)`，並監聽變化（使用者可能轉動裝置、
 * 外接滑鼠，或切換輸入方式），元件卸載時會清掉監聽。
 */
export function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState<boolean>(readMatches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(QUERY);
    } catch {
      return undefined;
    }

    const handleChange = (event: MediaQueryListEvent) => setIsCoarse(event.matches);

    // 掛上監聽前的狀態可能已經過期（例如測試中先 mock 再 render），重新同步一次。
    setIsCoarse(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }
    // 舊版 Safari（<14）沒有 addEventListener，退回已棄用但仍受支援的 addListener。
    if (typeof mql.addListener === "function") {
      mql.addListener(handleChange);
      return () => mql.removeListener(handleChange);
    }
    return undefined;
  }, []);

  return isCoarse;
}
