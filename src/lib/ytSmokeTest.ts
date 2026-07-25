// Playables SDK smoke test.
//
// Runs after mount to verify the required lifecycle hooks fired. When running
// inside YouTube (IN_PLAYABLES_ENV) this doubles as a Test-Suite friendly
// probe: results are logged to console and dispatched as a `ytgame:smoketest`
// window event so the Playables Test Suite / dev tools can pick them up.
//
// Locally (outside YouTube) it falls back to verifying our own wrapper state
// (firstFrameReady + gameReady were called) so we still catch regressions.

import { lifecycle, firstFrameReady, gameReady, inPlayables, yt } from "./ytPlayables";

export interface SmokeResult {
  inPlayables: boolean;
  sdkPresent: boolean;
  firstFrameReady: boolean;
  gameReady: boolean;
  ok: boolean;
  errors: string[];
}

export function runSmokeTest(): SmokeResult {
  const errors: string[] = [];
  const sdkPresent = !!yt();

  // Fallback: if something forgot to call them, invoke here so the SDK still
  // gets the required signals — but flag it as a failure so we notice.
  if (!lifecycle.firstFrameSent) {
    errors.push("firstFrameReady() was not called before smoke test");
    firstFrameReady();
  }
  if (!lifecycle.gameReadySent) {
    errors.push("gameReady() was not called before smoke test");
    gameReady();
  }

  const result: SmokeResult = {
    inPlayables: inPlayables(),
    sdkPresent,
    firstFrameReady: lifecycle.firstFrameSent,
    gameReady: lifecycle.gameReadySent,
    ok: errors.length === 0,
    errors,
  };

  const tag = result.ok ? "✅" : "❌";
  console.info(`[ytgame:smoketest] ${tag}`, result);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ytgame:smoketest", { detail: result }));
    // Expose for the Playables Test Suite / manual inspection.
    (window as any).__ytSmokeTest = result;
  }

  return result;
}