/**
 * NATIVE Tagalog question frames.
 *
 * The offline engine used to machine-translate the English frames word by word,
 * which produced Taglish and broken grammar ("Gaano ka kasaya sa mga serbisyo ng
 * unibersidad aklatan?"). Every frame below is instead written directly in simple,
 * everyday Tagalog, so Tagalog surveys are monolingual by construction.
 *
 * Frame ids, categories, types, difficulty, tags and interactions mirror
 * src/lib/ai/frames.ts exactly: selection, balancing and analytics stay identical,
 * only the wording changes. Answer options get the same treatment.
 */
import { QUESTION_FRAMES, type QuestionFrame } from "@/lib/ai/frames";

/** Simple Tagalog wording for every question frame (same ids as the English set). */
export const TAGALOG_FRAME_TEXT: Record<string, string> = {
  /* ---------------------------------- Satisfaction --------------------------------- */
  "sat-1": "Gaano ka nasisiyahan sa {subject}?",
  "sat-2": "Sa kabuuan, paano mo susuriin ang kalidad ng {subject}?",
  "sat-3": "Natutugunan ng {subject} ang mga pangangailangan at inaasahan ko.",
  "sat-4": "Sulit ang oras at pagod ko sa {subject}.",
  "sat-5": "Sa kabuuan, nasisiyahan ako sa kalidad ng {subject}.",
  /* --------------------------------- Service quality ------------------------------- */
  "qual-1": "Gaano kamaaasahan ang {subject}?",
  "qual-2": "Gaano kabilis tumugon ang {subject}?",
  "qual-3": "Naibibigay ang {subject} sa tamang oras.",
  "qual-4": "Pare-pareho ang kalidad ng {subject} sa bawat transaksyon.",
  "qual-5": "Natutugunan ba ng {subject} ang inaasahan mo?",
  /* ---------------------------------- Accessibility -------------------------------- */
  "acc-1": "Gaano kadali ang paggamit ng {subject}?",
  "acc-2": "Maginhawa ang oras ng serbisyo ng {subject}.",
  "acc-3": "Madali kong nakukuha ang {subject} tuwing kailangan ko.",
  "acc-4": "Madali bang nakukuha ng {stakeholder} ang {subject}?",
  "acc-5": "Gaano kadaling gamitin ng mga taong may kapansanan ang {subject}?",
  "acc-6": "Sa paanong paraan mo karaniwang ginagamit ang {subject}?",
  /* --------------------------------- Communication --------------------------------- */
  "com-1": "Malinaw na naipapaalam sa {stakeholder} ang impormasyon tungkol sa {subject}.",
  "com-2": "Mabilis kong natatanggap ang mga balita tungkol sa {subject}.",
  "com-3": "Sa aling paraan mo karaniwang nababalitaan ang tungkol sa {subject}?",
  "com-4": "Madali bang maintindihan ang impormasyon tungkol sa {subject}?",
  "com-5": "Malinaw ang sagot na nakukuha ko tuwing may tanong ako tungkol sa {subject}.",
  /* --------------------------------- Staff & support ------------------------------- */
  "stf-1": "Gaano kabait at kagaling ang mga kawaning tumutulong sa {subject}?",
  "stf-2": "Alam ng mga kawani ang tungkol sa {subject} kapag nagtatanong ang {stakeholder}.",
  "stf-3": "Agad na inaayos ng mga kawani ang mga problema sa {subject}.",
  "stf-4": "Kumusta ang kabuuang karanasan mo sa mga kawaning tumutulong sa {subject}?",
  /* ------------------------------ Facilities / digital ----------------------------- */
  "fac-1": "Gaano kaganda ang mga pasilidad o paligid para sa {subject}?",
  "fac-2": "Gaano kaganda ang mga online na platapormang ginagamit para sa {subject}?",
  "fac-3": "Madaling gamitin ang mga online na kagamitan para sa {subject}.",
  "fac-4": "Laging magagamit ang mga sistema para sa {subject} tuwing kailangan ko.",
  /* ----------------------------- Process & efficiency ------------------------------ */
  "pro-1": "Mabilis at maayos ang proseso ng pagkuha ng {subject}.",
  "pro-2": "Gaano katagal ka karaniwang naghihintay bago matanggap ang {subject}?",
  "pro-3": "Katanggap-tanggap ang paghihintay sa {subject}.",
  "pro-4": "Ilan ang karaniwang hakbang o pagbisita para matapos ang isang transaksyon sa {subject}?",
  "pro-5": "Malinaw at madaling sundin ang mga kailangan at hakbang para sa {subject}.",
  /* ----------------------------------- Awareness ----------------------------------- */
  "awa-1": "Alam mo ba ang {subject} na makukuha ng {stakeholder}?",
  "awa-2": "Anong mga bahagi ng {subject} ang alam mo na?",
  "awa-3": "Alam ko kung saan magtatanong tungkol sa {subject}.",
  "awa-4": "Gaano kadalas mong ginagamit ang {subject}?",
  /* --------------------------------- Trust & safety -------------------------------- */
  "tru-1": "Gaano mo pinagkakatiwalaan ang {subject} sa paglutas ng mga problema mo?",
  "tru-2": "Panatag ako kapag nakikitungo sa {subject}.",
  "tru-3": "Maingat na pinangangalagaan ang personal na impormasyon ko sa mga transaksyon sa {subject}.",
  /* ---------------------------------- Improvement ---------------------------------- */
  "imp-1": "Anong bahagi ng {subject} ang pinakamahalagang mapabuti?",
  "imp-2": "Ano ang pinakamalaking problema na nararanasan mo sa {subject}?",
  "imp-3": "Anong mungkahi ang maibibigay mo para mapabuti ang {subject}?",
  "imp-4": "Kung may isang bagay kang mababago sa {subject}, ano ito?",
  "imp-5": "Ikuwento ang pinakahuling magandang karanasan mo sa {subject}.",
  "imp-6": "Ikuwento ang isang karanasan mo sa {subject} na hindi mo nagustuhan.",
  "imp-7": "Anong iba pang {subject} ang gusto mong makita sa hinaharap?",
  /* -------------------------------- Recommendation -------------------------------- */
  "rec-1": "Gaano kalaki ang tsansa na maipapayo mo ang {subject} sa ibang {stakeholder}?",
  "rec-2": "Hihikayatin ko ang ibang {stakeholder} na gamitin ang {subject}.",
  "rec-3": "Gagamitin mo pa ba ang {subject} sa hinaharap?",
  /* ---------------------------------- Comparative ---------------------------------- */
  "cmp-1": "Kung ihahambing sa nakaraang taon, bumuti ang {subject}.",
  "cmp-2": "Kung ihahambing sa ibang katulad na institusyon, paano mo susuriin ang {subject}?",
  /* ------------------------------------ General ------------------------------------ */
  "beh-1": "Naaangkop ang {subject} sa mga pangangailangan mo bilang {stakeholderOne}.",
  "beh-2": "Kailan mo huling ginamit o natanggap ang {subject}?",
  "beh-3": "Sa karaniwan, ilang minuto ang ginugugol mo sa isang transaksyon sa {subject}?",
  "beh-4": "Ano ang dahilan kung bakit patuloy mong ginagamit ang {subject}?",
  "beh-5": "Ano ang magiging dahilan para ihinto mo ang paggamit ng {subject}?",
  "beh-6": "Magdagdag ng iba pang puna o mungkahi tungkol sa {topic}.",
};

