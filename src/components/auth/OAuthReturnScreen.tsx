import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowRight, Smartphone, Globe, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OAuthReturnScreenProps {
  hash: string;
  search: string;
  onContinueInWeb: () => void;
}

export const OAuthReturnScreen: React.FC<OAuthReturnScreenProps> = ({
  hash,
  search,
  onContinueInWeb,
}) => {
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Detect user preferred language
  const language = typeof window !== 'undefined'
    ? (localStorage.getItem('kairo_language') || 'ru')
    : 'ru';

  const authData = hash || (search.startsWith('?') ? '#' + search.substring(1) : search);
  const intentUrl = `intent://auth${authData}#Intent;scheme=sumire;package=com.kairo.planner;S.browser_fallback_url=https%3A%2F%2Fdaily.kawaii.uz;end;`;
  const customSchemeUrl = `sumire://auth${authData}`;
  const kairoSchemeUrl = `kairo://auth${authData}`;

  useEffect(() => {
    // Fire celebratory confetti!
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#3D6B52', '#F0BB58', '#4285F4', '#34A853'],
    });

    // Attempt automatic handoff to native app
    const timer = setTimeout(() => {
      setRedirectAttempted(true);
      try {
        window.location.href = intentUrl;
      } catch (_) {
        try {
          window.location.href = customSchemeUrl;
        } catch (__) {}
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [intentUrl, customSchemeUrl]);

  return (
    <div className="min-h-screen bg-[#F4F0EA] text-[#24201D] flex flex-col justify-between items-center px-5 py-8 max-w-md mx-auto select-none font-body relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#3D6B52]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 -right-20 w-80 h-80 bg-[#E09F3E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Brand */}
      <div className="w-full flex items-center justify-center gap-2 pt-4 z-10">
        <div className="w-10 h-10 rounded-2xl bg-[#3D6B52] text-white border-[2px] border-[#24201D] flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#24201D] font-display">
          DS
        </div>
        <div className="text-left">
          <span className="text-sm font-black uppercase tracking-wider font-display text-[#24201D] block leading-none">
            Daily Sumire
          </span>
          <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider">
            {language === 'uz' ? 'Fokus va odatlar' : language === 'ru' ? 'Фокус и привычки' : 'Focus & Habits'}
          </span>
        </div>
      </div>

      {/* Main Return Card */}
      <div className="w-full bg-white border-[2.5px] border-[#24201D] rounded-3xl p-6 shadow-[5px_5px_0px_#24201D] text-center flex flex-col items-center gap-4 my-auto z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="relative">
          <div className="w-18 h-18 rounded-3xl bg-[#EAF2ED] border-[2px] border-[#3D6B52] flex items-center justify-center shadow-[3px_3px_0px_#3D6B52]">
            <CheckCircle2 className="w-10 h-10 text-[#3D6B52] stroke-[2.5]" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#F0BB58] border-[1.5px] border-[#24201D] flex items-center justify-center animate-spin">
            <Sparkles className="w-3.5 h-3.5 text-[#24201D]" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black uppercase font-display tracking-wide text-[#24201D]">
            {language === 'uz'
              ? 'Muvaffaqiyatli kirdingiz!'
              : language === 'ru'
              ? 'Вход выполнен успешно!'
              : 'Signed in successfully!'}
          </h2>
          <p className="text-xs font-semibold text-[#6B635B] mt-1.5 leading-relaxed">
            {language === 'uz'
              ? 'Ilovaga qaytish uchun pastdagi tugmani bosing:'
              : language === 'ru'
              ? 'Для возврата в приложение нажмите кнопку ниже:'
              : 'Tap below to return to the Daily Sumire app:'}
          </p>
        </div>

        {/* Primary Action: Open Native App */}
        <a
          href={intentUrl}
          className="w-full py-3.5 px-6 bg-[#3D6B52] text-white border-[2px] border-[#24201D] rounded-2xl font-black text-sm uppercase tracking-wider shadow-[3.5px_3.5px_0px_#24201D] hover:bg-[#345B45] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1.5px_1.5px_0px_#24201D] transition-all flex items-center justify-center gap-2.5 group"
        >
          <Smartphone className="w-5 h-5 text-[#F0BB58]" />
          <span>
            {language === 'uz'
              ? 'Daily Sumire ilovasini ochish'
              : language === 'ru'
              ? 'Открыть Daily Sumire'
              : 'Open Daily Sumire'}
          </span>
          <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
        </a>

        {/* Fallback link with custom scheme */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-[#6B635B]">
          <a
            href={customSchemeUrl}
            className="underline hover:text-[#24201D]"
          >
            {language === 'uz' ? 'Toʻgʻridan-toʻgʻri havola' : language === 'ru' ? 'Прямой запуск' : 'Direct Link'} (sumire://)
          </a>
          <span>•</span>
          <a
            href={kairoSchemeUrl}
            className="underline hover:text-[#24201D]"
          >
            kairo://
          </a>
        </div>

        {/* Secondary Action: Continue in Web Browser */}
        <div className="w-full pt-3 border-t-[1.5px] border-[#24201D]/10 flex flex-col items-center">
          <button
            type="button"
            onClick={onContinueInWeb}
            className="text-xs font-bold text-[#6B635B] hover:text-[#24201D] py-1.5 px-3 rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>
              {language === 'uz'
                ? 'Brauzer versiyasida qolish'
                : language === 'ru'
                ? 'Остаться в веб-версии'
                : 'Continue in browser'}
            </span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-[10px] font-bold text-[#A8A29E] tracking-wider uppercase text-center pb-2">
        Daily Sumire • OAuth Flow Safe Return
      </div>
    </div>
  );
};
