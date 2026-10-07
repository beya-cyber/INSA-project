import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  const dictionary = {
    en: {
      reportFraud: "Report Scam / Fraud",
      trackCase: "Track Case Status",
      staffLogin: "Institutional Staff Login",
      "landing.eyebrow": "NATIONAL DIGITAL SCAM & FRAUD INTELLIGENCE RESPONSE",
      "landing.headline": "Protecting Citizens & Securing Digital Assets Nationwide",
      "landing.sub": "Unified anti-fraud platform connecting citizens, commercial banks, law enforcement agencies, and national cybersecurity operations.",
      "landing.ctaReport": "Report Fraud / Scam",
      "landing.ctaTrack": "Track Existing Case",
      "landing.channelsTitle": "Multi-Channel Reporting Gateway",
      "landing.channelsSub": "Multiple secure channels to report and combat financial fraud across the nation.",
      "landing.channelWebTitle": "Web Portal",
      "landing.channelWebDesc": "Direct browser reporting and live case tracking.",
      "landing.channelTelegramTitle": "Telegram Bot",
      "landing.channelTelegramDesc": "Report and track via secure automated Telegram messaging.",
      "landing.channelIvrTitle": "IVR Hotline",
      "landing.channelIvrDesc": "Voice-guided reporting for urgent scam incidents.",
      "landing.stepsTitle": "How It Works",
      "landing.step1Title": "Submit Incident Report",
      "landing.step1Desc": "Provide scam details, transaction IDs, and fraudulent wallet addresses through our secure wizard.",
      "landing.step2Title": "Automated Telemetry & Triage",
      "landing.step2Desc": "Our AI and cyber operations engine analyzes the threat and links related scam campaigns.",
      "landing.step3Title": "Bank & Asset Freeze",
      "landing.step3Desc": "Instantaneous alerts dispatched to partner commercial banks to freeze fraudulent transfers.",
      "landing.step4Title": "Law Enforcement Tracking",
      "landing.step4Desc": "Warrant generation and digital evidence packages delivered securely to police investigators."
    },
    am: {
      reportFraud: "ማጭበርበር ሪፖርት ያድርጉ",
      trackCase: "የኬስ ሁኔታ ይከታተሉ",
      staffLogin: "የሰራተኞች መግቢያ",
      "landing.eyebrow": "ብሔራዊ የዲጂታል ማጭበርበር እና ስዋም ምላሽ ሰጪ መድረክ",
      "landing.headline": "ዜጎችን መጠበቅ እና የዲጂታል ንብረቶችን ማስጠበቅ",
      "landing.sub": "ዜጎችን፣ ባንኮችን፣ የህግ አስከባሪ አካላትን እና የሳይበር ደህንነት ኦፕሬሽኖችን የሚያገናኝ የተዋሃደ መድረክ።",
      "landing.ctaReport": "ማጭበርበር ሪፖርት ያድርጉ",
      "landing.ctaTrack": "የነበረውን ኬስ ይከታተሉ",
      "landing.channelsTitle": "ባለብዙ ቻናል ሪፖርት ማድረጊያ",
      "landing.channelsSub": "በሀገር አቀፍ ደረጃ የገንዘብ ማጭበርበርን ሪፖርት ለማድረግ እና ለመከላከል ደህንነቱ የተጠበቀ ቻናሎች።",
      "landing.channelWebTitle": "የዌብ ፖርታል",
      "landing.channelWebDesc": "ቀጥተኛ የድር ሪፖርት ማድረጊያ እና የኬስ ክትትል",
      "landing.channelTelegramTitle": "ቴሌግራም ቦት",
      "landing.channelTelegramDesc": "በቴሌግራም በኩል ሪፖርት ያድርጉ።",
      "landing.channelIvrTitle": "የድምጽ መስመር",
      "landing.channelIvrDesc": "ለአስቸኳይ ማጭበርበር ሪፖርቶች።",
      "landing.stepsTitle": "እንዴት እንደሚሰራ",
      "landing.step1Title": "የክስተት ሪፖርት ያስገቡ",
      "landing.step1Desc": "የማጭበርበር ዝርዝሮችን፣ የግብይት መታወቂያዎችን እና አድራሻዎችን ያቅርቡ።",
      "landing.step2Title": "ራስ-ሰር ትንተና እና ምርመራ",
      "landing.step2Desc": "የኛ ሳይበር ኦፕሬሽንስ ሞተር ስጋቱን ይመረምራል።",
      "landing.step3Title": "የባንክ እና የገንዘብ እገዳ",
      "landing.step3Desc": "አጠራጣሪ ዝውውሮችን ለማገድ ለባንኮች የሚደረግ አስቸኳይ ማሳወቂያ።",
      "landing.step4Title": "የህግ አስከባሪ ክትትል",
      "landing.step4Desc": "የዲጂታል ማስረጃ ፓኬጆች ለፖሊስ investigator ይደርሳሉ።"
    }
  };

  const t = (key) => {
    return dictionary[language]?.[key] || dictionary['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => key
    };
  }
  return context;
}
