/* English → Hangul name transliteration.
   1) Dictionary of common names in the standard Korean loanword spelling.
   2) Rule-based fallback that follows the main conventions of 외래어 표기법. */
window.HANGUL_NAMES = (function () {
  const DICT = {
    // ---- tricky by spelling (Irish, Welsh, Spanish, French, Portuguese) — the ones translation apps get wrong ----
    siobhan:"셔본", niamh:"니브", saoirse:"서샤", aoife:"이파", caoimhe:"퀴바", sinead:"시네이드", eoin:"오언", oisin:"어신", ciaran:"키어런", tadhg:"타이그", roisin:"로신", padraig:"포리그", aisling:"애슐링",
    rhys:"리스", sian:"샨", dafydd:"다비드", joaquin:"호아킨", javier:"하비에르", jorge:"호르헤", jose:"호세", guillermo:"기예르모", ximena:"히메나", xavier:"자비에", guillaume:"기욤", jacques:"자크", francois:"프랑수아",
    hugh:"휴", leigh:"리", geoffrey:"제프리", stephen:"스티븐", graham:"그레이엄", ralph:"랠프", sean:"숀", siobhán:"셔본", joao:"주앙", thiago:"치아구",
    // ---- common first names (male) ----
    james:"제임스", john:"존", robert:"로버트", michael:"마이클", william:"윌리엄", david:"데이비드", richard:"리처드", joseph:"조지프",
    thomas:"토머스", charles:"찰스", christopher:"크리스토퍼", daniel:"대니얼", matthew:"매슈", anthony:"앤서니", mark:"마크", donald:"도널드",
    steven:"스티븐", paul:"폴", andrew:"앤드루", joshua:"조슈아", kenneth:"케네스", kevin:"케빈", brian:"브라이언", george:"조지",
    timothy:"티머시", ronald:"로널드", edward:"에드워드", jason:"제이슨", jeffrey:"제프리", ryan:"라이언", jacob:"제이컵", gary:"게리",
    nicholas:"니컬러스", eric:"에릭", jonathan:"조너선", stephen:"스티븐", larry:"래리", justin:"저스틴", scott:"스콧", brandon:"브랜던",
    benjamin:"벤저민", samuel:"새뮤얼", gregory:"그레고리", alexander:"알렉산더", frank:"프랭크", patrick:"패트릭", raymond:"레이먼드",
    jack:"잭", dennis:"데니스", jerry:"제리", tyler:"타일러", aaron:"에런", jose:"호세", adam:"애덤", nathan:"네이선", henry:"헨리",
    douglas:"더글러스", zachary:"재커리", peter:"피터", kyle:"카일", noah:"노아", ethan:"이선", jeremy:"제러미", walter:"월터",
    christian:"크리스천", keith:"키스", roger:"로저", terry:"테리", austin:"오스틴", sean:"숀", gerald:"제럴드", carl:"칼",
    harold:"해럴드", dylan:"딜런", arthur:"아서", lawrence:"로런스", jordan:"조던", jesse:"제시", bryan:"브라이언", billy:"빌리",
    bruce:"브루스", gabriel:"가브리엘", joe:"조", logan:"로건", alan:"앨런", juan:"후안", albert:"앨버트", willie:"윌리", elijah:"일라이자",
    wayne:"웨인", randy:"랜디", vincent:"빈센트", mason:"메이슨", roy:"로이", ralph:"랠프", bobby:"보비", russell:"러셀", bradley:"브래들리",
    philip:"필립", eugene:"유진", liam:"리엄", oliver:"올리버", lucas:"루커스", leo:"레오", max:"맥스", owen:"오언", luke:"루크", levi:"리바이",
    isaac:"아이작", caleb:"케일럽", hunter:"헌터", connor:"코너", eli:"일라이", aiden:"에이든", jayden:"제이든", carter:"카터", wyatt:"와이엇",
    julian:"줄리언", grayson:"그레이슨", landon:"랜던", colton:"콜턴", cameron:"캐머런", cooper:"쿠퍼", ian:"이언", evan:"에번", chase:"체이스",
    tom:"톰", tim:"팀", ben:"벤", sam:"샘", dan:"댄", mike:"마이크", steve:"스티브", chris:"크리스", matt:"맷", nick:"닉", alex:"알렉스",
    andy:"앤디", tony:"토니", dave:"데이브", jim:"짐", bob:"밥", bill:"빌", rob:"롭", will:"윌", jake:"제이크", josh:"조시", ed:"에드",
    harry:"해리", charlie:"찰리", oscar:"오스카", theo:"시오", felix:"펠릭스", hugo:"위고", louis:"루이", arlo:"알로", finn:"핀", freddie:"프레디",
    archie:"아치", alfie:"앨피", teddy:"테디", ollie:"올리", jamie:"제이미", callum:"칼럼", rory:"로리", ewan:"유언", declan:"데클런",
    marcus:"마커스", simon:"사이먼", martin:"마틴", neil:"닐", graham:"그레이엄", ross:"로스", craig:"크레이그", stuart:"스튜어트",
    // ---- common first names (female) ----
    mary:"메리", patricia:"퍼트리샤", jennifer:"제니퍼", linda:"린다", elizabeth:"엘리자베스", barbara:"바버라", susan:"수전", jessica:"제시카",
    sarah:"세라", sara:"세라", karen:"캐런", lisa:"리사", nancy:"낸시", betty:"베티", margaret:"마거릿", sandra:"샌드라", ashley:"애슐리",
    kimberly:"킴벌리", emily:"에밀리", donna:"도나", michelle:"미셸", carol:"캐럴", amanda:"어맨다", melissa:"멀리사", deborah:"데버라",
    stephanie:"스테퍼니", rebecca:"리베카", laura:"로라", sharon:"섀런", cynthia:"신시아", kathleen:"캐슬린", amy:"에이미", angela:"앤절라",
    shirley:"셜리", anna:"애나", brenda:"브렌다", pamela:"패멀라", emma:"에마", nicole:"니콜", helen:"헬렌", samantha:"서맨사",
    katherine:"캐서린", christine:"크리스틴", debra:"데브라", rachel:"레이철", carolyn:"캐럴린", janet:"재닛", catherine:"캐서린", maria:"마리아",
    heather:"헤더", diane:"다이앤", ruth:"루스", julie:"줄리", olivia:"올리비아", joyce:"조이스", virginia:"버지니아", victoria:"빅토리아",
    kelly:"켈리", lauren:"로런", christina:"크리스티나", joan:"조앤", evelyn:"에벌린", judith:"주디스", megan:"메건", andrea:"앤드리아",
    cheryl:"셰릴", hannah:"해나", jacqueline:"재클린", martha:"마사", gloria:"글로리아", teresa:"테리사", ann:"앤", anne:"앤", sophia:"소피아",
    sophie:"소피", madison:"매디슨", abigail:"애비게일", isabella:"이저벨라", ava:"에이바", mia:"미아", charlotte:"샬럿", amelia:"어밀리아",
    harper:"하퍼", evelyn2:"에벌린", ella:"엘라", lily:"릴리", chloe:"클로이", grace:"그레이스", zoe:"조이", zoey:"조이", natalie:"내털리",
    hazel:"헤이즐", violet:"바이올렛", aurora:"오로라", scarlett:"스칼릿", stella:"스텔라", layla:"레일라", nora:"노라", riley:"라일리",
    lucy:"루시", ellie:"엘리", audrey:"오드리", claire:"클레어", alice:"앨리스", eva:"에바", ivy:"아이비", maya:"마야", ruby:"루비", rose:"로즈",
    kate:"케이트", katie:"케이티", jane:"제인", julia:"줄리아", eleanor:"엘리너", caroline:"캐럴라인", isabel:"이저벨", isabelle:"이자벨",
    daisy:"데이지", poppy:"포피", freya:"프레야", florence:"플로렌스", millie:"밀리", evie:"에비", phoebe:"피비", esme:"에스미", holly:"홀리",
    molly:"몰리", georgia:"조지아", jasmine:"재스민", leah:"리아", naomi:"나오미", erin:"에린", fiona:"피오나", gemma:"젬마", zara:"자라",
    // ---- other languages / international ----
    carlos:"카를로스", luis:"루이스", miguel:"미겔", javier:"하비에르", diego:"디에고", pablo:"파블로", sergio:"세르히오", ana:"아나",
    lucia:"루시아", sofia:"소피아", camila:"카밀라", valentina:"발렌티나", isabella2:"이사벨라", mateo:"마테오", santiago:"산티아고",
    hans:"한스", klaus:"클라우스", lukas:"루카스", jonas:"요나스", leon:"레온", finn2:"핀", greta:"그레타", lena:"레나", mila:"밀라",
    pierre:"피에르", jean:"장", louise:"루이즈", camille:"카미유", chloe2:"클로에", manon:"마농", antoine:"앙투안", nicolas:"니콜라",
    marco:"마르코", luca:"루카", giulia:"줄리아", francesca:"프란체스카", alessandro:"알레산드로", matteo:"마테오", giovanni:"조반니",
    ivan:"이반", dmitri:"드미트리", olga:"올가", natasha:"나타샤", sergei:"세르게이", anastasia:"아나스타샤",
    mohammed:"모하메드", muhammad:"무함마드", ahmed:"아메드", ali:"알리", omar:"오마르", fatima:"파티마", aisha:"아이샤", hassan:"하산",
    yuki:"유키", haruto:"하루토", sakura:"사쿠라", hina:"히나", ren:"렌", aoi:"아오이", kenji:"겐지", naoki:"나오키",
    wei:"웨이", ming:"밍", li:"리", chen:"천", wang:"왕", zhang:"장", liu:"류", yang:"양", huang:"황", zhao:"자오",
    raj:"라지", priya:"프리야", arjun:"아르준", ananya:"아난야", rahul:"라훌", aditya:"아디티아", neha:"네하", vikram:"비크람",
    nguyen:"응우옌", minh:"민", linh:"린", anh:"아인", thao:"타오", huong:"흐엉",
    // ---- surnames often typed ----
    smith:"스미스", johnson:"존슨", williams:"윌리엄스", brown:"브라운", jones:"존스", garcia:"가르시아", miller:"밀러", davis:"데이비스",
    rodriguez:"로드리게스", martinez:"마르티네스", hernandez:"에르난데스", lopez:"로페스", gonzalez:"곤살레스", wilson:"윌슨", anderson:"앤더슨",
    taylor:"테일러", moore:"무어", jackson:"잭슨", white:"화이트", harris:"해리스", clark:"클라크", lewis:"루이스", robinson:"로빈슨",
    walker:"워커", young:"영", allen:"앨런", king:"킹", wright:"라이트", hill:"힐", green:"그린", baker:"베이커", adams:"애덤스", nelson:"넬슨",
    carter2:"카터", mitchell:"미첼", roberts:"로버츠", turner:"터너", phillips:"필립스", campbell:"캠벨", parker:"파커", evans:"에번스",
    edwards:"에드워즈", collins:"콜린스", stewart:"스튜어트", morris:"모리스", murphy:"머피", cook:"쿡", rogers:"로저스", morgan:"모건",
    cooper2:"쿠퍼", peterson:"피터슨", reed:"리드", bailey:"베일리", bell:"벨", kelly2:"켈리", howard:"하워드", ward:"워드", cox:"콕스",
    richardson:"리처드슨", wood:"우드", watson:"왓슨", brooks:"브룩스", bennett:"베넷", gray:"그레이", james2:"제임스", hughes:"휴스",
    price:"프라이스", sanders:"샌더스", myers:"마이어스", long:"롱", ross2:"로스", foster:"포스터", powell:"파월", jenkins:"젠킨스",
    perry:"페리", russell2:"러셀", sullivan:"설리번", fisher:"피셔", henderson:"헨더슨", coleman:"콜먼", simmons:"시먼스", patterson:"패터슨",
    jordan2:"조던", reynolds:"레이놀즈", hamilton:"해밀턴", graham2:"그레이엄", kim:"김", lee:"리", park:"박", choi:"최", jung:"정",
    schmidt:"슈미트", mueller:"뮐러", muller:"뮐러", schneider:"슈나이더", fischer:"피셔", weber:"베버", meyer:"마이어", wagner:"바그너",
    dubois:"뒤부아", martin2:"마르탱", bernard:"베르나르", petit:"프티", rossi:"로시", russo:"루소", ferrari:"페라리", esposito:"에스포지토",
    ivanov:"이바노프", petrov:"페트로프", smirnov:"스미르노프", tanaka:"다나카", suzuki:"스즈키", sato:"사토", watanabe:"와타나베", yamamoto:"야마모토",
    patel:"파텔", brooklyn:"브루클린", wyatt2:"와이엇", kwame:"콰메", gwen:"그웬", alex2:"알렉스", chloe3:"클로이", marta:"마르타", noah2:"노아", singh:"싱", kumar:"쿠마르", sharma:"샤르마", khan:"칸", tran:"쩐", pham:"팜", le:"레"
  };
  // strip numeric suffixes used to keep duplicate keys in the literal above
  const D = {}; for (const k in DICT) { const b = k.replace(/\d+$/, ""); if (!(b in D)) D[b] = DICT[k]; } // 먼저 나온 표기 우선 (martin2·isabella2 같은 변형이 덮어쓰지 않게)

  // ---------- rule engine (follows the main points of 외래어 표기법) ----------
  const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
  const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  const syl = (c, v, j = "") => String.fromCharCode(0xAC00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + JONG.indexOf(j));

  // graphemes → phoneme tokens. Vowel keys: a(ㅐ) ah(ㅏ) e(ㅔ) i(ㅣ) o(ㅗ) u(ㅓ) uu(ㅜ) eo(ㅓ) ei ai oi au ou yu ya yo ye
  const G = [
    ["tion","sh eo n"],["sion","j eo n"],["ough","o"],["augh","o"],["eigh","ei"],["igh","ai"],["chr","k r"],["chl","k l"],
    ["tch","ch"],["sch","sh"],["ck","k"],["ph","f"],["th","th"],["sh","sh"],["ch","ch"],["wh","w"],["qu","k w"],["kn","n"],["wr","r"],["ng","ng"],
    ["ee","i"],["ea","i"],["oo","uu"],["ou","au"],["ow","ow"],["ai","ei"],["ay","ei"],["ey","ey"],["ei","ei"],["oi","oi"],["oy","oi"],["au","o"],["aw","o"],
    ["ie","i"],["eu","yu"],["ew","yu"],["ue","uu"],["ui","i"],["oe","oe"],
    ["a","a"],["e","e"],["i","i"],["o","o"],["u","u"],["y","y"],
    ["b","b"],["c","c"],["d","d"],["f","f"],["g","g"],["h","h"],["j","j"],["k","k"],["l","l"],["m","m"],["n","n"],["p","p"],["q","k"],["r","r"],["s","s"],["t","t"],["v","v"],["w","w"],["x","k s"],["z","z"]
  ];
  const VOWELS = new Set(["a","ah","e","i","o","u","uu","eo","ei","ai","oi","au","ou","yu","ya","yo","ye","ow","ey","oe","y"]);
  const isV = t => t && t.v;

  function tokenize(w) {
    const out = []; let i = 0;
    while (i < w.length) {
      if (i > 0 && w.startsWith("gh", i)) { i += 2; continue; }                 // Hugh, Leigh: silent gh after a vowel
      let hit = null;
      for (const [g, p] of G) if (w.startsWith(g, i)) { hit = [g, p]; break; }
      if (!hit) { i++; continue; }
      const dbl = hit[0].length > 1 || (w[i + 1] === w[i]);                    // digraph or doubled letter
      for (const p of hit[1].split(" ")) out.push({ p, v: VOWELS.has(p), dbl });
      i += hit[0].length;
      if (hit[0].length === 1 && w[i] === hit[0] && !VOWELS.has(hit[1])) i++;   // collapse tt, ll, nn, ss …
    }
    const nV = out.filter(isV).length;
    for (let k = 0; k < out.length; k++) {
      const t = out[k], prev = out[k - 1], next = out[k + 1], last = k === out.length - 1;
      if (t.p === "y") { const on = isV(next); if (on) t.p = "y", t.v = false; else t.p = "i", t.v = true; }
      if (t.p === "ow") t.p = last ? "o" : "au";
      if (t.p === "ey") t.p = last ? "i" : "ei";
      if (t.p === "oe") { if (last) { t.p = "o"; out.splice(k + 1, 0, { p: "i", v: true }); } else t.p = "o"; }
      if (t.p === "c") t.p = (next && /^(e|i|y|ei)$/.test(next.p)) ? "s" : "k";
      if (t.p === "g" && next && /^(e|ei)$/.test(next.p)) t.p = "j";
      if (t.p === "g" && k > 0 && next && /^(i|y)$/.test(next.p)) t.p = "j";
      if (t.p === "h" && last && isV(prev)) { out.splice(k, 1); k--; continue; }  // Hannah, Sarah
    }
    // silent final e lengthens the vowel before a single consonant: Kate, Mike, Steve, Rose, Luke
    const n = out.length;
    if (n >= 3 && out[n - 1].p === "e" && !isV(out[n - 2]) && !out[n - 2].dbl && isV(out[n - 3])) {
      const c = out[n - 2], pv = out[n - 3];
      const L = { a: "ei", i: "ai", o: "o", e: "i", u: /^(l|r|j|ch|s|z)$/.test(c.p) ? "uu" : "yu" };
      if (L[pv.p]) pv.p = L[pv.p];
      if (c.p === "s") c.p = "z";                                                // Rose → 로즈
      out.pop();
    }
    for (let k = 0; k < out.length; k++) {
      const t = out[k], prev = out[k - 1], next = out[k + 1], last = k === out.length - 1;
      if (!t.v) continue;
      const open = next && !next.v && isV(out[k + 2]) && !next.dbl;             // vowel + single consonant + vowel
      if (t.p === "a" && (last || (next && next.p === "r") || nV >= 3)) t.p = "ah";
      if (t.p === "u") t.p = (open || last) ? ((prev && /^(h|y)$/.test(prev.p)) ? "yu" : "uu") : "u";
      if (t.p === "yu" && prev && /^(l|r|j|ch|s|z)$/.test(prev.p)) t.p = "uu";
    }
    // r after a vowel and before a consonant or the end colours the vowel and disappears: Peter, Carl, Mark
    for (let k = 0; k < out.length; k++) if (out[k].p === "r" && isV(out[k - 1]) && !isV(out[k + 1])) {
      const pv = out[k - 1]; pv.p = { a: "ah", ah: "ah", e: "eo", i: "eo", o: "o", u: "eo", uu: "uu", ei: "e-eo", ai: "ai-eo", ou: "o", au: "au-eo", oi: "oi" }[pv.p] || pv.p;
      out.splice(k, 1); k--;
    }
    return out;
  }
  const ONSET = { b:"ㅂ", p:"ㅍ", d:"ㄷ", t:"ㅌ", g:"ㄱ", k:"ㅋ", s:"ㅅ", z:"ㅈ", j:"ㅈ", ch:"ㅊ", sh:"ㅅ", f:"ㅍ", v:"ㅂ", h:"ㅎ", m:"ㅁ", n:"ㄴ", l:"ㄹ", r:"ㄹ", th:"ㅅ", ng:"ㄱ" };
  const CODA = { m:"ㅁ", n:"ㄴ", ng:"ㅇ", l:"ㄹ", p:"ㅂ", t:"ㅅ", k:"ㄱ" };
  const V = { a:"ㅐ", ah:"ㅏ", e:"ㅔ", i:"ㅣ", o:"ㅗ", u:"ㅓ", uu:"ㅜ", eo:"ㅓ", ei:"ㅔㅣ", ai:"ㅏㅣ", oi:"ㅗㅣ", au:"ㅏㅜ", ou:"ㅗ", yu:"ㅠ", ya:"ㅑ", yo:"ㅛ", ye:"ㅖ" };
  const W = { a:"ㅘ", ah:"ㅘ", e:"ㅞ", i:"ㅟ", o:"ㅝ", u:"ㅝ", uu:"ㅜ", eo:"ㅝ", ei:"ㅞㅣ", ai:"ㅘㅣ" };
  const Y = { a:"ㅑ", ah:"ㅑ", e:"ㅖ", i:"ㅣ", o:"ㅛ", u:"ㅕ", uu:"ㅠ", eo:"ㅕ", ei:"ㅖㅣ", ai:"ㅑㅣ", au:"ㅑㅜ", yu:"ㅠ" };
  const LONE = { s:"스", z:"즈", f:"프", v:"브", d:"드", g:"그", b:"브", p:"프", t:"트", k:"크", ch:"치", sh:"시", j:"지", th:"스", h:"흐", m:"므", n:"느", r:"르", w:"우", y:"이", ng:"그" };

  function vowelSyl(onset, vkey, glideC) {
    let map = V[vkey] || "ㅓ", c = ONSET[onset] || "ㅇ";
    if (onset === "w") { map = W[vkey] || map; c = ONSET[glideC] || "ㅇ"; }
    else if (onset === "y") { map = Y[vkey] || map; c = "ㅇ"; }
    else if (onset === "sh" && vkey !== "i" && Y[vkey]) map = Y[vkey];
    const parts = [...map]; let s = "";
    parts.forEach((jm, idx) => { s += syl(idx === 0 ? c : "ㅇ", jm); });
    return s;
  }
  function addCoda(s, coda) {
    if (!s) return s; const last = s.charCodeAt(s.length - 1);
    if (last < 0xAC00 || last > 0xD7A3) return s + coda;
    if ((last - 0xAC00) % 28 !== 0) return s + syl("ㅇ", "ㅡ", coda);
    return s.slice(0, -1) + String.fromCharCode(last + JONG.indexOf(coda));
  }
  const SHORT = new Set(["a","e","i","o","u","eo"]);

  function rules(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return "";
    const t = tokenize(w); let out = ""; let i = 0;
    while (i < t.length) {
      if (t[i].v) { for (const k of t[i].p.split("-")) out += vowelSyl("", k); i++; continue; }
      let j = i; while (j < t.length && !t[j].v) j++;
      const cluster = t.slice(i, j).map(x => x.p), vow = t[j], prevV = isV(t[i - 1]) ? t[i - 1].p : null;
      if (!vow) {                                                                 // word-final consonants
        cluster.forEach((c, k) => {
          if (k === 0 && prevV && /^(m|n|ng|l)$/.test(c)) out = addCoda(out, CODA[c]);
          else if (k === 0 && prevV && /^(p|t|k)$/.test(c) && SHORT.has(prevV)) out = addCoda(out, CODA[c]);
          else out += LONE[c] || "";
        });
        break;
      }
      let onset = cluster[cluster.length - 1], glideC = "";
      let pre = cluster.slice(0, -1);
      if (onset === "w" && pre.length && /^(k|h)$/.test(pre[pre.length - 1])) { glideC = pre.pop(); }   // quick, Gwen, whistle
      pre.forEach((c, k) => {
        if (k === 0 && prevV && /^(m|n|l)$/.test(c)) out = addCoda(out, CODA[c]);
        else if (k === 0 && prevV && c === "ng") { out = addCoda(out, "ㅇ"); out += "그"; }
        else out += LONE[c] || "";
      });
      if (onset === "l" && prevV && !pre.length) out = addCoda(out, "ㄹ");                  // Ella, Helen
      if (onset === "ng" && prevV && !pre.length) out = addCoda(out, "ㅇ");                 // Bingo
      const vk = vow.p.split("-");
      out += vowelSyl(onset, vk[0], glideC);
      if (vk[1]) out += vowelSyl("", vk[1]);
      i = j + 1;
    }
    return out;
  }
  function convert(name) {
    return name.trim().split(/[\s\-]+/).filter(Boolean).map(w => {
      const k = w.toLowerCase().replace(/[^a-z]/g, "");
      return { word: w, hangul: D[k] || rules(w), fromDict: !!D[k] };
    });
  }
  return { convert, rules, dict: D };
})();
