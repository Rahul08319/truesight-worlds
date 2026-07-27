import React, { useEffect, useState } from 'react';
import { lifecycle, inPlayables, getLastAdEvent, getAdEventLog, getLastSentScore, type AdEvent } from '@/lib/ytPlayables';
import { grantSummary } from '@/lib/rewardGrants';
import { useTranslations } from '@/lib/i18n';

// Floating QA panel showing SDK lifecycle + last score/ad result.
// Toggle with the 🐞 button; hidden by default.
const DebugPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { lang } = useTranslations();
  const [, setTick] = useState(0);
  const [smoke, setSmoke] = useState<any>(typeof window !== 'undefined' ? (window as any).__ytSmokeTest : null);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    const onSmoke = (e: Event) => setSmoke((e as CustomEvent).detail);
    const onAd = () => setTick(t => t + 1);
    window.addEventListener('ytgame:smoketest', onSmoke);
    window.addEventListener('ytgame:adevent', onAd);
    return () => {
      clearInterval(id);
      window.removeEventListener('ytgame:smoketest', onSmoke);
      window.removeEventListener('ytgame:adevent', onAd);
    };
  }, [open]);

  if (!open) return null;

  const lastAd: AdEvent | null = getLastAdEvent();
  const lastScore = getLastSentScore();
  const grants = grantSummary();
  const adLog = getAdEventLog().slice(-5).reverse();

  const dot = (ok: boolean) => (
    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
  );

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 rounded-xl bg-black/85 text-white text-xs font-mono shadow-2xl border border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="font-semibold">🐞 Playables Debug</span>
        <button onClick={onClose} aria-label="Close debug panel" className="opacity-70 hover:opacity-100">✕</button>
      </div>
      <div className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
        <section>
          <div className="opacity-60 mb-1">Lifecycle</div>
          <div>{dot(inPlayables())}IN_PLAYABLES_ENV: {String(inPlayables())}</div>
          <div>{dot(lifecycle.firstFrameSent)}firstFrameReady</div>
          <div>{dot(lifecycle.gameReadySent)}gameReady</div>
          {smoke && <div>{dot(!!smoke.ok)}smokeTest {smoke.ok ? 'ok' : 'fail'}</div>}
        </section>
        <section>
          <div className="opacity-60 mb-1">Language</div>
          <div>{lang}</div>
        </section>
        <section>
          <div className="opacity-60 mb-1">Last sendScore</div>
          {lastScore ? (
            <div>
              {dot(lastScore.verified)}value={lastScore.value} · {lastScore.verified ? 'verified' : 'MISMATCH'}
              <div className="opacity-60">{new Date(lastScore.timestamp).toLocaleTimeString()}</div>
            </div>
          ) : <div className="opacity-60">none</div>}
        </section>
        <section>
          <div className="opacity-60 mb-1">Last ad event</div>
          {lastAd ? (
            <div>
              {dot(lastAd.outcome === 'GRANTED')}{lastAd.outcome} (code {lastAd.code})
              <div className="opacity-60">{lastAd.rewardId} · {new Date(lastAd.timestamp).toLocaleTimeString()}</div>
              {lastAd.detail && <div className="opacity-60">↳ {lastAd.detail}</div>}
            </div>
          ) : <div className="opacity-60">none</div>}
        </section>
        <section>
          <div className="opacity-60 mb-1">Grants</div>
          <div>total={grants.total} · applied={grants.applied} · pending={grants.pending}</div>
        </section>
        {adLog.length > 0 && (
          <section>
            <div className="opacity-60 mb-1">Ad log (last {adLog.length})</div>
            {adLog.map(e => (
              <div key={e.timestamp} className="truncate">
                {new Date(e.timestamp).toLocaleTimeString()} · {e.outcome}{e.attempt ? ` #${e.attempt}` : ''}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;