/* Korean given-name data for the Korean Name Generator.
   - HANJA: characters actually used in Korean given names (인명용 한자), with plain-English dictionary meanings.
   - SYN: everyday English words → meaning tags.
   - NATIVE: pure-Korean (순우리말) given names.
   - NATURAL: real, common two-syllable given names, used to keep suggestions natural.
   Also exposes HANJA_NAMES.suggest(text, opts) so the page and tests share one engine. */
(function (G) {
  // [hanja, reading, meaning, tags, position (any|first|second), lean (f|m|n), common(1)]
  const RAW = [
    // 서
    ["瑞", "서", "auspicious, a good omen", ["blessing", "luck", "hope"], "first", "n", 1],
    ["緖", "서", "a beginning, the first thread", ["beginning", "new"], "first", "n", 1],
    ["舒", "서", "unfolding, at ease", ["calm", "freedom"], "first", "n"],
    ["書", "서", "books, writing", ["books", "writing", "knowledge"], "first", "n"],
    ["恕", "서", "forgiveness, understanding", ["kindness", "gentle"], "first", "n"],
    ["曙", "서", "daybreak, dawn", ["morning", "light", "hope"], "first", "n"],
    // 민
    ["敏", "민", "quick-minded, sharp", ["wisdom", "quick"], "any", "n", 1],
    ["旻", "민", "the autumn sky", ["sky", "autumn", "vast"], "any", "n", 1],
    ["玟", "민", "a jade-like stone", ["jewel", "precious"], "any", "n"],
    // 지
    ["智", "지", "wisdom", ["wisdom", "knowledge"], "any", "n", 1],
    ["知", "지", "to know, knowledge", ["knowledge", "wisdom", "curious"], "any", "n"],
    ["志", "지", "will, aspiration", ["ambition", "dream", "courage", "steady"], "any", "n"],
    ["祉", "지", "happiness, blessing", ["blessing", "joy"], "any", "n"],
    ["芝", "지", "a fragrant herb", ["nature", "flower"], "any", "f"],
    // 준
    ["俊", "준", "outstanding, talented", ["talent", "excellence", "leader"], "any", "m", 1],
    ["峻", "준", "high and lofty, like a mountain", ["mountain", "ambition", "noble"], "any", "m"],
    ["晙", "준", "bright early morning", ["morning", "light"], "any", "m"],
    ["濬", "준", "deep, profound", ["deep", "wisdom"], "any", "m"],
    ["駿", "준", "a swift, fine horse", ["horse", "quick", "talent"], "any", "m"],
    // 현
    ["賢", "현", "wise and virtuous", ["wisdom", "virtue"], "any", "n", 1],
    ["炫", "현", "bright, shining", ["light", "bright"], "any", "n"],
    ["玄", "현", "deep, profound, dark", ["deep", "night", "mystery"], "any", "n"],
    ["絃", "현", "the string of an instrument", ["music"], "second", "n"],
    ["晛", "현", "sunlight", ["sun", "light"], "second", "n"],
    ["玹", "현", "the shine of jade", ["jewel", "light"], "any", "n"],
    // 윤
    ["允", "윤", "sincere, truly", ["honest", "truth", "faith"], "any", "n", 1],
    ["潤", "윤", "rich, enriching like water", ["abundance", "generous", "water"], "any", "n", 1],
    ["胤", "윤", "an heir, carrying on the family", ["family"], "second", "m"],
    ["玧", "윤", "a jade glow", ["jewel", "precious"], "second", "n"],
    ["昀", "윤", "sunlight", ["sun", "light"], "second", "n"],
    // 하
    ["夏", "하", "summer", ["summer", "sun", "bright"], "first", "n", 1],
    ["河", "하", "river", ["river", "water", "vast"], "first", "n", 1],
    ["霞", "하", "rosy clouds at dawn and dusk", ["sunset", "sky", "morning", "beauty"], "first", "f"],
    ["賀", "하", "celebration", ["joy", "blessing"], "first", "n"],
    // 은
    ["恩", "은", "grace, kindness", ["kindness", "love", "grace", "blessing"], "any", "n", 1],
    ["銀", "은", "silver", ["precious", "moon", "light"], "any", "f"],
    ["殷", "은", "abundant, flourishing", ["abundance"], "any", "n"],
    // 연
    ["姸", "연", "beautiful, lovely", ["beauty", "grace"], "second", "f", 1],
    ["娟", "연", "graceful, elegant", ["grace", "beauty"], "second", "f"],
    ["蓮", "연", "lotus", ["flower", "pure", "nature"], "any", "f"],
    ["然", "연", "natural, just as it is", ["nature", "honest", "calm"], "second", "n"],
    ["硏", "연", "to polish, to study", ["knowledge", "books"], "second", "n"],
    ["淵", "연", "a deep pool", ["deep", "water", "wisdom"], "second", "n"],
    ["燕", "연", "a swallow (the bird)", ["bird", "sky", "spring", "freedom"], "any", "f"],
    // 우
    ["宇", "우", "the universe, a house", ["world", "vast", "sky", "home"], "any", "m", 1],
    ["祐", "우", "help from heaven, blessing", ["blessing", "protect"], "second", "m"],
    ["佑", "우", "to help, to protect", ["protect", "kindness"], "second", "m"],
    ["雨", "우", "rain", ["rain", "water", "nature"], "second", "n"],
    ["優", "우", "excellent, gentle", ["excellence", "gentle", "kindness"], "any", "n"],
    ["友", "우", "friend", ["friend"], "second", "n"],
    ["旴", "우", "the rising sun", ["sun", "morning"], "second", "m"],
    ["羽", "우", "feathers, wings", ["bird", "sky", "freedom"], "second", "n"],
    // 진
    ["眞", "진", "true, real", ["truth", "honest", "pure"], "any", "n", 1],
    ["珍", "진", "precious, rare", ["precious", "jewel"], "any", "n"],
    ["鎭", "진", "to guard, to keep steady", ["protect", "steady", "calm"], "any", "m"],
    ["辰", "진", "a star, the dragon sign", ["star", "dragon", "sky"], "any", "n"],
    ["進", "진", "to move forward", ["growth", "future", "courage"], "any", "m"],
    // 수
    ["秀", "수", "outstanding, beautiful", ["excellence", "beauty", "talent"], "any", "n", 1],
    ["洙", "수", "a riverside", ["river", "water"], "any", "m"],
    ["守", "수", "to guard, to protect", ["protect", "loyalty", "family"], "any", "m"],
    ["壽", "수", "long life", ["health", "eternal"], "any", "m"],
    ["修", "수", "to cultivate, to study", ["knowledge", "virtue", "growth"], "any", "n"],
    ["樹", "수", "tree", ["tree", "nature", "growth"], "any", "n"],
    // 아
    ["雅", "아", "elegant, refined", ["grace", "art", "beauty"], "second", "f", 1],
    ["娥", "아", "lovely; the moon goddess", ["moon", "beauty"], "second", "f"],
    ["芽", "아", "a sprout, a new bud", ["growth", "spring", "new"], "second", "f"],
    // 유
    ["柔", "유", "gentle, soft", ["gentle", "calm", "kindness"], "any", "f"],
    ["裕", "유", "abundant, generous", ["abundance", "generous"], "any", "n", 1],
    ["宥", "유", "forgiving, big-hearted", ["kindness", "generous"], "any", "n"],
    ["悠", "유", "unhurried, far-reaching", ["calm", "freedom", "eternal"], "any", "n"],
    // 호
    ["浩", "호", "vast, like great waters", ["vast", "ocean", "freedom"], "any", "m", 1],
    ["昊", "호", "the wide sky", ["sky", "vast"], "any", "m"],
    ["晧", "호", "bright, clear light", ["light", "bright", "pure"], "any", "m"],
    ["虎", "호", "tiger", ["tiger", "courage", "strength"], "second", "m"],
    ["護", "호", "to protect", ["protect"], "second", "m"],
    ["好", "호", "good, to like", ["love", "joy"], "second", "n"],
    ["湖", "호", "lake", ["water", "calm", "nature"], "second", "m"],
    // 원
    ["元", "원", "origin, the first, chief", ["beginning", "leader"], "any", "n", 1],
    ["媛", "원", "a noble young woman", ["grace", "beauty", "noble"], "second", "f"],
    ["源", "원", "a source, a spring of water", ["beginning", "water"], "second", "n"],
    ["園", "원", "garden", ["garden", "flower", "nature"], "second", "n"],
    ["願", "원", "a wish", ["hope", "dream"], "second", "n"],
    ["圓", "원", "round, whole, complete", ["harmony", "peace"], "second", "n"],
    ["遠", "원", "far, far-reaching", ["freedom", "travel", "vast"], "second", "n"],
    // 혜
    ["慧", "혜", "wisdom, insight", ["wisdom"], "any", "f", 1],
    ["惠", "혜", "kindness, grace", ["kindness", "blessing", "generous"], "any", "f"],
    // 소
    ["昭", "소", "bright, clear", ["light", "bright"], "first", "f"],
    ["素", "소", "plain, pure, simple", ["pure", "honest", "simple"], "first", "f"],
    ["笑", "소", "smile, laughter", ["smile", "joy"], "first", "f"],
    ["韶", "소", "beautiful music (an ancient melody)", ["music", "beauty"], "first", "f"],
    // 다, 채, 예
    ["多", "다", "many, plenty", ["abundance", "joy"], "first", "f", 1],
    ["彩", "채", "colour, brilliance", ["art", "creative"], "first", "f", 1],
    ["藝", "예", "art, skill", ["art", "talent", "creative"], "first", "n", 1],
    ["睿", "예", "wise, far-seeing", ["wisdom", "future"], "first", "n"],
    ["譽", "예", "honour, a good name", ["success", "noble"], "first", "n"],
    ["禮", "예", "courtesy, respect", ["respect", "kindness", "virtue"], "first", "n"],
    // 린
    ["璘", "린", "the glow of jade", ["jewel", "light"], "second", "f"],
    ["潾", "린", "clear, sparkling water", ["water", "pure"], "second", "f"],
    ["麟", "린", "the qilin, a mythical beast of good omen", ["magic", "noble", "luck"], "second", "n"],
    // 온
    ["溫", "온", "warm, gentle", ["warmth", "kindness", "gentle"], "second", "n"],
    ["穩", "온", "calm, settled", ["calm", "peace", "steady"], "second", "n"],
    // 도, 시
    ["道", "도", "the way, a path", ["way", "truth", "wisdom", "travel"], "first", "m", 1],
    ["燾", "도", "to shine over, to shelter", ["light", "protect"], "first", "m"],
    ["始", "시", "a beginning", ["beginning", "new"], "first", "n"],
    ["詩", "시", "poetry", ["writing", "art", "books"], "first", "n"],
    ["時", "시", "time, the right moment", ["time"], "first", "n"],
    // 건, 태, 승, 재
    ["健", "건", "healthy, strong", ["health", "strength"], "first", "m"],
    ["建", "건", "to build, to establish", ["build", "leader", "future"], "first", "m"],
    ["乾", "건", "heaven, the sky", ["sky", "strength"], "first", "m"],
    ["泰", "태", "great, peaceful", ["peace", "vast", "calm"], "first", "m", 1],
    ["太", "태", "great, grand", ["vast"], "first", "m"],
    ["承", "승", "to carry on a legacy", ["family", "loyalty"], "first", "m"],
    ["勝", "승", "victory", ["victory", "success", "courage"], "first", "m"],
    ["昇", "승", "to rise, like the sun", ["growth", "hope", "sun"], "first", "m"],
    ["才", "재", "talent", ["talent", "creative"], "first", "m"],
    // 성
    ["誠", "성", "sincerity", ["honest", "faith", "truth"], "any", "m"],
    ["星", "성", "star", ["star", "night", "sky"], "any", "n"],
    ["聖", "성", "holy, wise", ["noble", "pure"], "any", "m"],
    ["成", "성", "to achieve, to complete", ["success", "growth"], "any", "m"],
    ["晟", "성", "bright, brilliant", ["light", "bright"], "any", "m"],
    // 주
    ["柱", "주", "a pillar", ["strength", "steady", "protect"], "any", "m"],
    ["珠", "주", "pearl", ["jewel", "precious", "ocean"], "any", "f"],
    ["宙", "주", "the universe, space", ["star", "world", "vast"], "any", "n"],
    // 동, 규, 상
    ["東", "동", "east, where the sun rises", ["sun", "morning", "beginning"], "first", "m"],
    ["奎", "규", "the star of literature", ["star", "writing", "knowledge"], "any", "m"],
    ["圭", "규", "a jade tablet of honour", ["noble", "jewel"], "any", "m"],
    ["祥", "상", "auspicious, fortunate", ["luck", "blessing"], "any", "m"],
    // 영
    ["英", "영", "a flower; outstanding, brave", ["flower", "excellence", "courage"], "any", "n"],
    ["永", "영", "eternal, long-lasting", ["eternal", "faith", "loyalty"], "any", "n"],
    ["榮", "영", "glory, to flourish", ["success", "growth"], "any", "n"],
    ["映", "영", "to reflect, to shine", ["light", "art"], "any", "n"],
    ["瑛", "영", "the glow of jade", ["jewel", "light"], "any", "f"],
    ["泳", "영", "to swim", ["swim", "water", "ocean"], "any", "m"],
    // 희
    ["喜", "희", "joy", ["joy", "smile"], "any", "f"],
    ["熙", "희", "bright, glorious", ["light", "bright", "success"], "any", "n"],
    ["希", "희", "hope", ["hope", "dream"], "any", "n"],
    // 경
    ["慶", "경", "celebration, a blessing", ["joy", "blessing"], "any", "n"],
    ["敬", "경", "respect", ["respect", "virtue"], "any", "n"],
    ["景", "경", "scenery, a bright view", ["nature", "light"], "any", "n"],
    ["炅", "경", "shining, bright", ["light", "bright"], "any", "n"],
    ["瓊", "경", "precious jade", ["jewel", "precious"], "any", "f"],
    // 정
    ["貞", "정", "faithful, upright", ["loyalty", "pure", "faith"], "any", "f"],
    ["靜", "정", "quiet, still", ["calm", "quiet"], "any", "f"],
    ["晶", "정", "crystal, sparkling", ["jewel", "light", "pure"], "any", "f"],
    ["正", "정", "right, upright", ["justice", "honest", "truth"], "any", "m"],
    ["靖", "정", "peaceful, at ease", ["peace", "calm"], "any", "n"],
    // 선, 인, 나, 율, 이
    ["善", "선", "good, kind", ["kindness", "virtue"], "first", "n"],
    ["璿", "선", "beautiful jade", ["jewel", "precious"], "first", "n"],
    ["仁", "인", "humaneness, benevolence", ["kindness", "love", "virtue"], "any", "n"],
    ["娜", "나", "graceful, delicate", ["grace", "beauty"], "any", "f"],
    ["律", "율", "rhythm, law", ["music", "harmony", "justice"], "second", "n"],
    ["怡", "이", "joyful, at ease", ["joy", "calm"], "first", "f"],
    // 빈, 찬, 훈, 혁, 후, 환, 욱, 웅, 운
    ["彬", "빈", "refined, well-balanced", ["grace", "harmony"], "second", "n"],
    ["燦", "찬", "brilliant, dazzling", ["light", "bright"], "second", "m"],
    ["勳", "훈", "merit, achievement", ["success", "courage"], "second", "m"],
    ["薰", "훈", "fragrance, a warm influence", ["warmth", "kindness"], "second", "m"],
    ["赫", "혁", "radiant, glorious", ["light", "success", "strength"], "second", "m"],
    ["厚", "후", "generous, warm-hearted", ["generous", "kindness", "warmth"], "second", "m"],
    ["煥", "환", "shining, brilliant", ["light", "bright"], "second", "m"],
    ["旭", "욱", "the rising sun", ["sun", "morning", "growth"], "second", "m"],
    ["昱", "욱", "bright sunlight", ["light", "sun"], "second", "m"],
    ["雄", "웅", "mighty, heroic", ["courage", "strength"], "second", "m"],
    ["韻", "운", "rhyme, lingering charm", ["music", "grace"], "second", "n"],
    // 범, 석, 림, 해, 강, 용, 효, 세, 설, 명, 가, 보, 슬, 안, 한
    ["帆", "범", "a sail", ["travel", "freedom", "ocean"], "first", "m"],
    ["範", "범", "a model, an example", ["leader", "virtue"], "first", "m"],
    ["碩", "석", "great, eminent in learning", ["wisdom", "knowledge"], "any", "m"],
    ["林", "림", "forest", ["forest", "nature", "tree"], "second", "f"],
    ["海", "해", "the sea", ["ocean", "water", "vast"], "first", "n"],
    ["康", "강", "healthy, at ease", ["health", "peace"], "first", "m"],
    ["剛", "강", "firm, strong", ["strength", "steady"], "first", "m"],
    ["江", "강", "river", ["river", "water"], "first", "m"],
    ["勇", "용", "courage", ["courage", "strength"], "first", "m"],
    ["龍", "용", "dragon", ["dragon", "strength", "ambition"], "first", "m"],
    ["孝", "효", "devotion to one's parents", ["family", "love"], "first", "n"],
    ["世", "세", "the world, a generation", ["world", "vast"], "first", "n"],
    ["雪", "설", "snow", ["winter", "pure"], "first", "f"],
    ["明", "명", "bright, clear", ["light", "bright", "wisdom"], "first", "m"],
    ["佳", "가", "beautiful, fine", ["beauty", "kindness"], "first", "f"],
    ["嘉", "가", "good, praiseworthy", ["joy", "blessing", "virtue"], "first", "f"],
    ["寶", "보", "treasure", ["precious", "jewel"], "first", "n"],
    ["保", "보", "to protect, to keep safe", ["protect", "safe"], "first", "n"],
    ["瑟", "슬", "a Korean zither, a stringed instrument", ["music"], "second", "f"],
    ["安", "안", "peace, safety", ["peace", "safe", "home", "calm"], "second", "n"],
    ["翰", "한", "a writing brush, letters", ["writing", "books"], "second", "m"]
  ];
  const HANJA = RAW.map(([h, k, m, tags, pos, g, c]) => ({ h, k, m, tags, pos, g, c: c ? 1 : 0 }));

  // Everyday English → tags. A word may appear under several tags.
  const SYN_SRC = {
    ocean: "ocean oceans sea seas seaside wave waves beach beaches surf surfing surfer sail sailing sailor marine tide tides island islands coast coastal shore diving diver swim swimming swimmer dolphin dolphins whale whales mermaid blue",
    swim: "swim swimming swimmer diving diver",
    water: "water waters lake lakes pond stream streams fountain flow flowing swim swimming rain",
    river: "river rivers creek brook",
    rain: "rain rainy raindrop raindrops storm storms",
    sky: "sky skies heaven heavens heavenly cloud clouds cloudy fly flying flight bird birds wings wing air",
    bird: "bird birds wings wing fly flying feather feathers",
    star: "star stars starry starlight galaxy galaxies cosmos cosmic astronomy space universe constellation",
    moon: "moon moonlight lunar moonlit",
    night: "night nights nighttime midnight owl dark darkness evening",
    sun: "sun sunny sunshine sunlight sunrise solar sunflower",
    morning: "morning mornings dawn sunrise early daybreak breakfast coffee",
    sunset: "sunset sunsets dusk twilight",
    light: "light lights bright brightness brilliant shine shining shiny glow glowing radiant radiance sparkle sparkling sparkly luminous gleam vivid sunshine sunny",
    summer: "summer summers summertime",
    spring: "spring springtime bud buds sprout sprouts",
    autumn: "autumn harvest",
    winter: "winter snow snowy snowflake snowflakes frost ice",
    nature: "nature natural outdoors outdoor outdoorsy wild wilderness earth green plant plants hike hiking hiker camping animal animals leaf leaves",
    tree: "tree trees wood oak pine roots",
    forest: "forest forests woods jungle",
    flower: "flower flowers floral bloom blooming blossom blossoms rose roses lotus orchid petal petals lily",
    garden: "garden gardens gardening gardener",
    mountain: "mountain mountains hill hills peak peaks climb climbing climber summit cliff",
    calm: "sleep sleeping nap naps cozy calm calmness serene serenity tranquil tranquility still stillness relaxed relax relaxing chill mellow quiet patient patience slow zen meditation meditate yoga peaceful",
    quiet: "quiet quietly silence silent shy introvert introverted reserved",
    peace: "peace peaceful harmony safe",
    gentle: "gentle gently soft softly tender delicate mild sweet",
    kindness: "kind kindness nice caring care compassion compassionate empathy empathetic considerate thoughtful helpful humane forgive forgiving good",
    love: "love loved loving lover beloved adore heart hearts romantic romance affection affectionate cherish",
    warmth: "warm warmth warmhearted cozy cosy hug hugs comfort comforting",
    family: "family families mom mum mother mothers dad father fathers parents parent sister sisters brother brothers siblings grandma grandmother grandpa grandfather kid kids children child son daughter ancestors heritage",
    home: "home house homey household",
    friend: "dog dogs puppy puppies friend friends friendly friendship buddy companion social",
    loyalty: "dog dogs puppy puppies loyal loyalty devoted devotion faithful committed dependable reliable trustworthy",
    faith: "faith trust believe belief prayer pray god spiritual",
    protect: "protect protective protector guard guardian shield defend defender safety shelter",
    safe: "safe safety secure",
    strength: "strong strength strongest power powerful mighty tough sturdy athletic athlete muscle gym fit fitness",
    courage: "brave bravery courage courageous fearless bold boldness daring dare hero heroic warrior fighter fight lion lions",
    steady: "steady stable solid grounded consistent persistent persevere perseverance resilient resilience stubborn determined determination patient",
    leader: "leader leaders leadership lead leading captain chief boss king queen ruler pioneer",
    ambition: "ambition ambitious driven goal goals aspire aspiration motivated hustle hardworking",
    success: "success successful achieve achievement glory famous fame excel accomplished",
    victory: "victory victorious champion champions win wins winning winner",
    wisdom: "wise wisdom smart clever intelligent intelligence genius brain brainy sage insight insightful thoughtful philosophical philosophy logical sharp",
    quick: "quick fast speedy",
    knowledge: "code coding programmer programming developer computer computers math maths knowledge learn learning learner study studying student scholar science scientist research curious curiosity teacher teach teaching nerd nerdy",
    curious: "curious curiosity",
    books: "book books bookworm library libraries reading reader read literature novel novels",
    writing: "write writer writing words poem poems poetry poet story stories journal author",
    art: "art arts artist artistic paint painting painter draw drawing design designer color colors colour colours colorful colourful photography craft crafts",
    creative: "creative creativity imagine imagination imaginative original inventive unique quirky",
    music: "music musical musician sing singing singer song songs melody melodies piano guitar violin rhythm dance dancing dancer band",
    harmony: "harmony harmonious balance balanced unity together",
    joy: "loud noisy chaotic silly goofy crazy game games gaming gamer play sunshine joy joyful happy happiness cheerful cheer fun funny laugh laughing laughter playful glad delight delightful bubbly giggle party",
    smile: "smile smiles smiling grin laugh laughter",
    hope: "hope hopeful optimism optimistic wish wishes",
    dream: "dream dreams dreamer dreamy dreaming",
    future: "future tomorrow progress forward ahead",
    new: "new fresh renew modern",
    beginning: "beginning begin start origin origins source newborn",
    growth: "grow growing growth improve rising rise",
    blessing: "bless blessed blessing blessings grateful gratitude thankful miracle",
    luck: "luck lucky fortune fortunate auspicious prosperity prosperous",
    abundance: "abundance abundant rich wealth wealthy plenty food foodie eat eating cook cooking baking pizza snacks",
    generous: "generous generosity giving sharing share",
    pure: "pure purity clean innocent innocence simple simplicity clear",
    simple: "simple simplicity minimal",
    honest: "honest honesty sincere sincerity genuine real authentic",
    truth: "truth true truthful",
    justice: "justice fair fairness righteous",
    virtue: "virtue virtuous moral integrity humble humility modest",
    respect: "respect respectful polite manners courteous",
    grace: "grace graceful elegant elegance classy refined poise",
    beauty: "beauty beautiful pretty lovely gorgeous cute charming charm",
    precious: "precious treasure treasured valuable rare special",
    jewel: "jewel jewels gem gems jade pearl pearls diamond crystal",
    noble: "noble dignity dignified royal majestic honor honour",
    freedom: "free freedom independent independence wander wanderer wanderlust explore explorer exploring adventure adventurous journey wind",
    travel: "travel traveler traveller travelling traveling trip trips journey explore adventure abroad",
    vast: "vast big wide endless infinite open space universe",
    world: "world global earth universe",
    eternal: "eternal forever everlasting timeless",
    health: "loud noisy chaotic hyper bouncy health healthy vitality energy energetic lively active",
    magic: "magic magical fantasy mystical fairy enchanted",
    mystery: "mystery mysterious enigmatic",
    deep: "deep depth profound",
    way: "way path road",
    dragon: "dragon dragons",
    tiger: "tiger tigers cat cats kitten kittens",
    horse: "horse horses",
    excellence: "excellent excellence best outstanding perfect perfection",
    talent: "talent talented skill skilled skillful gifted",
    build: "build builder building engineer engineering maker code coding programmer developer"
  };
  const PHRASES = {
    "night owl": ["night"], "early bird": ["morning"], "free spirit": ["freedom"], "big heart": ["kindness", "generous"],
    "go getter": ["ambition"], "book worm": ["books"], "never give up": ["steady", "courage"], "down to earth": ["honest", "virtue"],
    "old soul": ["wisdom"], "full of life": ["joy", "health"], "head in the clouds": ["dream", "sky"], "good heart": ["kindness"],
    "sense of humor": ["joy"], "sense of humour": ["joy"], "star gazing": ["star"], "stargazing": ["star"]
  };
  const SYN = {};
  for (const [tag, list] of Object.entries(SYN_SRC)) for (const w of list.split(/\s+/)) (SYN[w] = SYN[w] || []).includes(tag) || SYN[w].push(tag);

  // Pure-Korean names: [hangul, meaning, tags, lean]
  const NATIVE = [
    ["하늘", "sky", ["sky", "vast", "freedom"], "n"], ["바다", "the sea", ["ocean", "water", "vast"], "n"],
    ["아라", "the sea (an old Korean word)", ["ocean", "water"], "f"], ["가람", "river (an old Korean word)", ["river", "water", "nature"], "n"],
    ["한별", "one great star", ["star", "night", "sky"], "n"], ["샛별", "the morning star", ["star", "morning", "hope"], "f"],
    ["한솔", "one great pine tree", ["tree", "nature", "steady"], "n"], ["다온", "all good things come to you", ["blessing", "luck", "joy"], "n"],
    ["하람", "a person cherished by heaven", ["blessing", "sky", "love"], "n"], ["나래", "wings", ["freedom", "bird", "sky", "dream"], "f"],
    ["가온", "the centre, the heart of things", ["harmony", "steady", "leader"], "n"], ["라온", "joyful", ["joy", "smile"], "n"],
    ["이슬", "morning dew", ["morning", "pure", "nature"], "f"], ["보람", "a sense of reward, worth it", ["success", "hope"], "n"],
    ["슬기", "wisdom", ["wisdom", "knowledge"], "f"], ["한결", "steady, always the same", ["steady", "loyalty", "faith", "calm"], "m"],
    ["노을", "the glow of sunset", ["sunset", "sky", "beauty"], "f"], ["마루", "the ridge, the summit", ["mountain", "leader", "ambition"], "m"],
    ["누리", "the world", ["world", "vast", "travel"], "n"], ["단비", "welcome rain after a dry spell", ["rain", "blessing", "kindness"], "f"],
    ["다솜", "love (an old Korean word)", ["love", "kindness", "warmth"], "f"], ["여름", "summer", ["summer", "sun"], "f"],
    ["소리", "sound, voice", ["music"], "f"], ["미르", "dragon (an old Korean word)", ["dragon", "strength", "courage"], "m"],
    ["빛나", "shining", ["light", "bright"], "f"], ["아름", "beautiful", ["beauty", "grace"], "f"],
    ["한빛", "one great light", ["light", "sun", "hope"], "n"], ["새롬", "fresh, new", ["new", "beginning"], "f"],
    ["힘찬", "full of strength", ["strength", "courage", "health"], "m"], ["바름", "upright, right", ["honest", "justice", "truth"], "n"],
    ["그루", "a single tree", ["tree", "nature", "steady"], "n"]
  ];

  // Real, common given names (by lean). Only these and a few safe new pairs are suggested.
  const NATURAL_SRC = {
    f: "서연 서윤 서현 서아 서영 서은 서하 서희 서율 서린 지유 지아 지윤 지은 지현 지수 지혜 지연 지영 지나 지효 지희 지온 하은 하윤 하린 하연 하영 하율 " +
       "민서 민지 민아 민주 민희 수아 수빈 수연 수민 수진 수정 수희 수인 수하 수윤 수안 수린 예은 예린 예원 예서 예진 예나 예지 예빈 예림 예슬 예주 " +
       "채원 채은 채윤 채린 채아 채연 채영 채희 은서 은채 은지 은유 은하 은주 은영 은희 은정 다은 다인 다연 다현 다윤 다희 다슬 소율 소윤 소연 소희 소은 소민 소영 소아 소정 " +
       "유나 유주 유하 유림 유정 윤아 윤서 윤지 윤희 윤정 윤하 아린 아윤 아영 아인 연서 연희 연주 연아 나연 나은 나윤 가은 가윤 가연 가영 가희 " +
       "혜원 혜린 혜진 혜인 혜윤 혜수 혜연 혜정 혜림 이서 세아 세연 세은 세린 세희 주아 주희 주연 주은 시은 시아 시연 정은 정아 정연 정희 " +
       "효린 효주 효정 효진 설아 설희 진희 진아 진주 영서 영은 영주 경은 서경 선아 선영 보영 해린 해원 지해 수정",
    m: "민준 민재 민성 민혁 민우 민규 민호 민찬 민석 민수 서준 서후 도윤 도현 도훈 도영 도율 도진 도하 예준 예성 예찬 시우 시후 시원 시훈 주원 주호 " +
       "하준 하민 하진 지호 지후 지훈 지환 지성 지한 지웅 지혁 지욱 준우 준서 준혁 준호 준영 준희 준수 준성 건우 건희 건호 현우 현준 현서 현성 현석 현수 현민 현욱 " +
       "우진 우현 우빈 우성 선우 선호 유준 유찬 정우 정민 정훈 정현 정호 정환 승우 승현 승민 승준 승훈 승호 승원 승환 은우 은찬 은호 은성 윤우 윤호 윤재 윤성 이준 " +
       "수호 수혁 재윤 재민 재원 재현 재훈 재성 재준 재호 재영 재혁 태윤 태민 태현 태준 태호 태성 태훈 태영 동현 동민 동훈 동하 동욱 동건 동원 동준 동진 " +
       "성민 성현 성준 성훈 성호 성우 성진 성빈 상우 상민 상현 상훈 상준 상원 상윤 영준 영민 영훈 영호 영진 영우 원준 원우 원호 용준 용현 용호 범준 범수 범석 석진 석현 석훈 " +
       "규민 규현 경민 경호 경준 진우 진혁 진호 진영 인호 인성 인우 강민 강현 세훈 세준 명준 해준 보현 희찬",
    n: "지우 유진 지안 지민 서진 연우 시온 서우 시윤 시현 수현 이현 정원 지원 태희 해인 해윤 해진 해온 하온 서온 주안 지운 은수 은율 하윤 유빈 예원"
  };
  const NATURAL = {};
  for (const [g, s] of Object.entries(NATURAL_SRC)) for (const n of s.split(/\s+/)) if (n && !NATURAL[n]) NATURAL[n] = g;

  // Syllables common enough to form a brand-new pair, and words a name must never spell.
  const COMMON_FIRST = new Set("서 지 하 민 수 예 시 도 은 유 채 윤 다 소 주 준 현 승 태 건 우 재 가 세 혜 정 성 영 해 시".split(" "));
  const COMMON_SECOND = new Set("연 윤 우 준 은 아 서 원 민 진 현 율 린 유 호 희 빈 영 인 안 온 하 훈 혁 찬 성 주 후".split(" "));
  const BLOCK = new Set(("사망 지옥 시체 고자 변비 성병 자살 사기 치사 성기 정사 정자 성교 주사 소주 강도 도주 장애 상주 상복 영정 수의 조의 영안 영구 대변 소변 설사 " +
    "기생 하수 하인 노예 영아 유아 우유 수유 유방 성인 신음 지진 해일 유서 유언 유족 시비 원수 수원 경주 미아 연기 연애 유치 정신 주정 은신 예정 수도 " +
    "아우 아이 우아 인주 주유 지주 수주 주인 하주 성주 정원 해수 해안 서해 동해 성희 희롱 도우 우수 우울 우환 환자 수혈 사수 영해 해임 지휘").split(" "));
  BLOCK.delete("정원"); // 정원 (garden) is a common, pleasant name

  // ---- text → tagged words ----
  const NEG = new Set(["not", "never", "no", "don't", "dont", "hate", "hates", "without", "isn't", "aren't", "anti"]);
  const STRIP = /^(i|i'm|im|i am|am|is|are|be|to|a|an|the|my|me|someone|somebody|person|who|that|which|want|wants|wanted|like|would|i'd|id|love|a name|name|means|mean|meaning|of|really|very|so|just|kind of|bit|little|and)\s+/i;
  function lemma(w) {
    if (SYN[w]) return w;
    const tries = [];
    if (w.endsWith("ies")) tries.push(w.slice(0, -3) + "y");
    if (w.endsWith("es")) tries.push(w.slice(0, -2));
    if (w.endsWith("s")) tries.push(w.slice(0, -1));
    if (w.endsWith("ing")) tries.push(w.slice(0, -3), w.slice(0, -3) + "e", w.slice(0, -4));
    if (w.endsWith("ed")) tries.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
    if (w.endsWith("ly")) tries.push(w.slice(0, -2), w.slice(0, -2) + "e");
    if (w.endsWith("ness")) tries.push(w.slice(0, -4));
    if (w.endsWith("ful")) tries.push(w.slice(0, -3));
    if (w.endsWith("ive")) tries.push(w.slice(0, -3), w.slice(0, -3) + "e");
    if (w.endsWith("er")) tries.push(w.slice(0, -2), w.slice(0, -1));
    if (w.endsWith("est")) tries.push(w.slice(0, -3), w.slice(0, -2));
    if (w.endsWith("ity")) tries.push(w.slice(0, -3), w.slice(0, -3) + "e");
    for (const t of tries) if (t.length > 2 && SYN[t]) return t;
    return null;
  }
  function quoteOf(clauseWords, idx) {
    let ws = clauseWords.slice(), i = idx;
    if (ws.length > 6) { const s = Math.max(0, Math.min(i - 2, ws.length - 6)); ws = ws.slice(s, s + 6); i -= s; }
    let q = ws.join(" "), prev;
    do { prev = q; const m = q.match(STRIP); if (m && q.length - m[0].length >= ws[i].length) q = q.slice(m[0].length); } while (q !== prev);
    if (!q.toLowerCase().includes(ws[i].toLowerCase())) q = ws[i];
    return q.replace(/[^\w'’ -]+$/, "");
  }
  function analyze(text) {
    const words = [];
    const clauses = String(text || "").replace(/[“”"]/g, " ").split(/[.,;:!?\n\/()&+]+|\s+(?:and|but|or|yet|so|because|plus|also|while|with|who|though)\s+/i);
    for (const raw of clauses) {
      const cw = raw.trim().split(/\s+/).filter(Boolean);
      const lw = cw.map(w => w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z']/g, "").replace(/'s$/, ""));
      const used = new Set();
      const joined = " " + lw.join(" ") + " ";
      for (const [p, tags] of Object.entries(PHRASES)) {
        const at = joined.indexOf(" " + p + " ");
        if (at < 0) continue;
        const start = joined.slice(0, at + 1).trim().split(" ").filter(Boolean).length, len = p.split(" ").length;
        for (let k = start; k < start + len; k++) used.add(k);
        words.push({ w: p, tags, quote: quoteOf(cw, start) });
      }
      for (let i = 0; i < lw.length; i++) {
        if (used.has(i) || !lw[i]) continue;
        if (NEG.has(lw[i - 1]) || NEG.has(lw[i - 2])) continue;
        const base = lemma(lw[i]); if (!base) continue;
        // "love cats": the object carries the meaning, the verb only a little
        const soft = (base === "love" || base === "adore") && i + 1 < lw.length && lemma(lw[i + 1]);
        words.push({ w: lw[i], tags: SYN[base], quote: quoteOf(cw, i), wt: soft ? 0.5 : 1 });
      }
    }
    // keep one entry per word
    const seen = new Set();
    return words.filter(x => !seen.has(x.w) && seen.add(x.w));
  }

  // ---- scoring ----
  const match = (tags, word) => { let best = 0; tags.forEach((t, i) => { if (word.tags.includes(t)) best = Math.max(best, i === 0 ? 1 : 0.8); }); return best * (word.wt || 1); };
  function suggest(text, opts) {
    opts = opts || {};
    const gender = opts.gender || "u";
    const words = analyze(text).concat(opts.extra || []);
    const tagSet = new Set(); words.forEach(w => w.tags.forEach(t => tagSet.add(t)));
    const scored = HANJA.map(h => { const per = words.map(w => match(h.tags, w)); return { h, per, s: per.reduce((a, b) => a + b, 0) }; });
    const byK = {}; for (const x of scored) (byK[x.h.k] = byK[x.h.k] || []).push(x);
    for (const k in byK) byK[k].sort((a, b) => b.s - a.s || b.h.c - a.h.c);
    const posOk = (x, p) => x.h.pos === "any" || x.h.pos === p;
    const genderOf = (name, a, b) => NATURAL[name] || (a.h.g === b.h.g ? a.h.g : a.h.g === "n" ? b.h.g : b.h.g === "n" ? a.h.g : "n");
    const cands = [];
    for (const k1 in byK) for (const k2 in byK) {
      if (k1 === k2) continue;
      const name = k1 + k2;
      if (BLOCK.has(name) || (opts.surname && opts.surname === k1)) continue;
      const natural = !!NATURAL[name];
      if (!natural && !(COMMON_FIRST.has(k1) && COMMON_SECOND.has(k2))) continue;
      let best = null;
      for (const a of byK[k1]) for (const b of byK[k2]) {
        if (!natural && (!posOk(a, "first") || !posOk(b, "second"))) continue;
        // cover = how much of the description the pair explains; ua/ub = what each syllable adds on its own
        let cover = 0, ua = 0, ub = 0;
        words.forEach((w, i) => { const x = a.per[i], y = b.per[i]; cover += Math.max(x, y); if (x >= y) ua += x; else ub += y; });
        const lean = genderOf(name, a, b);
        let sc = cover + 0.5 * Math.min(ua, ub) + 0.25 * Math.min(a.s, b.s) + 0.12 * (a.h.c + b.h.c) + (natural ? 1.2 : -1.0);
        if (!posOk(a, "first")) sc -= 0.4; if (!posOk(b, "second")) sc -= 0.4;
        if (gender !== "u") sc += lean === gender ? 0.4 : lean === "n" ? 0 : -3;
        const want = gender !== "u" ? gender : lean; // e.g. no 胤 (heir) inside a feminine name
        if (want !== "n") for (const x of [a, b]) if (x.h.g !== "n" && x.h.g !== want) sc -= 2;
        if (!best || sc > best.score) best = { name, a, b, score: sc, cover, lean, natural };
      }
      if (best && best.cover > 0) cands.push(best);
    }
    cands.sort((x, y) => y.score - x.score);
    // diversity: avoid repeating the same syllables back to back
    const out = [], pool = cands.slice(0, 120);
    const sameSet = (x, y) => (x.a.h.h === y.b.h.h && x.b.h.h === y.a.h.h);
    while (pool.length && out.length < 30) {
      let bi = 0, bv = -1e9;
      for (let i = 0; i < pool.length; i++) {
        const c = pool[i], recent = out.slice(-3);
        const rep = recent.filter(o => o.name[0] === c.name[0] || o.name[1] === c.name[1] || o.a.h.h === c.a.h.h || o.b.h.h === c.b.h.h || o.a.h.h === c.b.h.h || o.b.h.h === c.a.h.h).length;
        const v = c.score - 0.7 * rep - (out.some(o => sameSet(o, c)) ? 100 : 0);
        if (v > bv) { bv = v; bi = i; }
      }
      out.push(pool.splice(bi, 1)[0]);
    }
    const names = out.map(c => {
      const parts = [c.a, c.b].map((x, j) => {
        const y = j ? c.a : c.b;
        const hits = words.map((w, i) => ({ w, own: x.per[i] - y.per[i], v: x.per[i] })).filter(o => o.v > 0)
          .sort((p, q) => (q.own >= 0) - (p.own >= 0) || q.v - p.v);
        return { h: x.h.h, k: x.h.k, m: x.h.m, words: hits.map(o => o.w), quote: "" };
      });
      // each syllable quotes a different bit of the description when it can
      const [p0, p1] = parts;
      if (p0.words.length && p1.words.length) {
        let done = false;
        for (const x of p0.words.slice(0, 3)) { for (const y of p1.words.slice(0, 3)) if (x.quote !== y.quote) { p0.quote = x.quote; p1.quote = y.quote; done = true; break; } if (done) break; }
        if (!done) for (const x of p0.words.slice(0, 3)) { for (const y of p1.words.slice(0, 3)) if (x.w !== y.w) { p0.quote = x.w; p1.quote = y.w; done = true; break; } if (done) break; }
        if (!done) p0.quote = p1.quote = p0.words[0].quote;
      } else for (const p of parts) if (p.words.length) p.quote = p.words[0].quote;
      return { name: c.name, lean: c.lean, natural: c.natural, score: +c.score.toFixed(2), parts };
    });
    // pure Korean alternative
    let native = null, nbest = 0;
    for (const [n, m, tags, g] of NATIVE) {
      if (gender !== "u" && g !== "n" && g !== gender) continue;
      const hit = words.filter(w => match(tags, w) > 0);
      const s = words.reduce((a, w) => a + match(tags, w), 0);
      if (s > nbest) { nbest = s; native = { name: n, m, words: hit }; }
    }
    return { words, tags: [...tagSet], names, native };
  }

  // ---- Hangul helpers ----
  const IN = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const VO = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  const FI = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
  const FI_LINK = ["", "g", "kk", "gs", "n", "nj", "nh", "d", "r", "lg", "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s", "ss", "", "j", "ch", "k", "t", "p", "h"];
  const parts = ch => { const c = ch.charCodeAt(0) - 0xac00; return c < 0 || c > 11171 ? null : [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28]; };
  function romanize(word) {
    return [...word].map(ch => { const p = parts(ch); return p ? IN[p[0]] + VO[p[1]] + FI[p[2]] : ch; })
      .join("-").replace(/^./, c => c.toUpperCase());
  }
  const hasFinal = word => { const p = parts(word.slice(-1)); return !!(p && p[2]); };
  function vocative(given) {
    const p = parts(given.slice(-1));
    if (!p || !p[2]) return { ko: given + "야", say: romanize(given).toLowerCase() + "-ya" };
    // the final consonant slides into 아: 서준아 → seo-ju-na
    const syl = [...given].map((ch, i, arr) => { const q = parts(ch); return i < arr.length - 1 || q[2] === 21 ? IN[q[0]] + VO[q[1]] + FI[q[2]] : IN[q[0]] + VO[q[1]]; });
    const link = p[2] === 21 ? "a" : FI_LINK[p[2]] + "a";
    return { ko: given + "아", say: syl.concat(link).join("-") };
  }

  G.HANJA_NAMES = { HANJA, SYN, PHRASES, NATIVE, NATURAL, BLOCK, analyze, suggest, romanize, vocative, hasFinal };
  if (typeof module !== "undefined" && module.exports) module.exports = G.HANJA_NAMES;
})(typeof window !== "undefined" ? window : globalThis);
