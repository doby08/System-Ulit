/**
 * Phrase-assisted translation dictionary used by the offline AI engine.
 *
 * NOTE ON SCOPE: OpenAI (when OPENAI_API_KEY is configured) performs full
 * context-aware translation. This dictionary is the deterministic fallback so the
 * multilingual feature still functions offline: it applies whole-phrase stems
 * first (preserving sentence structure and meaning) and then a domain word map.
 * The topic itself is preserved verbatim because it is usually a proper noun
 * phrase (e.g. "University Services") that should not be machine-mangled.
 */

export type PhraseRule = {
  pattern: RegExp;
  /** Literal replacement (with $1, $2 …) or a function receiving the captured groups. */
  replace: string | ((match: string, ...groups: string[]) => string);
};

export const PHRASE_RULES: Record<string, PhraseRule[]> = {
  /**
   * TAGALOG (tl) — every rule yields PURE Tagalog.
   * Sentence frames are rewritten in full and the captured noun phrases are translated
   * through tagalogNoun()/tagalogTopic(), so nothing is left in English except genuine
   * proper nouns. Loanword-heavy phrasings were replaced with native equivalents
   * ("i-rate" → "susuriin", "pag-access" → "paggamit", "komento" → "puna",
   * "rekomendasyon" → "mungkahi", "feedback" → "puna") so generated questions never
   * read as Taglish.
   */
  tl: [
    /* ---- Satisfaction ---- */
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: (_m, s) => `Gaano ka nasisiyahan sa ${tagalogNoun(s)}?` },
    { pattern: /^Overall, how would you rate the quality of (.+?)\?$/i, replace: (_m, s) => `Sa kabuuan, paano mo susuriin ang kalidad ng ${tagalogNoun(s)}?` },
    { pattern: /^Overall, I am satisfied with the quality of (.+?)\.$/i, replace: (_m, s) => `Sa kabuuan, nasisiyahan ako sa kalidad ng ${tagalogNoun(s)}.` },
    { pattern: /^The (.+?) consistently meet my needs and expectations\.$/i, replace: (_m, s) => `Tuloy-tuloy na natutugunan ng ${tagalogNoun(s)} ang aking mga pangangailangan at inaasahan.` },
    { pattern: /^The (.+?) provide good value for the time and effort I invest\.$/i, replace: (_m, s) => `Sulit ang ${tagalogNoun(s)} para sa oras at pagod na aking inilalaan.` },
    /* ---- Service quality ---- */
    { pattern: /^How would you rate the reliability of (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang pagiging maaasahan ng ${tagalogNoun(s)}?` },
    { pattern: /^How would you rate the responsiveness of (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang bilis ng pagtugon ng ${tagalogNoun(s)}?` },
    { pattern: /^(.+?) are delivered within a reasonable time\.$/i, replace: (_m, s) => `Naihahatid ang ${tagalogNoun(s)} sa loob ng makatwirang panahon.` },
    { pattern: /^The quality of (.+?) is consistent across every interaction\.$/i, replace: (_m, s) => `Pantay-pantay ang kalidad ng ${tagalogNoun(s)} sa bawat pakikipag-ugnayan.` },
    { pattern: /^Do (.+?) meet the standards you expect from them\?$/i, replace: (_m, s) => `Natutugunan ba ng ${tagalogNoun(s)} ang mga pamantayang inaasahan mo?` },
    /* ---- Accessibility ---- */
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: (_m, s) => `Gaano kadali ang paggamit o pagkuha ng ${tagalogNoun(s)}?` },
    { pattern: /^How convenient are the operating hours or availability of (.+?)\?$/i, replace: (_m, s) => `Gaano kaginhawa ang oras ng paglilingkod o pagkakaroon ng ${tagalogNoun(s)}?` },
    { pattern: /^I can reach (.+?) without difficulty whenever I need them\.$/i, replace: (_m, s) => `Nagagamit ko ang ${tagalogNoun(s)} nang walang kahirapan sa tuwing kailangan ko.` },
    { pattern: /^Are (.+?) readily available to (.+?)\?$/i, replace: (_m, s, who) => `Madali bang makukuha ng ${tagalogNoun(who)} ang ${tagalogNoun(s)}?` },
    { pattern: /^How would you rate the accessibility of (.+?) for persons with disabilities\?$/i, replace: (_m, s) => `Paano mo susuriin ang pagiging abot-kamay ng ${tagalogNoun(s)} para sa mga taong may kapansanan?` },
    { pattern: /^Through which channel do you usually access (.+?)\?$/i, replace: (_m, s) => `Sa anong paraan mo karaniwang ginagamit ang ${tagalogNoun(s)}?` },
    /* ---- Communication ---- */
    { pattern: /^How clearly is information about (.+?) communicated to (.+?)\?$/i, replace: (_m, s, who) => `Gaano kalinaw ang pagpapahatid ng impormasyon tungkol sa ${tagalogNoun(s)} sa ${tagalogNoun(who)}?` },
    { pattern: /^How quickly do you receive updates regarding (.+?)\?$/i, replace: (_m, s) => `Gaano kabilis kang tumatanggap ng mga balita tungkol sa ${tagalogNoun(s)}?` },
    { pattern: /^Which communication channels do you use to learn about (.+?)\?$/i, replace: (_m, s) => `Anong mga paraan ng pakikipag-ugnayan ang ginagamit mo upang malaman ang tungkol sa ${tagalogNoun(s)}?` },
    { pattern: /^Is the information about (.+?) easy to understand\?$/i, replace: (_m, s) => `Madali bang maunawaan ang impormasyon tungkol sa ${tagalogNoun(s)}?` },
    { pattern: /^I receive a clear response whenever I raise concerns about (.+?)\.$/i, replace: (_m, s) => `Nakakakuha ako ng malinaw na sagot sa tuwing may itinataas akong alalahanin tungkol sa ${tagalogNoun(s)}.` },
    /* ---- Staff & support ---- */
    { pattern: /^How would you rate the courtesy and professionalism of the staff handling (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang kagandahang-asal at kahusayan ng mga kawaning humahawak ng ${tagalogNoun(s)}?` },
    { pattern: /^The staff are knowledgeable when (.+?) ask about (.+?)\.$/i, replace: (_m, who, s) => `May sapat na kaalaman ang mga kawani kapag nagtatanong ang ${tagalogNoun(who)} tungkol sa ${tagalogNoun(s)}.` },
    { pattern: /^Staff resolve concerns related to (.+?) promptly\.$/i, replace: (_m, s) => `Agad na nilulutas ng mga kawani ang mga alalahanin tungkol sa ${tagalogNoun(s)}.` },
    { pattern: /^How would you describe your overall experience with the staff supporting (.+?)\?$/i, replace: (_m, s) => `Paano mo ilalarawan ang iyong kabuuang karanasan sa mga kawaning sumusuporta sa ${tagalogNoun(s)}?` },
    /* ---- Facilities & digital ---- */
    { pattern: /^How would you rate the facilities or environment associated with (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang mga pasilidad o kapaligirang kaugnay ng ${tagalogNoun(s)}?` },
    { pattern: /^How would you rate the digital platforms used for (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang mga digital na platapormang ginagamit para sa ${tagalogNoun(s)}?` },
    { pattern: /^The digital tools used for (.+?) are easy to use\.$/i, replace: (_m, s) => `Madaling gamitin ang mga digital na kagamitan para sa ${tagalogNoun(s)}.` },
    { pattern: /^The digital systems supporting (.+?) are available whenever I need them\.$/i, replace: (_m, s) => `Laging magagamit ang mga digital na sistemang sumusuporta sa ${tagalogNoun(s)} sa tuwing kailangan ko.` },
    /* ---- Process & efficiency ---- */
    { pattern: /^How efficient is the process of availing (.+?)\?$/i, replace: (_m, s) => `Gaano kabilis at kaayos ang proseso ng pagkuha ng ${tagalogNoun(s)}?` },
    { pattern: /^How long do you usually wait before receiving (.+?)\?$/i, replace: (_m, s) => `Gaano katagal ka karaniwang naghihintay bago matanggap ang ${tagalogNoun(s)}?` },
    { pattern: /^The waiting time involved in (.+?) is acceptable\.$/i, replace: (_m, s) => `Katanggap-tanggap ang oras ng paghihintay para sa ${tagalogNoun(s)}.` },
    { pattern: /^How many steps or visits are normally required to complete a transaction involving (.+?)\?$/i, replace: (_m, s) => `Ilan ang karaniwang hakbang o pagbisita na kailangan upang matapos ang isang transaksyong may kinalaman sa ${tagalogNoun(s)}?` },
    { pattern: /^The requirements and procedures for (.+?) are clear and easy to follow\.$/i, replace: (_m, s) => `Malinaw at madaling sundin ang mga kinakailangan at pamamaraan para sa ${tagalogNoun(s)}.` },
    /* ---- Awareness ---- */
    { pattern: /^How aware are you of the (.+?) available to (.+?)\?$/i, replace: (_m, s, who) => `Gaano ka kaalam sa ${tagalogNoun(s)} na makukuha ng ${tagalogNoun(who)}?` },
    { pattern: /^Which aspects of (.+?) are you already aware of\?$/i, replace: (_m, s) => `Anong mga bahagi ng ${tagalogNoun(s)} ang alam mo na?` },
    { pattern: /^I know exactly where to ask questions about (.+?)\.$/i, replace: (_m, s) => `Alam ko kung saan mismo magtatanong tungkol sa ${tagalogNoun(s)}.` },
    { pattern: /^How frequently do you use (.+?)\?$/i, replace: (_m, s) => `Gaano kadalas mong gamitin ang ${tagalogNoun(s)}?` },
    /* ---- Trust & safety ---- */
    { pattern: /^How much do you trust (.+?) to handle your concerns fairly\?$/i, replace: (_m, s) => `Gaano mo pinagkakatiwalaan ang ${tagalogNoun(s)} sa patas na paglutas ng iyong mga alalahanin?` },
    { pattern: /^How safe or secure do you feel when dealing with (.+?)\?$/i, replace: (_m, s) => `Gaano ka kaligtas o kapanatag kapag nakikitungo sa ${tagalogNoun(s)}?` },
    { pattern: /^My personal information is handled responsibly in transactions involving (.+?)\.$/i, replace: (_m, s) => `Maingat na pinangangalagaan ang aking personal na impormasyon sa mga transaksyong may kinalaman sa ${tagalogNoun(s)}.` },
    /* ---- Improvement ---- */
    { pattern: /^What aspect of (.+?) needs the most improvement\?$/i, replace: (_m, s) => `Anong bahagi ng ${tagalogNoun(s)} ang pinakakailangan ng pagpapabuti?` },
    { pattern: /^What is the biggest challenge you experience with (.+?)\?$/i, replace: (_m, s) => `Ano ang pinakamalaking hamon na nararanasan mo sa ${tagalogNoun(s)}?` },
    { pattern: /^What suggestions can you give to improve (.+?)\?$/i, replace: (_m, s) => `Anong mga mungkahi ang maibibigay mo upang mapabuti ang ${tagalogNoun(s)}?` },
    { pattern: /^If you could change one thing about (.+?), what would it be\?$/i, replace: (_m, s) => `Kung may isang bagay kang mababago tungkol sa ${tagalogNoun(s)}, ano ito?` },
    { pattern: /^Describe the most recent positive experience you had with (.+?)\.$/i, replace: (_m, s) => `Ilarawan ang pinakahuling magandang karanasan mo sa ${tagalogNoun(s)}.` },
    { pattern: /^Describe a recent experience with (.+?) that frustrated you\.$/i, replace: (_m, s) => `Ilarawan ang kamakailang karanasan mo sa ${tagalogNoun(s)} na nagpabigat ng iyong loob.` },
    { pattern: /^What additional (.+?) would you like to see offered in the future\?$/i, replace: (_m, s) => `Anong karagdagang ${tagalogNoun(s)} ang nais mong maipagkaloob sa hinaharap?` },
    /* ---- Recommendation ---- */
    { pattern: /^How likely are you to recommend (.+?) to other (.+?)\?$/i, replace: (_m, s, who) => `Gaano kalaki ang posibilidad na maipamungkahi mo ang ${tagalogNoun(s)} sa iba pang ${tagalogNoun(who)}?` },
    { pattern: /^I would encourage other (.+?) to use (.+?)\.$/i, replace: (_m, who, s) => `Hihikayatin ko ang iba pang ${tagalogNoun(who)} na gamitin ang ${tagalogNoun(s)}.` },
    { pattern: /^Would you use (.+?) again in the future\?$/i, replace: (_m, s) => `Gagamitin mo pa ba ang ${tagalogNoun(s)} sa hinaharap?` },
    /* ---- Comparative ---- */
    { pattern: /^Compared to a year ago, (.+?) have improved\.$/i, replace: (_m, s) => `Kung ihahambing sa nakaraang taon, bumuti ang ${tagalogNoun(s)}.` },
    { pattern: /^Compared with similar providers or institutions, how would you rate (.+?)\?$/i, replace: (_m, s) => `Kung ihahambing sa katulad na mga institusyon, paano mo susuriin ang ${tagalogNoun(s)}?` },
    /* ---- Behaviour ---- */
    { pattern: /^How relevant are (.+?) to your needs as (.+?)\?$/i, replace: (_m, s, who) => `Gaano kaangkop ang ${tagalogNoun(s)} sa iyong mga pangangailangan bilang ${tagalogNoun(who, true)}?` },
    { pattern: /^When did you last use or receive (.+?)\?$/i, replace: (_m, s) => `Kailan mo huling ginamit o natanggap ang ${tagalogNoun(s)}?` },
    { pattern: /^On average, how many minutes do you spend on a single interaction involving (.+?)\?$/i, replace: (_m, s) => `Sa karaniwan, ilang minuto ang ginugugol mo sa isang pakikipag-ugnayang may kinalaman sa ${tagalogNoun(s)}?` },
    { pattern: /^What motivates you to keep using (.+?)\?$/i, replace: (_m, s) => `Ano ang nag-uudyok sa iyo na patuloy na gamitin ang ${tagalogNoun(s)}?` },
    { pattern: /^What would make you stop using (.+?)\?$/i, replace: (_m, s) => `Ano ang magpapahinto sa iyo sa paggamit ng ${tagalogNoun(s)}?` },
    { pattern: /^Please add any other comments or recommendations regarding (.+?)\.$/i, replace: (_m, s) => `Magdagdag ng iba pang puna o mungkahi tungkol sa ${tagalogTopic(s)}.` },
    /* ---- Conversational prompts (unstructured interviews) ---- */
    { pattern: /^Tell me about your level of satisfaction with (.+?)\.$/i, replace: (_m, s) => `Ikuwento mo ang iyong antas ng kasiyahan sa ${tagalogNoun(s)}.` },
    { pattern: /^Describe the quality of (.+?) in your own words\.$/i, replace: (_m, s) => `Ilarawan sa sarili mong pananalita ang kalidad ng ${tagalogNoun(s)}.` },
    { pattern: /^Share your assessment of the (.+?) of (.+?)\.$/i, replace: (_m, a, b) => `Ibahagi ang iyong pagtataya sa ${tagalogNoun(a)} ng ${tagalogNoun(b)}.` },
    { pattern: /^Talk me through your assessment of (.+?)\.$/i, replace: (_m, s) => `Ipaliwanag mo nang detalyado ang iyong pagtataya sa ${tagalogNoun(s)}.` },
    { pattern: /^Describe your experience of accessing (.+?)\.$/i, replace: (_m, s) => `Ilarawan ang iyong karanasan sa paggamit ng ${tagalogNoun(s)}.` },
    { pattern: /^Explain how (.+?) (.+?) are, based on your own experience\.$/i, replace: (_m, a, b) => `Ipaliwanag kung gaano ${tagalogWord(a)} ang ${tagalogNoun(b)}, batay sa sariling karanasan mo.` },
    { pattern: /^Elaborate on (.+?)\.$/i, replace: (_m, s) => `Palawakin mo ang tungkol sa ${tagalogNoun(s)}.` },
    { pattern: /^Tell me more about this: (.+?)\?$/i, replace: (_m, s) => `Ikuwento mo pa ang tungkol dito: ${tagalogNoun(s)}?` },
    { pattern: /^In your own words, what are your thoughts on: (.+?)\?$/i, replace: (_m, s) => `Sa sarili mong pananalita, ano ang iyong mga saloobin tungkol sa: ${tagalogNoun(s)}?` },
    /* ---- AI follow-up probes ---- */
    { pattern: /^You answered briefly regarding (.+?)\. Could you tell me more about your experience with (.+?)\?$/i, replace: (_m, a, b) => `Maikli ang iyong sagot tungkol sa ${tagalogNoun(a)}. Maaari mo bang ikuwento pa ang iyong karanasan sa ${tagalogNoun(b)}?` },
    { pattern: /^What is the main reason behind your answer to "(.+?)"\?$/i, replace: (_m, a) => `Ano ang pangunahing dahilan ng iyong sagot sa "${a}"?` },
    { pattern: /^You mentioned a difficulty with (.+?)\. Could you describe one specific situation where you experienced this with (.+?)\?$/i, replace: (_m, a, b) => `Nabanggit mo ang isang kahirapan tungkol sa ${tagalogNoun(a)}. Maaari mo bang ilarawan ang isang tiyak na sitwasyon kung saan naranasan mo ito sa ${tagalogNoun(b)}?` },
    { pattern: /^What would need to change so that the problem you described about (.+?) no longer affects you\?$/i, replace: (_m, a) => `Ano ang dapat magbago upang hindi ka na maapektuhan ng suliraning binanggit mo tungkol sa ${tagalogNoun(a)}?` },
    { pattern: /^You suggested an improvement involving (.+?)\. How urgent is that change compared with other improvements to (.+?)\?$/i, replace: (_m, a, b) => `Nagmungkahi ka ng pagpapabuti tungkol sa ${tagalogNoun(a)}. Gaano kaapurahan ang pagbabagong iyon kumpara sa iba pang pagpapabuti sa ${tagalogNoun(b)}?` },
    { pattern: /^You described something positive about (.+?)\. What exactly made that experience work well for you\?$/i, replace: (_m, a) => `Naglarawan ka ng magandang bagay tungkol sa ${tagalogNoun(a)}. Ano mismo ang naging dahilan ng maayos na karanasang iyon?` },
    { pattern: /^Would you recommend (.+?) to other (.+?) for the reason you mentioned\? Why\?$/i, replace: (_m, a, b) => `Maipapamungkahi mo ba ang ${tagalogNoun(a)} sa iba pang ${tagalogNoun(b)} dahil sa binanggit mong dahilan? Bakit?` },
    { pattern: /^You mentioned (.+?)\. How does that affect your overall satisfaction with (.+?)\?$/i, replace: (_m, a, b) => `Nabanggit mo ang ${tagalogNoun(a)}. Paano ito nakakaapekto sa iyong kabuuang kasiyahan sa ${tagalogNoun(b)}?` },
    { pattern: /^Can you give an example that illustrates your point about (.+?)\?$/i, replace: (_m, a) => `Maaari ka bang magbigay ng halimbawang nagpapaliwanag sa iyong punto tungkol sa ${tagalogNoun(a)}?` },
    /* ---- Generic fallbacks (still produce pure Tagalog) ---- */
    { pattern: /^How would you rate (.+?)\?$/i, replace: (_m, s) => `Paano mo susuriin ang ${tagalogNoun(s)}?` },
    { pattern: /^How clearly (.+?)\?$/i, replace: (_m, s) => `Gaano kalinaw ang ${tagalogNoun(s)}?` },
    { pattern: /^How quickly (.+?)\?$/i, replace: (_m, s) => `Gaano kabilis ang ${tagalogNoun(s)}?` },
    { pattern: /^How long (.+?)\?$/i, replace: (_m, s) => `Gaano katagal ang ${tagalogNoun(s)}?` },
    { pattern: /^How many (.+?)\?$/i, replace: (_m, s) => `Ilan ang ${tagalogNoun(s)}?` },
    { pattern: /^How much (.+?)\?$/i, replace: (_m, s) => `Gaano karami ang ${tagalogNoun(s)}?` },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: (_m, adj, s) => `Kumusta ang ${tagalogNoun(s)} sa usapin ng ${tagalogWord(adj)}?` },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: (_m, adj, s) => `Kumusta ang ${tagalogNoun(s)} sa usapin ng ${tagalogWord(adj)}?` },
    { pattern: /^What (.+?)\?$/i, replace: (_m, s) => `Ano ang ${tagalogNoun(s)}?` },
    { pattern: /^Which (.+?)\?$/i, replace: (_m, s) => `Alin ang ${tagalogNoun(s)}?` },
    { pattern: /^Would you (.+?)\?$/i, replace: (_m, s) => `Gusto mo bang ${tagalogNoun(s)}?` },
    { pattern: /^Do (.+?)\?$/i, replace: (_m, s) => `Natutugunan ba ang ${tagalogNoun(s)}?` },
    { pattern: /^Are (.+?)\?$/i, replace: (_m, s) => `Naaayon ba ang ${tagalogNoun(s)}?` },
    { pattern: /^Is (.+?)\?$/i, replace: (_m, s) => `Naaayon ba ang ${tagalogNoun(s)}?` },
    { pattern: /^Describe (.+?)\.$/i, replace: (_m, s) => `Ilarawan ang ${tagalogNoun(s)}.` },
    { pattern: /^Tell me about (.+?)\.$/i, replace: (_m, s) => `Ikuwento mo ang tungkol sa ${tagalogNoun(s)}.` },
    { pattern: /^Explain (.+?)\.$/i, replace: (_m, s) => `Ipaliwanag ang ${tagalogNoun(s)}.` },
    { pattern: /^Share your (.+?)\.$/i, replace: (_m, s) => `Ibahagi ang ${tagalogNoun(s)}.` },
  ],
  ceb: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Unsa ka kamalipay sa $1?" },
    { pattern: /^Overall, how would you rate the quality of (.+?)\?$/i, replace: "Sa kinatibuk-an, giunsa nimo pag-rate ang kalidad sa $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Giunsa nimo pag-rate ang $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Unsa ka sayon ang pag-access sa $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Unsa ka-$1 ang $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Unsa ka-$1 ang $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Pila ka $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Unsa ang $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Hain ang $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Ilarawan ang $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isulti kanako ang bahin sa $1." },
    { pattern: /^Explain (.+?)\.$/i, replace: "Ipaliwanag ang $1." },
  ],
hil: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Pila ka ka-satisfied sa $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Paano mo i-rating ang $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Pila ka manami ang pag-access sa $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Pila ka-$1 ang $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Pila ka-$1 ang $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Pila ang $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Ano ang $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Diin ang $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Isaysay ang $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isugid sa akon ang parte sa $1." },
  ],
  ilo: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Kasano ti pannakapnek mo iti $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Kasano ti panang-rate mo iti $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Kasano ti kinalaka ti panag-access iti $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Kasano ka-$1 ti $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Kasano ka-$1 dagiti $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Mano ti $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Ania ti $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Ania ti $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Iladawan ti $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isalaysay mo ti maipapan iti $1." },
  ],
};

/** Domain word map applied after phrase rules (meaning-preserving substitutions). */
export const WORD_MAP: Record<string, Record<string, string>> = {
  tl: {
    /* nouns */
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga kawani",
    personnel: "mga kawani",
    employees: "mga kawani",
    information: "impormasyon",
    data: "datos",
    satisfaction: "kasiyahan",
    improvement: "pagpapabuti",
    trust: "tiwala",
    waiting: "paghihintay",
    time: "oras",
    years: "mga taon",
    year: "taon",
    months: "mga buwan",
    weeks: "mga linggo",
    days: "mga araw",
    hours: "mga oras",
    minutes: "minuto",
    facility: "pasilidad",
    facilities: "mga pasilidad",
    equipment: "mga kagamitan",
    classroom: "silid-aralan",
    classrooms: "mga silid-aralan",
    student: "mag-aaral",
    students: "mga mag-aaral",
    faculty: "mga guro",
    teacher: "guro",
    teachers: "mga guro",
    office: "tanggapan",
    offices: "mga tanggapan",
    campus: "kampus",
    university: "unibersidad",
    school: "paaralan",
    process: "proseso",
    procedure: "pamamaraan",
    procedures: "mga pamamaraan",
    requirement: "kinakailangan",
    requirements: "mga kinakailangan",
    standard: "pamantayan",
    standards: "mga pamantayan",
    document: "dokumento",
    documents: "mga dokumento",
    record: "talaan",
    records: "mga talaan",
    transaction: "transaksyon",
    transactions: "mga transaksyon",
    communication: "pakikipag-ugnayan",
    recommendation: "mungkahi",
    recommendations: "mga mungkahi",
    suggestion: "mungkahi",
    suggestions: "mga mungkahi",
    feedback: "puna",
    comment: "puna",
    comments: "mga puna",
    complaint: "reklamo",
    complaints: "mga reklamo",
    concern: "alalahanin",
    concerns: "mga alalahanin",
    need: "pangangailangan",
    needs: "mga pangangailangan",
    expectation: "inaasahan",
    expectations: "mga inaasahan",
    experience: "karanasan",
    environment: "kapaligiran",
    platform: "plataporma",
    platforms: "mga plataporma",
    system: "sistema",
    systems: "mga sistema",
    tool: "kagamitan",
    tools: "mga kagamitan",
    library: "aklatan",
    scholarship: "iskolarship",
    tuition: "matrikula",
    health: "kalusugan",
    safety: "kaligtasan",
    security: "seguridad",
    privacy: "pribasiya",
    cleanliness: "kalinisan",
    problem: "suliranin",
    problems: "mga suliranin",
    issue: "suliranin",
    issues: "mga suliranin",
    answer: "sagot",
    answers: "mga sagot",
    question: "tanong",
    questions: "mga tanong",
    respondent: "sumasagot",
    respondents: "mga sumasagot",
    participant: "kalahok",
    participants: "mga kalahok",
    /* verbs */
    improve: "mapabuti",
    improved: "bumuti",
    improving: "napapabuti",
    recommend: "maipamungkahi",
    rate: "susuriin",
    use: "gamitin",
    using: "paggamit",
    receive: "tumatanggap",
    received: "natanggap",
    /* adjectives / adverbs */
    satisfied: "nasisiyahan",
    dissatisfied: "hindi nasisiyahan",
    accessible: "naaabot",
    available: "magagamit",
    availability: "pagkakaroon",
    easy: "madali",
    difficult: "mahirap",
    clear: "malinaw",
    quickly: "kabilis",
    reliable: "maaasahan",
    responsive: "matugunin",
    efficient: "mabilis at maayos",
    safe: "ligtas",
    secure: "matatag",
    helpful: "matulungin",
    friendly: "magiliw",
    courteous: "magalang",
    professional: "propesyonal",
    knowledgeable: "may sapat na kaalaman",
    relevant: "angkop",
    important: "mahalaga",
    good: "maganda",
    poor: "mahina",
    excellent: "napakahusay",
    fair: "patas",
    slow: "mabagal",
    fast: "mabilis",
    consistent: "pare-pareho",
    timely: "napapanahon",
    reasonable: "makatwiran",
    acceptable: "katanggap-tanggap",
    additional: "karagdagang",
    future: "hinaharap",
    overall: "kabuuan",
    usually: "karaniwan",
    normally: "karaniwan",
    average: "karaniwan",
    specific: "tiyak",
    main: "pangunahin",
    biggest: "pinakamalaki",
    positive: "maganda",
    negative: "hindi maganda",
  },
  ceb: {
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga trabahante",
    information: "impormasyon",
    satisfaction: "katagbawan",
    improvement: "pagpauswag",
    trust: "pagsalig",
    time: "oras",
    facilities: "pasilidad",
    students: "mga estudyante",
    process: "proseso",
  },
  hil: {
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga trabahador",
    information: "impormasyon",
    satisfaction: "kakontento",
    improvement: "pauswag",
    trust: "pagsalig",
    students: "mga estudyante",
  },
  ilo: {
    service: "serbisio",
    services: "dagiti serbisio",
    quality: "kalidad",
    staff: "dagiti trabahador",
    information: "impormasion",
    satisfaction: "pannakapnek",
    improvement: "panagpasayaat",
    trust: "panagtalek",
    students: "dagiti estudiante",
  },
};

/* -------------------------------------------------------------------------- */
/* Tagalog noun-phrase translation (keeps generated questions pure Tagalog)    */
/* -------------------------------------------------------------------------- */

/** Exact multi-word phrases checked before word-by-word mapping. */
export const NOUN_PHRASES: Record<string, Record<string, string>> = {
  tl: {
    "university services": "mga serbisyo ng unibersidad",
    "student services": "mga serbisyong pangmag-aaral",
    "faculty services": "mga serbisyong para sa mga guro",
    "academic services": "mga serbisyong pang-akademiko",
    "library services": "mga serbisyo ng aklatan",
    "health services": "mga serbisyong pangkalusugan",
    "campus facilities": "mga pasilidad ng kampus",
    "university facilities": "mga pasilidad ng unibersidad",
    "school facilities": "mga pasilidad ng paaralan",
    "student portal": "portal ng mag-aaral",
    "student satisfaction": "kasiyahan ng mga mag-aaral",
    "campus security": "seguridad sa kampus",
    "campus cleanliness": "kalinisan ng kampus",
    "internet connection": "koneksyon sa internet",
    "online enrollment": "pagpapatalang pang-online",
    "student welfare": "kapakanan ng mga mag-aaral",
    "financial assistance": "tulong pinansyal",
    "school canteen": "kantina ng paaralan",
    "office staff": "mga kawani ng tanggapan",
  },
};

/** Head words used when a topic is phrased as "X satisfaction with Y". */
const TAGALOG_TOPIC_HEADS: Record<string, string> = {
  satisfaction: "Kasiyahan",
  perception: "Pananaw",
  feedback: "Puna",
  assessment: "Pagtataya",
  evaluation: "Pagtataya",
  experience: "Karanasan",
  view: "Pananaw",
  opinion: "Saloobin",
  attitude: "Saloobin",
  sentiment: "Damdamin",
  insight: "Kaunawaan",
  study: "Pag-aaral",
  survey: "Pagsisiyasat",
  interview: "Panayam",
  analysis: "Pagsusuri",
};

const TAGALOG_ARTICLE = /^(?:the|a|an|our|your|their|my|this|that)\s+/i;
const TAGALOG_TOPIC_PATTERN =
  /^(.*?)\s+(satisfaction|perception|feedback|assessment|evaluation|experience|views?|opinions?|attitudes?|sentiments?|insights?|study|survey|interview|analysis)\s+(?:with|on|about|of|regarding|toward|towards|for)\s+(.+)$/i;

/** Translates one English word with the Tagalog map (unknown words stay verbatim). */
export function tagalogWord(word: string): string {
  const clean = (word ?? "").trim();
  if (!clean) return clean;
  const map = WORD_MAP.tl ?? {};
  const direct = map[clean.toLowerCase()];
  if (direct) return direct;
  if (clean.toLowerCase().endsWith("s")) {
    const singular = map[clean.slice(0, -1).toLowerCase()];
    if (singular) return singular.startsWith("mga ") ? singular : `mga ${singular}`;
  }
  return clean;
}

/**
 * Translates a captured English noun phrase into Tagalog.
 *  1. exact phrase map ("university services" → "mga serbisyo ng unibersidad")
 *  2. head-noun + modifier reversal for 2–3 fully known words ("campus facilities")
 *  3. lower-case word-by-word mapping that leaves Capitalised proper nouns untouched
 */
export function tagalogNoun(phrase: string, singular = false): string {
  const raw = (phrase ?? "")
    .trim()
    .replace(TAGALOG_ARTICLE, "")
    .replace(/[.?!]+$/, "")
    .trim();
  if (!raw) return raw;

  const exact = NOUN_PHRASES.tl?.[raw.toLowerCase()];
  if (exact) return singular ? exact.replace(/^mga\s+/, "") : exact;

  const map = WORD_MAP.tl ?? {};
  const words = raw.split(/\s+/);
  const known = words.map((word) => map[word]);

  if (words.length >= 2 && words.length <= 3 && known.every((value) => typeof value === "string")) {
    const head = String(known[known.length - 1]);
    const modifiers = known.slice(0, -1).join(" ");
    const combined = `${head} ng ${modifiers}`;
    return singular ? combined.replace(/^mga\s+/, "") : combined;
  }

  const translated = words.map((word) => {
    if (/^[A-Z]/.test(word)) return word; // proper noun — keep verbatim
    return map[word.toLowerCase()] ?? word;
  });
  return translated.join(" ");
}

/** Translates a whole topic label ("Student Satisfaction with University Services"). */
export function tagalogTopic(phrase: string): string {
  const raw = (phrase ?? "").trim().replace(/[.?!]+$/, "").trim();
  if (!raw) return raw;
  const match = raw.match(TAGALOG_TOPIC_PATTERN);
  if (match) {
    const head = TAGALOG_TOPIC_HEADS[match[2].toLowerCase().replace(/s$/, "")] ?? "Pagtataya";
    return `${head} ng ${tagalogNoun(match[1])} sa ${tagalogNoun(match[3])}`;
  }
  return tagalogNoun(raw);
}

export type TranslationResult = { text: string; applied: number; strategy: "phrase+word" | "word" | "none" };

/** Applies phrase rules then the word map. Topic nouns are preserved verbatim. */
export function phraseTranslate(text: string, language: string): TranslationResult {
  if (language === "en" || !language) return { text, applied: 0, strategy: "none" };
  const rules = PHRASE_RULES[language];
  if (!rules) return { text, applied: 0, strategy: "none" };

  let output = text;
  let phraseApplied = 0;
  for (const rule of rules) {
    if (rule.pattern.test(output)) {
      output =
        typeof rule.replace === "string"
          ? output.replace(rule.pattern, rule.replace)
          : output.replace(
              rule.pattern,
              rule.replace as (substring: string, ...args: unknown[]) => string,
            );
      phraseApplied = 1;
      break;
    }
  }

  const words = WORD_MAP[language];
  let wordApplied = 0;
  if (words) {
    output = output.replace(/\b([A-Za-z]+)\b/g, (match) => {
      const replacement = words[match.toLowerCase()];
      if (!replacement) return match;
      wordApplied += 1;
      return replacement;
    });
  }

  const strategy: TranslationResult["strategy"] =
    phraseApplied || wordApplied ? (phraseApplied && wordApplied ? "phrase+word" : phraseApplied ? "phrase+word" : "word") : "none";
  return { text: output, applied: phraseApplied + wordApplied, strategy };
}

export function supportedTranslationLanguages() {
  return Object.keys(PHRASE_RULES);
}