/** Simple Tagalog answer options keyed by the English option label. */
export const TAGALOG_OPTION_LABELS: Record<string, string> = {
  "Mobile app": "Aplikasyon sa cellphone",
  "Physical office / counter": "Opisina o harapan",
  "Phone / hotline": "Telepono o hotline",
  "Chat or messaging": "Chat o mensahe",
  Others: "Iba pa",
  "Text / SMS": "Text o SMS",
  "Official website": "Opisyal na website",
  "Printed materials": "Mga nakalimbag na materyales",
  "In person": "Harapan",
  "Phone call": "Tawag sa telepono",
  Excellent: "Napakahusay",
  Good: "Mahusay",
  Fair: "Katamtaman",
  Poor: "Mahina",
  "Very poor": "Napakahina",
  "Under 15 minutes": "Wala pang 15 minuto",
  "15\u201330 minutes": "15\u201330 minuto",
  "30\u201360 minutes": "30\u201360 minuto",
  "1\u20132 hours": "1\u20132 oras",
  "More than 2 hours": "Mahigit 2 oras",
  "More than a day": "Mahigit isang araw",
  "Offered online": "Makukuha online",
  "Offered on-site": "Makukuha sa paaralan",
  "Outreach activities": "Mga pagbisita sa labas",
  "Promotional campaigns": "Mga kampanya at patalastas",
  "None of the above": "Wala sa mga nabanggit",
  Daily: "Araw-araw",
  Weekly: "Linggo-linggo",
  Monthly: "Buwan-buwan",
  "A few times a year": "Ilang beses sa isang taon",
  Rarely: "Bihira",
  Never: "Hindi kailanman",
};

/** Translates one answer option; unknown options (proper nouns) stay unchanged. */
export function tagalogOptionLabel(label: string) {
  return TAGALOG_OPTION_LABELS[label] ?? label;
}

/**
 * The frame library rendered in native Tagalog. Frames without a Tagalog wording
 * (future additions) keep their English text, which the engine then translates
 * through the phrase dictionary as before.
 */
export function tagalogFramePool(): QuestionFrame[] {
  return QUESTION_FRAMES.map((frame) => {
    const text = TAGALOG_FRAME_TEXT[frame.id];
    if (!text) return frame;
    return {
      ...frame,
      text,
      options: frame.options?.map((option) => tagalogOptionLabel(option)),
    };
  });
}

