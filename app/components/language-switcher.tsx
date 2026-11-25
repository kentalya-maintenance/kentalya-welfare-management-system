
'use client';

import { useLanguage } from './language-provider';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1"
      aria-label="Choose application language"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
          language === 'en'
            ? 'bg-[#123d2b] text-white shadow-sm'
            : 'text-gray-600 hover:bg-white hover:text-gray-900'
        }`}
      >
        🇬🇧 English
      </button>

      <button
        type="button"
        onClick={() => setLanguage('sw')}
        aria-pressed={language === 'sw'}
        className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
          language === 'sw'
            ? 'bg-[#123d2b] text-white shadow-sm'
            : 'text-gray-600 hover:bg-white hover:text-gray-900'
        }`}
      >
        🇰🇪 Kiswahili
      </button>
    </div>
  );
}
