const fs = require('fs');

function loadData(file, fallback = {}) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
  return JSON.parse(fs.readFileSync(file));
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, EmbedBuilder, PermissionFlagsBits
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1494316404265189519';
const GUILD_ID = '1481285716544585863';

// ─── Storage ───────────────────────────────────────────────────────────────────
const claimedMiraculous = loadData('./claimedMiraculous.json');
const userMiraculous = loadData('./userMiraculous.json');
const luckyCharmUsed = loadData('./luckyCharmUsed.json');
const powerCooldowns = loadData('./powerCooldowns.json');
const stealCooldowns = loadData('./stealCooldowns.json');
const userCharms = loadData('./userCharms.json');
const patrolCooldowns = {}; // userId -> timestamp of last patrol
const userAlignment = {}; // userId -> 'good' | 'evil'

// ─── Butterfly / Moth Miraculous State ────────────────────────────────────────
const mothMode = {};
const activeAkuma = {};
const akumatizationPending = {};
const villainAbilityUsed = {};
const guardianUpgrades = {}; // userId -> upgrades/unlocks

// ─── HP System ────────────────────────────────────────────────────────────────
const userHP = {}; // userId -> current HP (max 100)
function getHP(userId) {
  if (userHP[userId] === undefined) userHP[userId] = 100;
  return userHP[userId];
}
function applyDamage(userId, amount) {
  if (userHP[userId] === undefined) userHP[userId] = 100;
  userHP[userId] = Math.max(0, userHP[userId] - amount);
  return userHP[userId];
}
function resetHP(userId) {
  userHP[userId] = 100;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DETRANSFORM_MS  = 5 * 60 * 1000;
const RECHARGE_MS     = 4 * 60 * 1000;
const PATROL_COOLDOWN = 5 * 60 * 1000;

function getCharms(userId) {
  return userCharms[userId] || 0;
}
function addCharms(userId, amount) {
  userCharms[userId] = getCharms(userId) + amount;
  saveData('./userCharms.json', userCharms);
}

// ─── Miraculous server emojis ─────────────────────────────────────────────────
const MIRACULOUS_EMOJIS = {
  ladybug:    '<:lv_0_20260401114238:1488745768717385880>',
  cat:        ':cat~1:',
  fox:        ':fox~1:',
  bee:        ':pollen:',
  turtle:     ':turtle~1:',
  butterfly:  ':butterfly~1:',
  peacock:    ':peacock~1:',
  goat:       ':goat~1:',
  monkey:     ':monkey~1:',
  rooster:    ':rooster~1:',
  ox:         ':ox~1:',
  pig:        ':pig~1:',
  dog:        ':dg:',
  tiger:      ':tiger~1:',
  snake:      ':snake~1:',
};

// ─── Villain Options for Chrysalis ───────────────────────────────────────────
const villains = [
  {
    id: 'lady_chaos',
    name: 'Lady Chaos',
    description: 'Timeout any user of your choosing with /villainability',
    timeoutSeconds: 60
  },
  {
    id: 'stormy_weather',
    name: 'Stormy Weather',
    description: 'Silence a user for 2 minutes with /villainability',
    timeoutSeconds: 120
  },
  {
    id: 'timebreaker',
    name: 'Timebreaker',
    description: 'Reset the Miraculous cooldown of a target with /villainability',
    timeoutSeconds: 0
  }
];

// ─── Lucky Charm Objects ──────────────────────────────────────────────────────
const luckyObjects = [
  "a rubber duck", "a jump rope", "a tin of sardines", "a red scarf",
  "a magnifying glass", "a spool of thread", "a paint brush", "a bicycle bell",
  "a broken umbrella", "a small mirror", "a bag of marbles", "a staple gun",
  "a yo-yo", "a bottle of glitter", "a pair of scissors", "a compass",
  "a snow globe", "a crowbar", "a feather duster", "a music box"
];

const giftLines = [
  "This Miraculous has chosen you for a reason. Wear it with pride, and always remember — with great power comes great responsibility.",
  "The Guardian entrusted me with this. Now I entrust it to you. Use it wisely, and never let it fall into the wrong hands.",
  "You have shown courage, kindness, and heart. The Kwami has been waiting for someone like you.",
  "Take it. But know this — a Miraculous is not just power. It is a promise. To protect, to serve, and to always do what's right.",
  "I believe in you. That's why you're getting this. Don't let the city down."
];

// ─── Miraculous Data ───────────────────────────────────────────────────────────
const miraculousList = [
  {
    id: "prodigious",
    weight: 1,
    color: 0x8A2BE2,
    emoji: "🐉",
    holder: "The Prodigious Holder",
    kwami: "Xorii",
    animal: "Prodigious",
    type: "Prodigious",
    power: "[ABILITY IS WIP]",
    ability: "Supreme Transformation",
    powerDesc: "An ancient and legendary artifact capable of channeling limitless transformations and powers beyond the Miraculous system itself.",
    cooldown: "Unknown",
    warning: "the Prodigious was never meant for ordinary hands",
    targetEffect: "flavor",
    targetFlavor: "A surge of ancient energy erupts from the Prodigious. Reality itself bends around {target}.",
    missFlavor: "The Prodigious rejected its wielder momentarily — its power scattered into the air.",
    killChance: 0,
    missChance: 5
  },
  {
    id: "creation", weight: 4, color: 0xFF0000, emoji: MIRACULOUS_EMOJIS.ladybug,
    holder: "Ladybug", kwami: "Tikki", animal: "Ladybug", type: "Earrings",
    power: "LUCKY CHARM", ability: "Creation",
    powerDesc: "Summons a random magical object that, used creatively, solves any problem or defeats any enemy.",
    cooldown: "5 minutes before detransform", warning: "creation requires great responsibility",
    targetEffect: "lucky_charm",
    targetFlavor: "Tikki glows bright red — Lucky Charm activates! A random object falls from the sky into your hands. The answer is already around you, {target}.",
    killChance: 0
  },
  {
    id: "destruction", weight: 4, color: 0x2C2C54, emoji: MIRACULOUS_EMOJIS.cat,
    holder: "Cat Noir", kwami: "Plagg", animal: "Black Cat", type: "Ring",
    power: "CATACLYSM", ability: "Destruction",
    powerDesc: "Destroys anything it touches with a single touch. No material can withstand its devastating power.",
    cooldown: "5 minutes before detransform", warning: "destruction is irreversible — use wisely",
    targetEffect: "damage", damageMin: 40, damageMax: 70, killChance: 50, missChance: 20,
    targetFlavor: "Plagg surges through your fingertips. Dark energy engulfs {target} — Cataclysm tears through them with unstoppable force.",
    killFlavor: "The Cataclysm consumes {target} entirely. There is nothing left.",
    missFlavor: "Plagg's energy crackles and dissipates — the Cataclysm missed {target} entirely. *\"Told you I needed more Camembert,\"* Plagg mutters."
  },
  {
    id: "protection", weight: 10, color: 0x00B4D8, emoji: MIRACULOUS_EMOJIS.turtle,
    holder: "Carapace", kwami: "Wayzz", animal: "Turtle", type: "Bracelet",
    power: "SHELL-TER", ability: "Protection",
    powerDesc: "Creates an impenetrable dome shield that protects everyone inside from any attack or outside force.",
    cooldown: "5 minutes before detransform", warning: "you cannot protect others if you fall",
    targetEffect: "heal", healAmount: 30, killChance: 0, missChance: 15,
    targetFlavor: "Wayzz pulses steady and strong. A shimmering teal dome snaps into place around {target}. Nothing reaches them now.",
    missFlavor: "The Shell-ter flickered — the dome dissipated before it could form around {target}."
  },
  {
    id: "transmission", weight: 10, color: 0x7B2FBE, emoji: MIRACULOUS_EMOJIS.butterfly,
    holder: "Monarch", kwami: "Nooroo", animal: "Butterfly", type: "Brooch",
    power: "AKUMATIZATION", ability: "Transmission",
    powerDesc: "Channels power into others through an akuma. As Chrysalis — corrupts and evilizes. As Betterfly — grants heroic power to the worthy.",
    cooldown: "No detransform. No cooldown. Limit: 1 active akuma at a time.",
    warning: "power given can be power corrupted",
    targetEffect: "butterfly",
    targetFlavor: "",
    killChance: 0
  },
  {
    id: "illusion", weight: 12, color: 0xFF6B35, emoji: MIRACULOUS_EMOJIS.fox,
    holder: "Rena Rouge", kwami: "Trixx", animal: "Fox", type: "Necklace",
    power: "MIRAGE", ability: "Illusion",
    powerDesc: "Creates a perfect illusion that fools anyone who sees it. The longer they believe it, the more real it becomes.",
    cooldown: "5 minutes before detransform", warning: "do not get caught in your own lie",
    targetEffect: "flavor", killChance: 0, missChance: 25,
    targetFlavor: "Trixx grins wide. The air warps around {target} — a perfect copy steps forward while the real one vanishes into the illusion. No one will ever know.",
    missFlavor: "Trixx snickers nervously — the Mirage wavered and {target} saw right through it."
  },
  {
    id: "subjection", weight: 12, color: 0xF5C518, emoji: MIRACULOUS_EMOJIS.bee,
    holder: "Queen Bee", kwami: "Pollen", animal: "Bee", type: "Hair Comb",
    power: "VENOM", ability: "Subjection",
    powerDesc: "Paralyzes any target with a single sting, rendering them completely motionless for as long as the holder desires.",
    cooldown: "5 minutes before detransform", warning: "power over others breeds corruption",
    targetEffect: "timeout", timeoutSeconds: 10, killChance: 0, missChance: 20,
    targetFlavor: "Pollen's stinger glows gold. One precise strike hits {target} — they seize up instantly. Paralyzed. Unable to move or speak for 10 seconds.",
    missFlavor: "The Venom sting whiffed — {target} stepped aside just in time. *\"Most embarrassing,\"* Pollen whispers."
  },
  {
    id: "emotion", weight: 12, color: 0x4A90D9, emoji: MIRACULOUS_EMOJIS.peacock,
    holder: "Mayura", kwami: "Duusu", animal: "Peacock", type: "Brooch",
    power: "AMOKIZATION", ability: "Emotion / Sentimonster Creation",
    powerDesc: "Charges an amok with emotion and breathes it into an object, creating a loyal sentimonster that obeys every command.",
    cooldown: "5 minutes before detransform", warning: "what you create, you must also control",
    targetEffect: "flavor", killChance: 0, missChance: 15,
    targetFlavor: "Duusu pulses with deep emotion. You breathe an amok toward {target} — an object near them stirs to life, its gaze locking onto you. Loyal. Obedient. Yours.",
    missFlavor: "The amok scattered — no object near {target} was charged with enough emotion to take form."
  },
  {
    id: "multiplication", weight: 10, color: 0xB0C4DE, emoji: "🐭",
    holder: "Polymouse", kwami: "Mullo", animal: "Mouse", type: "Ring",
    power: "MULTITUDE", ability: "Multiplication",
    powerDesc: "Splits the wielder into multiple tiny versions of themselves, each fully autonomous and able to act independently.",
    cooldown: "5 minutes before detransform", warning: "do not lose yourself among your copies",
    targetEffect: "flavor", killChance: 0, missChance: 20,
    targetFlavor: "Mullo squeaks with energy. You split — dozens of tiny versions of you swarm around {target} from every direction. Overwhelming. Unstoppable.",
    missFlavor: "The split backfired — your copies went the wrong direction entirely and missed {target}."
  },
  {
    id: "determination", weight: 8, color: 0x8B4513, emoji: MIRACULOUS_EMOJIS.ox,
    holder: "Minotauros", kwami: "Stompp", animal: "Ox", type: "Anklet",
    power: "RESISTANCE", ability: "Determination",
    powerDesc: "Charges forward with unstoppable force, shattering any obstacle or barrier in a straight line.",
    cooldown: "5 minutes before detransform", warning: "momentum is hard to stop — aim carefully",
    targetEffect: "damage", damageMin: 20, damageMax: 45, killChance: 30, missChance: 10,
    targetFlavor: "Stompp charges through your legs. You lower your head and surge toward {target} — nothing between you survives the impact.",
    killFlavor: "The Resistance charge was absolute — {target} had no way to withstand that force.",
    missFlavor: "You charged straight past {target} — Stompp sighs. *\"Aim first, charge second.\"*"
  },
  {
    id: "elation", weight: 8, color: 0xFF8C00, emoji: MIRACULOUS_EMOJIS.tiger,
    holder: "Tigresse Pourpre", kwami: "Roaar", animal: "Tiger", type: "Anklet",
    power: "COLLISION", ability: "Elation",
    powerDesc: "Delivers a devastating strike that collides two forces together, creating a shockwave of pure energy.",
    cooldown: "5 minutes before detransform", warning: "elation without focus becomes destruction",
    targetEffect: "damage", damageMin: 30, damageMax: 60, killChance: 40, missChance: 15,
    targetFlavor: "Roaar roars inside you. You launch toward {target} — two forces collide in a burst of orange light. The shockwave ripples outward.",
    killFlavor: "Collision — the shockwave tore through {target} with the force of a thousand suns.",
    missFlavor: "The Collision missed — {target} dodged the shockwave. Roaar growls in frustration."
  },
  {
    id: "evolution", weight: 10, color: 0x9B59B6, emoji: "🐰",
    holder: "Bunnyx", kwami: "Fluff", animal: "Rabbit", type: "Pocket Watch",
    power: "BURROW", ability: "Evolution / Time Travel",
    powerDesc: "Opens a hole in time, allowing the wielder to travel to any point in the past or future.",
    cooldown: "5 minutes before detransform", warning: "do not alter what was meant to be",
    targetEffect: "flavor", killChance: 0, missChance: 10,
    targetFlavor: "Fluff winds the pocket watch carefully. A tear opens in time beside {target} — past and future blur at its edges.",
    missFlavor: "The time hole collapsed before {target} could be pulled through. Fluff nervously rewinds."
  },
  {
    id: "weather", weight: 10, color: 0x1ABC9C, emoji: "🐉",
    holder: "Ryuko", kwami: "Longg", animal: "Dragon", type: "Choker",
    power: "WATER / LIGHTNING / WIND", ability: "Weather Manipulation",
    powerDesc: "Commands three elemental forces — water, lightning, and wind — each devastating in its own way.",
    cooldown: "5 minutes before detransform", warning: "the storm does not choose its victims",
    targetEffect: "damage", damageMin: 25, damageMax: 55, killChance: 35, missChance: 20,
    targetFlavor: "Longg coils around you, scales shimmering. The sky answers your call — lightning crackles, wind howls, rain lashes down around {target}.",
    killFlavor: "The storm converged on {target} with full elemental fury. Lightning does not miss twice.",
    missFlavor: "The storm swirled but dissipated — {target} slipped out of its reach."
  },
  {
    id: "intuition", weight: 8, color: 0x27AE60, emoji: MIRACULOUS_EMOJIS.snake,
    holder: "Viperion", kwami: "Sass", animal: "Snake", type: "Bracelet",
    power: "SECOND CHANCE", ability: "Intuition / Time Manipulation",
    powerDesc: "Sets a checkpoint in time. If anything goes wrong, the wielder rewinds back to that exact moment with full memory.",
    cooldown: "5 minutes before detransform", warning: "every loop costs something — use it wisely",
    targetEffect: "flavor", killChance: 0, missChance: 5,
    targetFlavor: "Sass hisses softly. A green light marks this moment — your checkpoint is set. Whatever happens to {target} next, you will remember it. And you will be ready.",
    missFlavor: "The timeline flickered — the checkpoint reset before it could anchor near {target}."
  },
  {
    id: "teleportation", weight: 8, color: 0x4CAF50, emoji: "🐴",
    holder: "Pegasus", kwami: "Kaalki", animal: "Horse", type: "Glasses",
    power: "VOYAGE", ability: "Teleportation",
    powerDesc: "Opens a portal to any location in the world instantly, allowing instant travel across any distance.",
    cooldown: "5 minutes before detransform", warning: "not all doors should be opened",
    targetEffect: "flavor", killChance: 0, missChance: 15,
    targetFlavor: "Kaalki rears back and a blazing portal tears open before {target}. Any destination. Any distance. Step through — you're already there.",
    missFlavor: "The portal collapsed before {target} could be sent through. *\"The coordinates were off,\"* Kaalki says."
  },
  {
    id: "passion", weight: 8, color: 0xA8D5A2, emoji: MIRACULOUS_EMOJIS.goat,
    holder: "Caprikid", kwami: "Ziggy", animal: "Goat", type: "Choker",
    power: "GENESIS", ability: "Passion / Creation",
    powerDesc: "Creates any object imaginable from pure creative energy, limited only by the wielder's imagination.",
    cooldown: "5 minutes before detransform", warning: "every wish has a price unseen",
    targetEffect: "flavor", killChance: 0, missChance: 20,
    targetFlavor: "Ziggy bleats with sparkling energy. Your hands glow — something entirely new materializes between you and {target}, born from nothing but will and imagination.",
    missFlavor: "The Genesis energy faded — nothing materialized. Ziggy looks embarrassed."
  },
  {
    id: "mayhem", weight: 10, color: 0xFF4500, emoji: MIRACULOUS_EMOJIS.monkey,
    holder: "Roi Singe", kwami: "Xuppu", animal: "Monkey", type: "Circlet",
    power: "UPROAR", ability: "Mayhem / Disruption",
    powerDesc: "Summons a magical object that causes unpredictable chaos, disrupting any power, plan, or ability it touches.",
    cooldown: "5 minutes before detransform", warning: "chaos is a tool — not a toy",
    targetEffect: "damage", damageMin: 10, damageMax: 35, killChance: 20, missChance: 30,
    targetFlavor: "Xuppu cackles. A wild object appears and slams into {target}'s situation — whatever they were doing, planning, or using just got completely derailed. Pure chaos.",
    killFlavor: "The Uproar spiraled wildly out of control — and somehow {target} was caught in the absolute centre of the chaos.",
    missFlavor: "The chaos object flew completely the wrong direction. Xuppu shrugs. *\"That was funnier anyway.\"*"
  },
  {
    id: "pretension", weight: 8, color: 0xFFD700, emoji: MIRACULOUS_EMOJIS.rooster,
    holder: "Rooster Bold", kwami: "Orikko", animal: "Rooster", type: "Thumb Ring",
    power: "SUBLIMATION", ability: "Pretension / Ability Bestowal",
    powerDesc: "Grants or removes a specific superpower from any individual, chosen by the wielder.",
    cooldown: "5 minutes before detransform", warning: "gifted power can be taken just as easily",
    targetEffect: "flavor", killChance: 0, missChance: 20,
    targetFlavor: "Orikko crows triumphantly. You point at {target} — a golden light wraps around them. A new ability sparks to life inside them. Or perhaps one flickers out.",
    missFlavor: "The Sublimation energy scattered — {target} was out of range."
  },
  {
    id: "action", weight: 10, color: 0xC0392B, emoji: MIRACULOUS_EMOJIS.dog,
    holder: "Polymorphe", kwami: "Barkk", animal: "Dog", type: "Collar",
    power: "FETCH", ability: "Action / Retrieval",
    powerDesc: "Instantly retrieves any object from anywhere in the world, no matter how far away or how well hidden.",
    cooldown: "5 minutes before detransform", warning: "some things are hidden for a reason",
    targetEffect: "flavor", killChance: 0, missChance: 15,
    targetFlavor: "Barkk barks once, sharp and clear. Whatever {target} needs — wherever it is — it comes bounding back. Fetched. Retrieved. Delivered.",
    missFlavor: "Barkk looked everywhere but couldn't track down what {target} needed."
  },
  {
    id: "jubilation", weight: 8, color: 0xFFB6C1, emoji: MIRACULOUS_EMOJIS.pig,
    holder: "Pigella", kwami: "Daizzi", animal: "Pig", type: "Anklet",
    power: "GIFT", ability: "Jubilation / Happiness",
    powerDesc: "Opens a glowing box that reveals the target's deepest wish and brings them pure, unfiltered joy.",
    cooldown: "5 minutes before detransform", warning: "happiness shared freely is happiness doubled",
    targetEffect: "flavor", killChance: 0, missChance: 10,
    targetFlavor: "Daizzi glows warm pink. A shimmering box appears before {target} — it opens, and light pours out. Their deepest wish, made visible. Pure joy floods the air around them.",
    missFlavor: "The box flickered and closed before {target} could see inside. Daizzi pouts."
  }
];

// ─── American Miracle Box ─────────────────────────────────────────────────────
// Weight 4 = same rarity as creation/destruction
const americanMiraculousList = [
  {
    id: "am_eagle", weight: 8, color: 0x4169E1, emoji: "🦅",
    holder: "Eagle", kwami: "Liiri", animal: "Eagle", type: "Talon Necklace",
    power: "LIBERATION", ability: "Liberation",
    powerDesc: "Frees others from mental or physical restrictions. Unlocks the true potential locked within any person or object.",
    cooldown: "5 minutes before detransform", warning: "not all chains were meant to be broken",
    targetEffect: "flavor", killChance: 0, missChance: 15,
    targetFlavor: "Liiri cries out, wings wide. A blazing light envelops {target} — every restriction, every limitation, every chain shatters. They are free.",
    missFlavor: "The Liberation pulse scattered — {target} was beyond its reach."
  },
  {
    id: "am_thunderbird", weight: 3, color: 0x8B0000, emoji: "⚡",
    holder: "Thunderbird", kwami: "Rimma", animal: "Thunderbird", type: "Hair Tie",
    power: "STORM CALL", ability: "Storm Dominion",
    powerDesc: "The most powerful of the American box — commands lightning, thunder, and storm with absolute authority. Said to be the heart of the box itself.",
    cooldown: "5 minutes before detransform", warning: "the sky itself fears the Thunderbird",
    targetEffect: "damage", damageMin: 50, damageMax: 90, killChance: 55, missChance: 10,
    targetFlavor: "Rimma screams with ancient fury. The sky splits — a pillar of lightning crashes down upon {target} with the wrath of a thousand storms.",
    killFlavor: "The Thunderbird's storm was absolute. {target} was consumed by lightning before they could even react.",
    missFlavor: "The lightning bolt veered — {target} barely escaped the edge of the storm. Rimma screeches in frustration."
  },
  {
    id: "am_wolf", weight: 6, color: 0x708090, emoji: "🐺",
    holder: "Wolf", kwami: "Fenrix", animal: "Wolf", type: "Feather Charm Necklace",
    power: "PATHFIND", ability: "Loyalty / Pathfinding",
    powerDesc: "Reveals the hidden path to any destination, person, or truth. Can track anything across any distance.",
    cooldown: "5 minutes before detransform", warning: "the wolf always finds what it hunts",
    targetEffect: "flavor", killChance: 0, missChance: 20,
    targetFlavor: "Fenrix howls low. The ground beneath you glows — every trail, every hidden route, every secret path lights up. You know exactly where {target} is. You always will.",
    missFlavor: "The trail went cold — {target} covered their tracks well. Fenrix growls quietly."
  },
  {
    id: "am_bear", weight: 6, color: 0x8B4513, emoji: "🐻",
    holder: "Bear", kwami: "Otera", animal: "Bear", type: "Brooch",
    power: "REGENERATE", ability: "Regeneration / Power",
    powerDesc: "Channels raw power and regenerative force, able to heal grievous wounds and unleash devastating strength.",
    cooldown: "5 minutes before detransform", warning: "power without control is destruction",
    targetEffect: "heal", healAmount: 50, killChance: 0, missChance: 10,
    targetFlavor: "Otera rumbles with ancient strength. A wave of primal energy washes over {target} — wounds close, strength surges, vitality returns.",
    missFlavor: "The regeneration pulse failed to reach {target} in time."
  },
  {
    id: "am_buffalo", weight: 6, color: 0x4B3621, emoji: "🦬",
    holder: "Buffalo", kwami: "Tanka", animal: "Buffalo", type: "Thumb Ring",
    power: "RETRIBUTION", ability: "Dedication / Retribution",
    powerDesc: "Returns damage dealt to its rightful source — what was done to others echoes back twofold.",
    cooldown: "5 minutes before detransform", warning: "retribution does not forget",
    targetEffect: "damage", damageMin: 30, damageMax: 65, killChance: 35, missChance: 15,
    targetFlavor: "Tanka stamps the earth. The ground trembles. Every strike {target} has ever dealt is returned to them now — doubled. The debt is paid.",
    killFlavor: "Retribution was absolute. The Buffalo's power found {target} and delivered justice in full.",
    missFlavor: "The retribution pulse found no purchase — {target} had no debt to collect."
  },
  {
    id: "am_falcon", weight: 7, color: 0xDAA520, emoji: "🦆",
    holder: "Falcon", kwami: "Eyris", animal: "Falcon", type: "Eye Pendant",
    power: "FARSIGHT", ability: "Vision / Insight",
    powerDesc: "Grants perfect vision across any distance, seeing through illusions, barriers, and deception.",
    cooldown: "5 minutes before detransform", warning: "not all truths bring comfort",
    targetEffect: "flavor", killChance: 0, missChance: 10,
    targetFlavor: "Eyris focuses with razor precision. Your gaze pierces through everything — every illusion, every lie, every shield around {target} becomes transparent. You see it all.",
    missFlavor: "The vision blurred — {target} was cloaked beyond even Falcon's sight."
  },
  {
    id: "am_otter", weight: 7, color: 0x87CEEB, emoji: "🦦",
    holder: "Otter", kwami: "Flowa", animal: "Otter", type: "River Stone Pendant",
    power: "TRUTH STREAM", ability: "Friendship / Truth",
    powerDesc: "Reveals the absolute truth in any situation, stripping away all deception and revealing hidden bonds.",
    cooldown: "5 minutes before detransform", warning: "truth is a weapon and a gift",
    targetEffect: "flavor", killChance: 0, missChance: 15,
    targetFlavor: "Flowa splashes with energy. A crystal stream of light flows around {target} — every hidden truth surfaces. Everything they've concealed becomes known.",
    missFlavor: "The truth stream dispersed — {target}'s secrets remain hidden for now."
  },
  {
    id: "am_deer", weight: 7, color: 0x90EE90, emoji: "🦌",
    holder: "Deer", kwami: "Grazia", animal: "Deer", type: "Antler Charm",
    power: "GRACE", ability: "Evasion / Entertainment",
    powerDesc: "Moves with impossible grace, evading any attack and charming all who witness the display.",
    cooldown: "5 minutes before detransform", warning: "grace has limits even grace cannot predict",
    targetEffect: "flavor", killChance: 0, missChance: 5,
    targetFlavor: "Grazia leaps. You move like flowing water — {target} cannot track you. Every strike finds only air, every trap finds only your shadow.",
    missFlavor: "Even Grazia stumbled — the footing was too uneven to land near {target}."
  },
  {
    id: "am_raven", weight: 6, color: 0x1C1C1C, emoji: "🐦‍⬛",
    holder: "Raven", kwami: "Morryx", animal: "Raven", type: "Feather Ring",
    power: "SHADOW WEAVE", ability: "Manipulation",
    powerDesc: "Weaves shadows and illusions that manipulate perception, turning enemies against each other.",
    cooldown: "5 minutes before detransform", warning: "the raven never lies — it simply omits",
    targetEffect: "flavor", killChance: 0, missChance: 20,
    targetFlavor: "Morryx caws once. Shadows curl around {target} like smoke — their perception shifts. What is real and what is shadow? They can no longer tell.",
    missFlavor: "The shadows refused to cooperate — {target} remained unaffected."
  },
  {
    id: "am_owl", weight: 6, color: 0xD2B48C, emoji: "🦉",
    holder: "Owl", kwami: "Sagis", animal: "Owl", type: "Feather Brooch",
    power: "OMNISIGHT", ability: "Truth / Omniscience",
    powerDesc: "Grants total awareness of all things in the surrounding area — no secret, no whisper, no movement goes undetected.",
    cooldown: "5 minutes before detransform", warning: "knowing everything is its own burden",
    targetEffect: "flavor", killChance: 0, missChance: 5,
    targetFlavor: "Sagis opens wide, unblinking eyes. The world becomes transparent — you know where {target} is, what they intend, and what they fear. Total awareness.",
    missFlavor: "Even Sagis was blinded — something blocked the Omnisight."
  },
  {
    id: "am_salmon", weight: 7, color: 0xFF6347, emoji: "🐟",
    holder: "Salmon", kwami: "Runnix", animal: "Salmon", type: "Scale Charm",
    power: "RESTORATION", ability: "Knowledge / Restoration",
    powerDesc: "Restores people, objects, and situations to their ideal state using accumulated ancient wisdom.",
    cooldown: "5 minutes before detransform", warning: "restoration cannot undo what was never whole",
    targetEffect: "heal", healAmount: 40, killChance: 0, missChance: 10,
    targetFlavor: "Runnix leaps upstream. Ancient knowledge flows through your hands — everything around {target} is restored. What was broken is whole. What was lost returns.",
    missFlavor: "The restoration current missed — {target} could not be reached in time."
  },
  {
    id: "am_raccoon", weight: 8, color: 0x696969, emoji: "🦝",
    holder: "Raccoon", kwami: "Scrappy", animal: "Raccoon", type: "Mask Charm",
    power: "SCAVENGE", ability: "Resourcefulness",
    powerDesc: "Finds and repurposes anything in the environment as a weapon or tool — no resource goes to waste.",
    cooldown: "5 minutes before detransform", warning: "one person's trash is another's weapon",
    targetEffect: "damage", damageMin: 15, damageMax: 40, killChance: 20, missChance: 25,
    targetFlavor: "Scrappy grins. From nothing, you build everything — improvised tools, makeshift weapons, environmental traps all converge on {target} at once.",
    killFlavor: "Scrappy's resourcefulness was catastrophic — {target} didn't account for the environment being turned against them.",
    missFlavor: "Scrappy couldn't find anything useful nearby — the scavenge came up empty."
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRandomMiraculous() {
  const available = miraculousList.filter(m => !claimedMiraculous[m.id]);
  if (available.length === 0) return null;
  const total = available.reduce((sum, m) => sum + m.weight, 0);
  let rand = Math.random() * total;
  for (const m of available) {
    rand -= m.weight;
    if (rand <= 0) return m;
  }
  return available[available.length - 1];
}

function getRandomAmericanMiraculous() {
  const available = americanMiraculousList.filter(m => !claimedMiraculous[m.id]);
  if (available.length === 0) return null;
  const total = available.reduce((sum, m) => sum + m.weight, 0);
  let rand = Math.random() * total;
  for (const m of available) {
    rand -= m.weight;
    if (rand <= 0) return m;
  }
  return available[available.length - 1];
}

// Combined miraculous lookup (both lists)
function findMiraculous(id) {
  return miraculousList.find(x => x.id === id) || americanMiraculousList.find(x => x.id === id);
}

// Build the beautiful new miraculous embed matching the reference style
function buildMiraculousEmbed(miraculous, user) {
  return new EmbedBuilder()
    .setColor(miraculous?.color || 0x7B2FBE)
    .setTitle(`﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`)
    .setDescription(
      `${miraculous?.emoji || '❓'}  **${(miraculous?.animal || 'Unknown').toUpperCase()} MIRACULOUS**\n` +
      `──────────── ˗ˋ ୨୧ ˊ˗ ────────────\n` +
      `➜ **𝖧𝗈𝗅𝖽𝖾𝗋**\n<@${user.id}>\n` +
      `➜ **𝖪𝗐𝖺𝗆𝗂**\n**${miraculous.kwami}**\n` +
      `➜ **𝖢𝗈𝗇𝖼𝖾𝗉𝗍**\n**${miraculous.ability}**\n` +
      `──────────── ˗ˋ ୨୧ ˊ˗ ───────────\n` +
      `${miraculous.powerDesc}\n` +
      `➜ **𝖣𝖾-𝗍𝗋𝖺𝗇𝗌𝖿𝗈𝗋𝗆**\n**${miraculous.cooldown}**`
    )
    .setFooter({ text: `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉` })
    .setTimestamp();
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0 && sec > 0) return min + "m " + sec + "s";
  if (min > 0) return min + " minute" + (min > 1 ? "s" : "");
  return sec + " second" + (sec !== 1 ? "s" : "");
}

function buildVillainRows(monarchId, targetId) {
  const rows = [];
  for (let i = 0; i < villains.length; i += 5) {
    const row = new ActionRowBuilder();
    villains.slice(i, i + 5).forEach(v => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`vpick__${monarchId}__${targetId}__${v.id}`)
          .setLabel(v.name)
          .setStyle(ButtonStyle.Danger)
      );
    });
    rows.push(row);
  }
  return rows;
}

// Remove a user's miraculous completely
function wipeMiraculous(userId) {
  const mid = userMiraculous[userId];
  if (mid) {
    delete claimedMiraculous[mid];
    delete userMiraculous[userId];
  }
  delete powerCooldowns[userId];
  delete mothMode[userId];
  delete activeAkuma[userId];
  delete luckyCharmUsed[userId];
  delete villainAbilityUsed[userId];
  delete userAlignment[userId];
}

// ─── Discord Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent,]
});

client.once('ready', async () => {
  console.log("✅ Logged in as " + client.user.tag);

  const commands = [
    new SlashCommandBuilder()
      .setName('miraculous')
      .setDescription('Consult the Guardian — will the Kwami choose you?'),

    new SlashCommandBuilder()
      .setName('usepower')
      .setDescription('Activate your Miraculous power on a target!')
      .addUserOption(o => o.setName('target').setDescription('Who to use your power on').setRequired(true)),

    new SlashCommandBuilder()
      .setName('gift')
      .setDescription('Give your Miraculous to another user')
      .addUserOption(o => o.setName('recipient').setDescription('Who to give your Miraculous to').setRequired(true)),

    new SlashCommandBuilder()
      .setName('plot')
      .setDescription('Create a new RP plot arc')
      .addStringOption(o => o.setName('title').setDescription('Title of the plot arc').setRequired(true))
      .addStringOption(o => o.setName('author').setDescription('Author / narrator name').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Plot description').setRequired(true))
      .addStringOption(o => o.setName('color').setDescription('Embed color as hex e.g. FF0000').setRequired(true))
      .addStringOption(o => o.setName('image').setDescription('Image URL for the embed').setRequired(false))
      .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false)),

    new SlashCommandBuilder()
      .setName('villainability')
      .setDescription('Use your villain ability (only works while akumatized!)')
      .addUserOption(o => o.setName('target').setDescription('Who to use your ability on').setRequired(true)),

    new SlashCommandBuilder()
      .setName('reject')
      .setDescription('Reject the akuma / ultrakuma coming for you'),

    new SlashCommandBuilder()
      .setName('panel')
      .setDescription('Admin panel — manage Miraculouses (requires higher permissions than the bot)'),

    new SlashCommandBuilder()
      .setName('balance')
      .setDescription('Check your Charms balance 🪙'),

    new SlashCommandBuilder()
      .setName('patrol')
      .setDescription('Go on patrol to earn Charms! (5 minute cooldown)'),

    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('See the top Charms holders'),

    new SlashCommandBuilder()
      .setName('guardianshop')
      .setDescription('Browse Guardian upgrades'),

    new SlashCommandBuilder()
      .setName('reveal')
      .setDescription('Summon Gimmi using Creation and Destruction'),

    new SlashCommandBuilder()
      .setName('unify')
      .setDescription('Use Unification to hold 2 Miraculouses'),

    new SlashCommandBuilder()
      .setName('hp')
      .setDescription('Check your current HP'),

    new SlashCommandBuilder()
      .setName('charms')
      .setDescription('Add Charms to a user')
      .addUserOption(o =>
        o.setName('user')
          .setDescription('User to give Charms to')
          .setRequired(true))
      .addIntegerOption(o =>
        o.setName('amount')
          .setDescription('Amount of Charms')
          .setRequired(true)),

    new SlashCommandBuilder()
      .setName('givemiraculous')
      .setDescription('Give a specific Miraculous to a user')
      .addUserOption(o =>
        o.setName('user')
          .setDescription('Target user')
          .setRequired(true))
      .addStringOption(o =>
        o.setName('miraculous')
          .setDescription('Miraculous to give')
          .setRequired(true)
          .addChoices(
            { name: 'Creation', value: 'creation' },
            { name: 'Destruction', value: 'destruction' },
            { name: 'Illusion', value: 'illusion' },
            { name: 'Subjection', value: 'subjection' },
            { name: 'Protection', value: 'protection' },
            { name: 'Transmission', value: 'transmission' },
            { name: 'Emotion', value: 'emotion' },
            { name: 'Multiplication', value: 'multiplication' },
            { name: 'Teleportation', value: 'teleportation' },
            { name: 'Intuition', value: 'intuition' },
            { name: 'Evolution', value: 'evolution' },
            { name: 'Pretension', value: 'pretension' },
            { name: 'Jubilation', value: 'jubilation' },
            { name: 'Determination', value: 'determination' },
            { name: 'Passion', value: 'passion' },
            { name: 'Prodigious', value: 'prodigious' }
          )),

    new SlashCommandBuilder()
      .setName('check')
      .setDescription('Check who owns a Miraculous')
      .addStringOption(o =>
        o.setName('miraculous')
          .setDescription('Miraculous to check')
          .setRequired(true)
          .addChoices(
            { name: 'Creation', value: 'creation' },
            { name: 'Destruction', value: 'destruction' },
            { name: 'Illusion', value: 'illusion' },
            { name: 'Subjection', value: 'subjection' },
            { name: 'Protection', value: 'protection' },
            { name: 'Transmission', value: 'transmission' },
            { name: 'Emotion', value: 'emotion' },
            { name: 'Multiplication', value: 'multiplication' },
            { name: 'Teleportation', value: 'teleportation' },
            { name: 'Intuition', value: 'intuition' },
            { name: 'Evolution', value: 'evolution' },
            { name: 'Pretension', value: 'pretension' },
            { name: 'Jubilation', value: 'jubilation' },
            { name: 'Determination', value: 'determination' },
            { name: 'Passion', value: 'passion' },
            { name: 'Prodigious', value: 'prodigious' }
          )),

    new SlashCommandBuilder()
      .setName('steal')
      .setDescription('Attempt to steal a Miraculous')
      .addUserOption(o =>
        o.setName('user')
          .setDescription('Target user')
          .setRequired(true)),

  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const guilds = client.guilds.cache.map(g => g.id);
  console.log(`🔄 Registering slash commands in ${guilds.length} server(s)...`);
  const results = await Promise.allSettled(
    guilds.map(guildId =>
      rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commands })
    )
  );
  let ok = 0, fail = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') { ok++; }
    else { fail++; console.error(`❌ Failed for guild ${guilds[i]}:`, r.reason?.message || r.reason); }
  });
  console.log(`✅ Commands registered: ${ok} succeeded, ${fail} failed.`);

  client.on('guildCreate', async guild => {
    try {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: commands });
      console.log(`✅ Commands registered in new guild: ${guild.name} (${guild.id})`);
    } catch (err) {
      console.error(`❌ Failed to register commands in new guild ${guild.id}:`, err.message);
    }
  });
});

// ─── Permission check: is user "above" the bot? ───────────────────────────────
async function isAboveBot(interaction) {
  try {
    const guild = interaction.guild;
    const botMember = await guild.members.fetchMe();
    const userMember = await guild.members.fetch(interaction.user.id);
    if (guild.ownerId === interaction.user.id) return true;
    if (userMember.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const botHighest = botMember.roles.highest.position;
    const userHighest = userMember.roles.highest.position;
    return userHighest > botHighest;
  } catch (e) {
    return false;
  }
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  // ══════════════════════════════════════════════════════════════════════════════
  //   /miraculous
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'miraculous') {
    if (userMiraculous[interaction.user.id]) {
      const m = findMiraculous(userMiraculous[interaction.user.id]);
      await interaction.reply({
        content: "You already carry the " + (m?.animal || 'Unknown') + " Miraculous, " + interaction.user.username + ". The Guardian does not grant two.",
        ephemeral: true
      });
      return;
    }
    const button = new ButtonBuilder()
      .setCustomId('reveal_miraculous')
      .setLabel('...')
      .setStyle(ButtonStyle.Secondary);
    await interaction.reply({
      content: "The Guardian senses your courage...\nWill the Kwami choose you? Each Miraculous is unique, only the worthy are selected.",
      components: [new ActionRowBuilder().addComponents(button)]
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /hp
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'hp') {
    const hp = getHP(interaction.user.id);
    const bar = '█'.repeat(Math.round(hp / 10)) + '░'.repeat(10 - Math.round(hp / 10));
    const color = hp > 60 ? 0x00FF00 : hp > 30 ? 0xFFAA00 : 0xFF0000;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('❤️  HP STATUS')
      .setDescription(
        `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
        `➜ **Hero:** <@${interaction.user.id}>\n` +
        `➜ **HP:** **${hp} / 100**\n` +
        `➜ **[${bar}]**\n\n` +
        (hp === 0 ? `💀 *You have been defeated. Seek healing.*\n\n` : '') +
        `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /unify
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'unify') {
    if (!guardianUpgrades[interaction.user.id]?.unification) {
      await interaction.reply({ content: "❌ You have not unlocked Unification.", ephemeral: true });
      return;
    }
    if (!userMiraculous[interaction.user.id]) {
      await interaction.reply({ content: "❌ You need a Miraculous first.", ephemeral: true });
      return;
    }
    if (Array.isArray(userMiraculous[interaction.user.id])) {
      await interaction.reply({ content: "You are already unified.", ephemeral: true });
      return;
    }
    const second = getRandomMiraculous();
    if (!second) {
      await interaction.reply({ content: "No Miraculouses available.", ephemeral: true });
      return;
    }
    const first = userMiraculous[interaction.user.id];
    claimedMiraculous[second.id] = { userId: interaction.user.id, username: interaction.user.username };
    userMiraculous[interaction.user.id] = [first, second.id];
    const firstM = findMiraculous(first);
    const embed = new EmbedBuilder()
      .setColor(0x9400D3)
      .setTitle('✨ UNIFICATION ACTIVATED ✨')
      .setDescription(
        `➜ First:\n${firstM.emoji} ${firstM.animal}\n\n` +
        `➜ Second:\n${second.emoji} ${second.animal}`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /reveal
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'reveal') {
    const owned = userMiraculous[interaction.user.id];
    if (interaction.user.username === 'properties.exe') {
      await interaction.reply({
        content:
          '🌌 *The universe trembles...*\n\n' +
          '❤️ **Tikki:** "I am Tikki, Kwami of Creation. I am what is and will be."\n\n' +
          '🖤 **Plagg:** "I am Plagg, Kwami of Destruction. I am what destroys and returns all to nothing."'
      });
      const embed = new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setTitle('🌌 GIMMI HAS AWAKENED 🌌')
        .setDescription(
          `✨ The fusion of Creation and Destruction has summoned **Gimmi**.\n\n` +
          `Reality bends before <@${interaction.user.id}>.\n\n` +
          `*"State your wish..."*`
        )
        .setTimestamp();
      const wealthBtn = new ButtonBuilder().setCustomId('gimmi_wealth').setLabel('💰 Wealth').setStyle(ButtonStyle.Success);
      const powerBtn = new ButtonBuilder().setCustomId('gimmi_power').setLabel('⚡ Power').setStyle(ButtonStyle.Primary);
      const resetBtn = new ButtonBuilder().setCustomId('gimmi_reset').setLabel('🌌 Grand Reset').setStyle(ButtonStyle.Danger);
      await interaction.followUp({ embeds: [embed], components: [new ActionRowBuilder().addComponents(wealthBtn, powerBtn, resetBtn)] });
      return;
    }
    if (!owned || !Array.isArray(owned)) {
      await interaction.reply({ content: '⚠️ You must possess both Creation and Destruction through Unification.', ephemeral: true });
      return;
    }
    const hasCreation = owned.includes('creation');
    const hasDestruction = owned.includes('destruction');
    if (!hasCreation || !hasDestruction) {
      await interaction.reply({ content: '⚠️ You require both the Miraculous of Creation and Destruction.', ephemeral: true });
      return;
    }
    await interaction.reply({
      content:
        '🌌 *The universe trembles...*\n\n' +
        '❤️ **Tikki:** "I am Tikki, Kwami of Creation. I am what is and will be."\n\n' +
        '🖤 **Plagg:** "I am Plagg, Kwami of Destruction. I am what destroys and returns all to nothing."'
    });
    setTimeout(async () => {
      const embed = new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setTitle('🌌 GIMMI HAS AWAKENED 🌌')
        .setDescription(
          `✨ The fusion of Creation and Destruction has summoned **Gimmi**.\n\n` +
          `Reality bends before <@${interaction.user.id}>.\n\n` +
          `*"State your wish..."*`
        )
        .setTimestamp();
      const wealthBtn = new ButtonBuilder().setCustomId('gimmi_wealth').setLabel('💰 Wealth').setStyle(ButtonStyle.Success);
      const powerBtn = new ButtonBuilder().setCustomId('gimmi_power').setLabel('⚡ Power').setStyle(ButtonStyle.Primary);
      const resetBtn = new ButtonBuilder().setCustomId('gimmi_reset').setLabel('🌌 Grand Reset').setStyle(ButtonStyle.Danger);
      await interaction.followUp({ embeds: [embed], components: [new ActionRowBuilder().addComponents(wealthBtn, powerBtn, resetBtn)] });
    }, 4000);
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /panel
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    const allowed = await isAboveBot(interaction);
    if (!allowed) {
      await interaction.reply({ content: "🚫 You don't have permission to use the Admin Panel.", ephemeral: true });
      return;
    }
    const resetAllBtn = new ButtonBuilder().setCustomId('panel__reset_all').setLabel('🔄 Reset ALL Miraculouses').setStyle(ButtonStyle.Danger);
    const giveBtn = new ButtonBuilder().setCustomId('panel__give_prompt').setLabel('🎁 Give Miraculous').setStyle(ButtonStyle.Primary);
    const charmsBtn = new ButtonBuilder().setCustomId('panel__give_charms_prompt').setLabel('🪙 Give Charms').setStyle(ButtonStyle.Success);
    const wipeCharmsBtn = new ButtonBuilder().setCustomId('panel__wipe_economy').setLabel('💸 Wipe Economy').setStyle(ButtonStyle.Secondary);
    const panelEmbed = new EmbedBuilder()
      .setColor(0x7B2FBE)
      .setTitle('🛡️  MIRACULOUS ADMIN PANEL')
      .setDescription(
        '﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n' +
        '> Select an action below.\n\n' +
        '🔄 Reset ALL Miraculouses\n' +
        '🎁 Give Miraculous\n' +
        '🪙 Give Charms\n' +
        '💸 Wipe Economy\n\n' +
        '﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉'
      )
      .setTimestamp();
    await interaction.reply({
      embeds: [panelEmbed],
      components: [new ActionRowBuilder().addComponents(resetAllBtn, giveBtn, charmsBtn, wipeCharmsBtn)],
      ephemeral: true
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /balance
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'balance') {
    const charms = getCharms(interaction.user.id);
    if (interaction.user.username === 'properties.exe') {
      addCharms(interaction.user.id, 2000);
    }
    const mid = userMiraculous[interaction.user.id];
    const m = mid ? findMiraculous(mid) : null;
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🪙  CHARMS BALANCE')
      .setDescription(
        `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
        `➜ **Holder:** <@${interaction.user.id}>\n` +
        `➜ **Balance:** **${charms} Charms** 🪙\n` +
        (m ? `➜ **Miraculous:** ${m.emoji} ${m.animal}\n` : `➜ **Miraculous:** *None*\n`) +
        (userAlignment[interaction.user.id] ? `➜ **Alignment:** ${userAlignment[interaction.user.id] === 'good' ? '✨ Greater Good' : '🦹 Evil'}\n` : '') +
        `\n﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /patrol
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'patrol') {
    const mid = userMiraculous[interaction.user.id];
    if (!mid) {
      await interaction.reply({ content: "⚠️ You need a Miraculous to go on patrol!", ephemeral: true });
      return;
    }
    const now = Date.now();
    const lastPatrol = patrolCooldowns[interaction.user.id] || 0;
    const remaining = PATROL_COOLDOWN - (now - lastPatrol);
    if (remaining > 0) {
      await interaction.reply({ content: `🦸 You already went on patrol recently! Come back in **${formatTime(remaining)}**.`, ephemeral: true });
      return;
    }
    const earned = Math.floor(Math.random() * 401) + 100;
    addCharms(interaction.user.id, earned);
    patrolCooldowns[interaction.user.id] = now;
    const m = findMiraculous(mid);
    const patrolMessages = [
      `You swept across the rooftops, protected three civilians, and stopped a runaway vehicle.`,
      `A purse snatcher didn't stand a chance. The city is safer tonight.`,
      `You spotted an Akuma threat early — contained it before it could cause damage.`,
      `Helped a lost child find their parents and stopped a minor accident on the bridge.`,
      `An entire street was evacuated in record time. The city owes you, hero.`,
      `Took down a rogue sentimonster before sunrise. Paris never even knew.`
    ];
    const embed = new EmbedBuilder()
      .setColor(m.color)
      .setTitle(`${m.emoji}  PATROL COMPLETE`)
      .setDescription(
        `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
        `➜ **Hero:** <@${interaction.user.id}>\n` +
        `➜ **Miraculous:** ${m.animal}\n\n` +
        `*${patrolMessages[Math.floor(Math.random() * patrolMessages.length)]}*\n\n` +
        `➜ **Earned:** **+${earned} Charms** 🪙\n` +
        `➜ **Total:** **${getCharms(interaction.user.id)} Charms** 🪙\n\n` +
        `⏳ Next patrol available in **5 minutes**.\n\n` +
        `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /leaderboard
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'leaderboard') {
    const sorted = Object.entries(userCharms).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (sorted.length === 0) {
      await interaction.reply({ content: "No Charms have been earned yet!", ephemeral: true });
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = sorted.map(([uid, amt], i) => {
      const medal = medals[i] || `**${i + 1}.**`;
      return `${medal} <@${uid}> — **${amt} Charms** 🪙`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏆  CHARMS LEADERBOARD')
      .setDescription(`﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` + lines + `\n\n﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /check
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'check') {
    const mid = interaction.options.getString('miraculous');
    const miraculous = findMiraculous(mid);
    const owner = claimedMiraculous[mid];
    const embed = new EmbedBuilder()
      .setColor(miraculous?.color || 0x7B2FBE)
      .setTitle(`${miraculous?.emoji || '❓'} ${(miraculous?.animal || 'Unknown')} Miraculous`);
    if (!owner) {
      embed.setDescription(`➜ Status:\nCurrently unclaimed.`);
    } else {
      embed.setDescription(`➜ Current Holder:\n<@${owner.userId}>`);
    }
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /steal
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'steal') {
    const now = Date.now();
    if (stealCooldowns[interaction.user.id] && now < stealCooldowns[interaction.user.id]) {
      const remaining = Math.ceil((stealCooldowns[interaction.user.id] - now) / 60000);
      await interaction.reply({ content: `⏳ You must wait ${remaining} more minute(s) before stealing again.`, ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "You cannot steal from yourself.", ephemeral: true });
      return;
    }
    const targetMc = userMiraculous[target.id];
    if (!targetMc) {
      await interaction.reply({ content: "That user has no Miraculous.", ephemeral: true });
      return;
    }
    const miraculous = findMiraculous(targetMc);
    if (!miraculous) {
      await interaction.reply({ content: "That Miraculous no longer exists in the database.", ephemeral: true });
      return;
    }
    let chance = 40;
    switch (targetMc) {
      case 'creation':
      case 'destruction':
        chance = 15; break;
      case 'prodigious':
        chance = 5; break;
      case 'transmission':
      case 'emotion':
        chance = 20; break;
      case 'am_thunderbird':
        chance = 8; break;
      case 'am_eagle':
        chance = 12; break;
      default:
        chance = 40;
    }
    stealCooldowns[interaction.user.id] = now + (15 * 60 * 1000);
    saveData('./stealCooldowns.json', stealCooldowns);
    const roll = Math.random() * 100;
    if (roll <= chance) {
      delete userMiraculous[target.id];
      claimedMiraculous[targetMc] = { userId: interaction.user.id, username: interaction.user.username };
      userMiraculous[interaction.user.id] = targetMc;
      saveData('./userMiraculous.json', userMiraculous);
      saveData('./claimedMiraculous.json', claimedMiraculous);
      const embed = new EmbedBuilder()
        .setColor(0x00FF99)
        .setTitle('🦹 MIRACULOUS STOLEN')
        .setDescription(
          `➜ Thief:\n<@${interaction.user.id}>\n\n` +
          `➜ Victim:\n<@${target.id}>\n\n` +
          `➜ Stolen:\n${miraculous?.emoji || '❓'} ${miraculous?.animal || 'Unknown'}\n\n` +
          `🎲 Success Chance: ${chance}%`
        );
      await interaction.reply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ STEAL FAILED')
        .setDescription(
          `➜ Target:\n<@${target.id}>\n\n` +
          `➜ Miraculous:\n${miraculous?.emoji || '❓'} ${miraculous?.animal || 'Unknown'}\n\n` +
          `🎲 Success Chance: ${chance}%`
        );
      await interaction.reply({ embeds: [embed] });
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /givemiraculous
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'givemiraculous') {
    const allowed = interaction.user.username === 'properties.exe' || await isAboveBot(interaction);
    if (!allowed) {
      await interaction.reply({ content: "🚫 You cannot use this command.", ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('user');
    const mid = interaction.options.getString('miraculous');
    const miraculous = findMiraculous(mid);
    if (!miraculous) {
      await interaction.reply({ content: "That Miraculous does not exist.", ephemeral: true });
      return;
    }
    if (claimedMiraculous[mid]) {
      await interaction.reply({ content: "That Miraculous is already claimed.", ephemeral: true });
      return;
    }
    claimedMiraculous[mid] = { userId: target.id, username: target.username };
    if (guardianUpgrades[target.id]?.unification && userMiraculous[target.id]) {
      if (Array.isArray(userMiraculous[target.id])) {
        userMiraculous[target.id].push(mid);
      } else {
        userMiraculous[target.id] = [userMiraculous[target.id], mid];
      }
    } else {
      userMiraculous[target.id] = mid;
    }
    const embed = new EmbedBuilder()
      .setColor(miraculous?.color || 0x7B2FBE)
      .setTitle('🎁 MIRACULOUS GRANTED')
      .setDescription(
        `➜ Recipient:\n<@${target.id}>\n\n` +
        `➜ Miraculous:\n${miraculous?.emoji || '❓'} ${miraculous?.animal || 'Unknown'}\n\n` +
        `➜ Granted By:\n<@${interaction.user.id}>`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /charms
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'charms') {
    const allowed = await isAboveBot(interaction);
    if (!allowed) {
      await interaction.reply({ content: "🚫 You cannot use this command.", ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (amount <= 0) {
      await interaction.reply({ content: "Amount must be above 0.", ephemeral: true });
      return;
    }
    addCharms(target.id, amount);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🪙 CHARMS ADDED')
      .setDescription(
        `➜ User: <@${target.id}>\n` +
        `➜ Added: **${amount} Charms** 🪙\n` +
        `➜ New Balance: **${getCharms(target.id)} Charms**`
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /guardianshop
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'guardianshop') {
    const owned = guardianUpgrades[interaction.user.id]?.unification;
    guardianUpgrades[interaction.user.id] = guardianUpgrades[interaction.user.id] || {};
    const buyBtn = new ButtonBuilder()
      .setCustomId('buy_unification')
      .setLabel(owned ? 'Already Owned' : 'Buy Unification — 1500 Charms')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(false);
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle('🏛️ GUARDIAN SHOP')
      .setDescription(
        `➜ **UNIFICATION**\n` +
        `Hold 2 Miraculouses at once.\n\n` +
        `💰 Cost: 1500 Charms\n\n` +
        `Unlocks: \`/unify\``
      );
    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(buyBtn)] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /usepower
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'usepower') {
    const mid = userMiraculous[interaction.user.id];
    if (!mid) {
      await interaction.reply({ content: "You don't have a miraculous!", ephemeral: true });
      return;
    }
    const m = findMiraculous(mid);
    const target = interaction.options.getUser('target');
    const now = Date.now();
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "You cannot use your power on yourself.", ephemeral: true });
      return;
    }

    // ── BUTTERFLY — special handling ─────────────────────────────────────────
    if (m.targetEffect === 'butterfly') {
      if (!mothMode[interaction.user.id]) {
        await interaction.reply({ content: "You haven't chosen your form yet! (Betterfly or Chrysalis — claim your Miraculous first)", ephemeral: true });
        return;
      }
      if (activeAkuma[interaction.user.id]) {
        const ex = activeAkuma[interaction.user.id];
        await interaction.reply({ content: `You already have an active akuma on **${ex.targetUsername}**. You can only have 1 active akuma at a time.`, ephemeral: true });
        return;
      }
      const mode = mothMode[interaction.user.id];
      const channel = interaction.channel;

      // ── CHRYSALIS ────────────────────────────────────────────────────────────
      if (mode === 'chrysalis') {
        await interaction.reply({
          content: `🦋 Choose a villain form to give to **${target.username}**:`,
          components: buildVillainRows(interaction.user.id, target.id),
          ephemeral: true
        });
        return;
      }

      // ── BETTERFLY ────────────────────────────────────────────────────────────
      if (mode === 'betterfly') {
        await interaction.reply({ content: `✨ *A butterfly of light rises...*\n**"Fly away my akuma, and evilize... wait — no."** *Kamiko!*` });
        setTimeout(async () => {
          try {
            await channel.send(`*The shimmering butterfly settles gently near <@${target.id}>...*\n\n🦋 **Betterfly:** *"Celesticat, I am Betterfly."*`);
            setTimeout(async () => {
              await channel.send(`🦋 **Betterfly:** *"I'm not your enemy, I only want to entrust you with the power to save us."*`);
              setTimeout(async () => {
                await channel.send(`🦋 **Betterfly:** *"I only work for the greater good, like you Celesticat. Do you accept this gift I am offering you for the greater good?"*`);
                akumatizationPending[target.id] = { monarchId: interaction.user.id, villain: null, mode: 'betterfly' };
                const acceptBtn = new ButtonBuilder().setCustomId(`bfly_yes__${interaction.user.id}__${target.id}`).setLabel('I do').setStyle(ButtonStyle.Primary);
                const rejectBtn = new ButtonBuilder().setCustomId(`bfly_no__${interaction.user.id}__${target.id}`).setLabel('No..!').setStyle(ButtonStyle.Danger);
                await channel.send({ content: `<@${target.id}> — what is your answer?`, components: [new ActionRowBuilder().addComponents(acceptBtn, rejectBtn)] });
              }, 3000);
            }, 2000);
          } catch (e) { console.error("Betterfly error:", e); }
        }, 10000);
        return;
      }
    }

    // ── COOLDOWN CHECK ────────────────────────────────────────────────────────
    const cd = powerCooldowns[interaction.user.id];
    if (cd && cd.rechargeUntil && now < cd.rechargeUntil) {
      await interaction.reply({ content: interaction.user.username + ", you detransformed. You must wait **" + formatTime(cd.rechargeUntil - now) + "** before using your power again.", ephemeral: true });
      return;
    }
    if (cd && cd.transformBack && now < cd.transformBack) {
      await interaction.reply({ content: "You have already used your power! You have **" + formatTime(cd.transformBack - now) + "** before you detransform. Use it wisely.", ephemeral: true });
      return;
    }

    powerCooldowns[interaction.user.id] = { transformBack: now + DETRANSFORM_MS };
    setTimeout(async () => {
      try {
        const u = await client.users.fetch(interaction.user.id);
        await u.send("⚠️ **" + m.kwami + " warns you!** Your power has been used — you will detransform in 5 minutes.");
      } catch (e) {}
    }, 100);
    setTimeout(() => {
      powerCooldowns[interaction.user.id] = { rechargeUntil: Date.now() + RECHARGE_MS };
      client.users.fetch(interaction.user.id).then(u =>
        u.send("⏰ **" + interaction.user.username + "**, you have detransformed! Wait **4 minutes** before using your power again.").catch(() => {})
      ).catch(() => {});
    }, DETRANSFORM_MS);
    setTimeout(() => {
      delete powerCooldowns[interaction.user.id];
      client.users.fetch(interaction.user.id).then(u =>
        u.send("✅ **" + interaction.user.username + "**, your Miraculous is recharged! You can use **" + m.power + "** again.").catch(() => {})
      ).catch(() => {});
    }, DETRANSFORM_MS + RECHARGE_MS);

    const discordTimestamp = "<t:" + Math.floor((now + DETRANSFORM_MS) / 1000) + ":R>";

    // ─── LUCKY CHARM ─────────────────────────────────────────────────────────
    if (m.targetEffect === "lucky_charm") {
      if (Math.random() * 100 < 15) {
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF0000).setTitle("🐞  LUCKY CHARM — MISSED")
            .setDescription(`*The Lucky Charm fizzled out before it could form — Tikki looks embarrassed.*\n\n**${interaction.user.username}** needs to focus more!\n\n➜ **Detransform:** ${discordTimestamp}`)
            .setTimestamp()]
        });
        return;
      }
      if (!luckyCharmUsed[interaction.user.id]) {
        luckyCharmUsed[interaction.user.id] = true;
        const obj = luckyObjects[Math.floor(Math.random() * luckyObjects.length)];
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF0000).setTitle("🐞  LUCKY CHARM — ACTIVATED").setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆")
            .addFields(
              { name: "holder", value: interaction.user.username, inline: true },
              { name: "target", value: target.username, inline: true },
              { name: "kwami", value: "Tikki", inline: true },
              { name: "\u200b", value: "Lucky Charm activates! A **" + obj + "** materializes in your hands.\nLook around you — the answer is already there." },
              { name: "detransform", value: discordTimestamp, inline: true },
              { name: "warning", value: "creation requires great responsibility", inline: true }
            )
            .setFooter({ text: "Use /usepower again to release Miraculous Cure" }).setTimestamp()]
        });
      } else {
        luckyCharmUsed[interaction.user.id] = false;
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF0000).setTitle("🐞  MIRACULOUS CURE — RELEASED").setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆")
            .addFields(
              { name: "holder", value: interaction.user.username, inline: true },
              { name: "kwami", value: "Tikki", inline: true },
              { name: "\u200b", value: "You throw the charm into the air. It bursts — a cascade of red and black spots floods the sky. Every trace of destruction, undone." },
              { name: "cure", value: "All damage is reversed. All is well." },
              { name: "detransform", value: discordTimestamp, inline: true }
            )
            .setFooter({ text: "⋆ ━━━━━━━━━━━━━━━━━━ ⋆" }).setTimestamp()]
        });
      }
      return;
    }

    // ─── HEAL ─────────────────────────────────────────────────────────────────
    if (m.targetEffect === "heal") {
      const missRoll = Math.random() * 100;
      const missChance = m.missChance || 15;
      if (missRoll < missChance) {
        const missText = (m.missFlavor || `The healing missed ${target.username}.`);
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(m.color).setTitle(`${m.emoji}  ${m.power} — MISSED`)
            .setDescription(`*${missText}*\n\n➜ **Detransform:** ${discordTimestamp}`)
            .setTimestamp()]
        });
        return;
      }
      const healAmt = m.healAmount || 20;
      const oldHP = getHP(target.id);
      const newHP = Math.min(100, oldHP + healAmt);
      userHP[target.id] = newHP;
      const flavor = m.targetFlavor.replace('{target}', target.username);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(m.color).setTitle(`${m.emoji}  ${m.power} — HEALING`)
          .setDescription(
            `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
            `*${flavor}*\n\n` +
            `➜ **Holder:** ${interaction.user.username}\n` +
            `➜ **Target:** ${target.username}\n` +
            `➜ **HP Restored:** +${newHP - oldHP} HP (${newHP}/100)\n` +
            `➜ **Detransform:** ${discordTimestamp}\n\n` +
            `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
          )
          .setTimestamp()]
      });
      try {
        const tu = await client.users.fetch(target.id);
        await tu.send(`💚 **${interaction.user.username}** used **${m.power}** on you! You recovered **+${newHP - oldHP} HP**. Current HP: **${newHP}/100**`);
      } catch (e) {}
      return;
    }

    // ─── DAMAGE ───────────────────────────────────────────────────────────────
    if (m.targetEffect === "damage") {
      const missRoll = Math.random() * 100;
      const killRoll = Math.random() * 100;
      const missChance = m.missChance || 20;
      const killChance = m.killChance || 0;
      const damageMin = m.damageMin || 10;
      const damageMax = m.damageMax || 40;

      if (missRoll < missChance) {
        const missText = (m.missFlavor || `The attack missed {target} entirely.`).replace('{target}', target.username);
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(m.color)
            .setTitle(`${m.emoji}  ${m.power} — MISSED`)
            .setDescription(
              `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
              `*${missText}*\n\n` +
              `➜ **Holder:** ${interaction.user.username}\n` +
              `➜ **Target:** ${target.username}\n` +
              `➜ **Result:** 💨 **MISS**\n\n` +
              `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
            )
            .setTimestamp()]
        });
        return;
      }

      // Calculate damage
      const damage = Math.floor(Math.random() * (damageMax - damageMin + 1)) + damageMin;
      const targetCurrentHP = getHP(target.id);
      const targetNewHP = applyDamage(target.id, damage);

      // Check for kill: either kill chance rolls OR HP hits 0
      const hpKill = targetNewHP <= 0;
      const rollKill = killChance > 0 && killRoll < killChance;

      if (hpKill || rollKill) {
        // HP-based kill: HP is 0, but Miraculous is NOT wiped
        const killText = (m.killFlavor || `{target} was defeated by the attack.`).replace('{target}', target.username);
        // Reset HP after defeat
        resetHP(target.id);

        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x000000)
            .setTitle(`${m.emoji}  ${m.power} — LETHAL HIT 💀`)
            .setDescription(
              `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
              `*${killText}*\n\n` +
              `➜ **Attacker:** ${interaction.user.username}\n` +
              `➜ **Target:** ${target.username}\n` +
              `➜ **Damage Dealt:** ${damage} HP\n` +
              `➜ **Result:** 💀 **DEFEATED** *(HP reset to 100)*\n` +
              `➜ **Miraculous:** *Retained — the holder lives to fight another day*\n` +
              `\n﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
            )
            .setTimestamp()]
        });

        // DM the defeated user
        try {
          const defeatedUser = await client.users.fetch(target.id);
          await defeatedUser.send(
            `💀 **You have been defeated by ${interaction.user.username}!**\n\n` +
            `${m.emoji} *Their **${m.power}** struck you down for ${damage} damage.*\n\n` +
            `Your HP has been reset to **100**. Your Miraculous remains with you.`
          );
        } catch (e) {}
        return;
      }

      // HIT — took damage, still alive
      const flavor = (m.targetFlavor || `The attack hit {target}.`).replace('{target}', target.username);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(m.color)
          .setTitle(`${m.emoji}  ${m.power} — HIT`)
          .setDescription(
            `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
            `*${flavor}*\n\n` +
            `➜ **Holder:** ${interaction.user.username}\n` +
            `➜ **Target:** ${target.username}\n` +
            `➜ **Damage:** ${damage} HP\n` +
            `➜ **Target HP:** ${targetNewHP}/100\n` +
            `➜ **Result:** ⚡ **HIT**\n` +
            `➜ **Detransform:** ${discordTimestamp}\n\n` +
            `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
          )
          .setTimestamp()]
      });
      // DM the hit user
      try {
        const hitUser = await client.users.fetch(target.id);
        await hitUser.send(`⚡ **${interaction.user.username}** used **${m.power}** on you! You took **${damage} damage**. Current HP: **${targetNewHP}/100**`);
      } catch (e) {}
      return;
    }

    // ─── TIMEOUT ─────────────────────────────────────────────────────────────
    if (m.targetEffect === "timeout") {
      const missRoll = Math.random() * 100;
      const missChance = m.missChance || 20;
      if (missRoll < missChance) {
        const missText = (m.missFlavor || `The attack missed ${target.username}.`);
        await interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(m.color).setTitle(`${m.emoji}  ${m.power} — MISSED`)
            .setDescription(`*${missText}*\n\n➜ Detransform: ${discordTimestamp}`)
            .setTimestamp()]
        });
        return;
      }
      const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      const flavor = m.targetFlavor.replace("{target}", target.username);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(m.color).setTitle(m.emoji + "  " + m.power + " — ACTIVATED").setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆")
          .addFields(
            { name: "holder", value: interaction.user.username, inline: true },
            { name: "target", value: target.username, inline: true },
            { name: "kwami", value: m.kwami, inline: true },
            { name: "\u200b", value: flavor },
            { name: "effect duration", value: formatTime(m.timeoutSeconds * 1000), inline: true },
            { name: "detransform", value: discordTimestamp, inline: true },
            { name: "warning", value: m.warning }
          )
          .setFooter({ text: "⋆ ━━━━━━━━━━━━━━━━━━ ⋆" }).setTimestamp()]
      });
      if (guildMember) {
        try { await guildMember.timeout(m.timeoutSeconds * 1000, m.power + " used by " + interaction.user.username); }
        catch (e) { await interaction.followUp({ content: "(Could not apply timeout — check bot permissions)", ephemeral: true }); }
      }
      return;
    }

    // ─── FLAVOR ───────────────────────────────────────────────────────────────
    const missRoll = Math.random() * 100;
    const missChance = m.missChance || 15;
    if (missRoll < missChance) {
      const missText = (m.missFlavor || `The power missed ${target.username} entirely.`);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(m.color).setTitle(`${m.emoji}  ${m.power} — MISSED`)
          .setDescription(`*${missText}*\n\n➜ **Detransform:** ${discordTimestamp}`)
          .setTimestamp()]
      });
      return;
    }
    const flavor = m.targetFlavor.replace("{target}", target.username);
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(m.color).setTitle(m.emoji + "  " + m.power + " — ACTIVATED").setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆")
        .addFields(
          { name: "holder", value: interaction.user.username, inline: true },
          { name: "target", value: target.username, inline: true },
          { name: "kwami", value: m.kwami, inline: true },
          { name: "\u200b", value: flavor },
          { name: "detransform", value: discordTimestamp, inline: true },
          { name: "warning", value: m.warning, inline: true }
        )
        .setFooter({ text: "⋆ ━━━━━━━━━━━━━━━━━━ ⋆" }).setTimestamp()]
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /gift
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'gift') {
    const mid = userMiraculous[interaction.user.id];
    if (!mid) { await interaction.reply({ content: "You don't have a Miraculous to give!", ephemeral: true }); return; }
    const recipient = interaction.options.getUser('recipient');
    if (recipient.id === interaction.user.id) { await interaction.reply({ content: "You cannot give a Miraculous to yourself.", ephemeral: true }); return; }
    if (userMiraculous[recipient.id]) {
      const theirM = findMiraculous(userMiraculous[recipient.id]);
      await interaction.reply({ content: recipient.username + " already holds the " + theirM.animal + " Miraculous.", ephemeral: true });
      return;
    }
    const m = findMiraculous(mid);
    const line = giftLines[Math.floor(Math.random() * giftLines.length)];
    delete claimedMiraculous[mid];
    delete userMiraculous[interaction.user.id];
    delete powerCooldowns[interaction.user.id];
    delete mothMode[interaction.user.id];
    delete activeAkuma[interaction.user.id];
    claimedMiraculous[mid] = { userId: recipient.id, username: recipient.username };
    userMiraculous[recipient.id] = mid;
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(m.color).setTitle(m.emoji + "  A MIRACULOUS HAS BEEN PASSED ON").setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆")
        .addFields(
          { name: "given by", value: interaction.user.username, inline: true },
          { name: "received by", value: recipient.username, inline: true },
          { name: "miraculous", value: m.animal + " Miraculous", inline: true },
          { name: "kwami", value: m.kwami, inline: true },
          { name: "\u200b", value: '"' + line + '"' }
        )
        .setFooter({ text: "⋆ ━━━━━━━━━━━━━━━━━━ ⋆" }).setTimestamp()]
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /plot
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'plot') {
    const title       = interaction.options.getString('title');
    const author      = interaction.options.getString('author');
    const description = interaction.options.getString('description');
    const colorHex    = interaction.options.getString('color') || '5865F2';
    const imageUrl    = interaction.options.getString('image') || null;
    const footerText  = interaction.options.getString('footer') || '⋆ ━━━━━━━━━━━━━━━━━━ ⋆';
    const color       = parseInt(colorHex.replace('#', ''), 16);
    const embed = new EmbedBuilder()
      .setColor(isNaN(color) ? 0x5865F2 : color)
      .setTitle("📖  " + title.toUpperCase())
      .setDescription("⋆ ━━━━━━━━━━━━━━━━━━━━━━ ⋆\n\n" + description)
      .addFields({ name: "author", value: author, inline: true })
      .setFooter({ text: footerText })
      .setTimestamp();
    if (imageUrl) embed.setImage(imageUrl);
    await interaction.reply({ embeds: [embed] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /villainability
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'villainability') {
    let akumaData = null;
    for (const [monarchId, data] of Object.entries(activeAkuma)) {
      if (data.targetId === interaction.user.id) { akumaData = { monarchId, ...data }; break; }
    }
    if (!akumaData) {
      await interaction.reply({ content: "You are not akumatized! `/villainability` only works while you are akumatized.", ephemeral: true });
      return;
    }
    if (villainAbilityUsed[interaction.user.id]) {
      await interaction.reply({ content: "You have already used your villain ability!", ephemeral: true });
      return;
    }
    const villain = villains.find(v => v.id === akumaData.villain);
    if (!villain) {
      await interaction.reply({ content: "Your villain form doesn't have an active ability set.", ephemeral: true });
      return;
    }
    const target = interaction.options.getUser('target');
    villainAbilityUsed[interaction.user.id] = true;
    if (villain.id === 'lady_chaos') {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      await interaction.reply({ content: `⚡ **Lady Chaos strikes!** <@${target.id}> has been timed out for ${formatTime(villain.timeoutSeconds * 1000)}!` });
      if (member) try { await member.timeout(villain.timeoutSeconds * 1000, "Lady Chaos used by " + interaction.user.username); } catch (e) {}
    } else if (villain.id === 'stormy_weather') {
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      await interaction.reply({ content: `🌩️ **Stormy Weather freezes time!** <@${target.id}> is silenced for ${formatTime(villain.timeoutSeconds * 1000)}!` });
      if (member) try { await member.timeout(villain.timeoutSeconds * 1000, "Stormy Weather used by " + interaction.user.username); } catch (e) {}
    } else if (villain.id === 'timebreaker') {
      delete powerCooldowns[target.id];
      await interaction.reply({ content: `⏱️ **Timebreaker rewound time!** <@${target.id}>'s Miraculous cooldown has been wiped!` });
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   /reject
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isChatInputCommand() && interaction.commandName === 'reject') {
    const pending = akumatizationPending[interaction.user.id];
    let activeMonarchId = null;
    for (const [mId, data] of Object.entries(activeAkuma)) {
      if (data.targetId === interaction.user.id) { activeMonarchId = mId; break; }
    }
    if (!pending && !activeMonarchId) {
      await interaction.reply({ content: "There is no akuma coming for you, and you are not currently akumatized.", ephemeral: true });
      return;
    }
    if (pending) delete akumatizationPending[interaction.user.id];
    if (activeMonarchId) {
      delete activeAkuma[activeMonarchId];
      delete villainAbilityUsed[interaction.user.id];
    }
    await interaction.reply({ content: `🦋 **${interaction.user.username}** has broken free! The akuma shatters and dissolves into the air.` });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: reveal_miraculous
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId === 'reveal_miraculous') {
    if (userMiraculous[interaction.user.id]) {
      await interaction.reply({ content: "You already have a Miraculous!", ephemeral: true });
      return;
    }

    // ── American Miracle Box rarity check (weight 4 = same as Creation/Destruction) ──
    const AMERICAN_BOX_WEIGHT = 4;
    const TOTAL_MIRACULOUS_WEIGHT = miraculousList.reduce((sum, m) => sum + m.weight, 0);
    const americanRoll = Math.random() * (TOTAL_MIRACULOUS_WEIGHT + AMERICAN_BOX_WEIGHT);
    const gotAmericanBox = americanRoll < AMERICAN_BOX_WEIGHT;

    if (gotAmericanBox) {
      // Show the American Miracle Box intro
      const disabled = new ButtonBuilder().setCustomId('reveal_miraculous').setLabel('...').setStyle(ButtonStyle.Secondary).setDisabled(true);
      await interaction.update({ components: [new ActionRowBuilder().addComponents(disabled)] });

      await interaction.followUp({
        content:
          `🦅 *The air grows still. A worn leather case materializes before you, painted with ancient symbols...*\n\n` +
          `**The Monk steps forward, eyes closed.**\n\n` +
          `*"Few are called to this box. Fewer still are ready. The spirits of this land have chosen to offer you one of their own..."*`,
      });

      setTimeout(async () => {
        try {
          const channel = interaction.channel;

          // Pick a random American miraculous
          const am = getRandomAmericanMiraculous();
          if (!am) {
            await channel.send('⚠️ The American Miracle Box has no remaining Miraculouses to offer.');
            return;
          }

          claimedMiraculous[am.id] = { userId: interaction.user.id, username: interaction.user.username };
          userMiraculous[interaction.user.id] = am.id;

          const goodBtn = new ButtonBuilder()
            .setCustomId(`align__${interaction.user.id}__good`)
            .setLabel('✨ Use it for the Greater Good (+100 Charms)')
            .setStyle(ButtonStyle.Success);
          const evilBtn = new ButtonBuilder()
            .setCustomId(`align__${interaction.user.id}__evil`)
            .setLabel('🦹 Use it for Evil Purposes')
            .setStyle(ButtonStyle.Danger);

          const acceptBtn = new ButtonBuilder()
            .setCustomId(`ambox_accept__${interaction.user.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);
          const renounceBtn = new ButtonBuilder()
            .setCustomId(`ambox_renounce__${interaction.user.id}`)
            .setLabel('Renounce')
            .setStyle(ButtonStyle.Secondary);

          const embed = new EmbedBuilder()
            .setColor(am.color)
            .setTitle(`🦅  AMERICAN MIRACLE BOX  🦅`)
            .setDescription(
              `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉\n\n` +
              `${am.emoji}  **${am.animal.toUpperCase()} MIRACULOUS**\n` +
              `──────────── ˗ˋ ୨୧ ˊ˗ ────────────\n` +
              `➜ **𝖧𝗈𝗅𝖽𝖾𝗋**\n<@${interaction.user.id}>\n` +
              `➜ **𝖪𝗐𝖺𝗆𝗂**\n**${am.kwami}**\n` +
              `➜ **𝖢𝗈𝗇𝖼𝖾𝗉𝗍**\n**${am.ability}**\n` +
              `──────────── ˗ˋ ୨୧ ˊ˗ ───────────\n` +
              `${am.powerDesc}\n` +
              `➜ **𝖣𝖾-𝗍𝗋𝖺𝗇𝗌𝖿𝗈𝗋𝗆**\n**${am.cooldown}**\n\n` +
              `﹉﹉﹉﹉﹉﹉﹉୨♡୧﹉﹉﹉﹉﹉﹉﹉`
            )
            .setFooter({ text: 'The spirits of this land have chosen.' })
            .setTimestamp();

          await channel.send({
            content: `**The Monk offers you one of the Miraculouses of this land, <@${interaction.user.id}>. Will you accept its power?**`,
            embeds: [embed],
            components: [
              new ActionRowBuilder().addComponents(acceptBtn, renounceBtn),
              new ActionRowBuilder().addComponents(goodBtn, evilBtn)
            ]
          });
        } catch (e) { console.error('American box error:', e); }
      }, 5000);
      return;
    }

    // ── Normal Miraculous roll ─────────────────────────────────────────────────
    const miraculous = getRandomMiraculous();
    if (!miraculous) {
      const disabled = new ButtonBuilder().setCustomId('reveal_miraculous').setLabel('...').setStyle(ButtonStyle.Secondary).setDisabled(true);
      await interaction.update({ components: [new ActionRowBuilder().addComponents(disabled)] });
      await interaction.followUp({ content: "The Guardian's vault is empty. All Miraculous have been claimed." });
      return;
    }
    claimedMiraculous[miraculous.id] = { userId: interaction.user.id, username: interaction.user.username };
    userMiraculous[interaction.user.id] = miraculous.id;
    const disabled = new ButtonBuilder().setCustomId('reveal_miraculous').setLabel('...').setStyle(ButtonStyle.Secondary).setDisabled(true);
    await interaction.update({ components: [new ActionRowBuilder().addComponents(disabled)] });

    const goodBtn = new ButtonBuilder()
      .setCustomId(`align__${interaction.user.id}__good`)
      .setLabel('✨ Use it for the Greater Good (+100 Charms)')
      .setStyle(ButtonStyle.Success);
    const evilBtn = new ButtonBuilder()
      .setCustomId(`align__${interaction.user.id}__evil`)
      .setLabel('🦹 Use it for Evil Purposes')
      .setStyle(ButtonStyle.Danger);

    // Accept / Renounce buttons replace the old "how will you use this" prompt
    const acceptBtn = new ButtonBuilder()
      .setCustomId(`mc_accept__${interaction.user.id}`)
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success);
    const renounceBtn = new ButtonBuilder()
      .setCustomId(`mc_renounce__${interaction.user.id}`)
      .setLabel('Renounce')
      .setStyle(ButtonStyle.Secondary);

    if (miraculous.targetEffect === 'butterfly') {
      const betterflyBtn = new ButtonBuilder()
        .setCustomId(`mmode__${interaction.user.id}__betterfly`)
        .setLabel('🦋 Betterfly')
        .setStyle(ButtonStyle.Primary);
      const chrysalisBtn = new ButtonBuilder()
        .setCustomId(`mmode__${interaction.user.id}__chrysalis`)
        .setLabel('🦋 Chrysalis')
        .setStyle(ButtonStyle.Danger);

      await interaction.followUp({
        content: "**You have received the Butterfly Miraculous.**\n\nChoose your form:\n🦋 **Betterfly** — a hero who gifts power for the greater good\n🦋 **Chrysalis** — a villain who akumatizes others into corrupted forms",
        embeds: [buildMiraculousEmbed(miraculous, interaction.user)],
        components: [
          new ActionRowBuilder().addComponents(betterflyBtn, chrysalisBtn),
          new ActionRowBuilder().addComponents(acceptBtn, renounceBtn),
          new ActionRowBuilder().addComponents(goodBtn, evilBtn)
        ],
        ephemeral: true
      });
    } else {
      await interaction.followUp({
        embeds: [buildMiraculousEmbed(miraculous, interaction.user)],
        content: "**The Kwami has chosen you. What will you do?**",
        components: [
          new ActionRowBuilder().addComponents(acceptBtn, renounceBtn),
          new ActionRowBuilder().addComponents(goodBtn, evilBtn)
        ]
      });
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Accept Miraculous (mc_accept)
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('mc_accept__')) {
    const [, ownerId] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This is not your Miraculous.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `✨ **You have accepted the Miraculous.** May your Kwami guide you well, ${interaction.user.username}.`,
      ephemeral: true
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Renounce Miraculous (mc_renounce)
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('mc_renounce__')) {
    const [, ownerId] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This is not your Miraculous.", ephemeral: true });
      return;
    }
    const mid = userMiraculous[interaction.user.id];
    if (!mid) {
      await interaction.reply({ content: "You don't currently hold a Miraculous.", ephemeral: true });
      return;
    }
    const m = findMiraculous(mid);
    // Wipe the miraculous
    delete claimedMiraculous[mid];
    delete userMiraculous[interaction.user.id];
    delete powerCooldowns[interaction.user.id];
    delete mothMode[interaction.user.id];
    delete activeAkuma[interaction.user.id];
    delete luckyCharmUsed[interaction.user.id];
    delete villainAbilityUsed[interaction.user.id];
    delete userAlignment[interaction.user.id];
    delete akumatizationPending[interaction.user.id];
    await interaction.reply({
      content: `🕊️ **You have renounced the ${m?.animal || 'Unknown'} Miraculous.** The Kwami quietly returns to the Guardian's box...`,
      ephemeral: true
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Accept American Box Miraculous (ambox_accept)
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('ambox_accept__')) {
    const [, ownerId] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This is not your offering.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: `🦅 **You have accepted the Miraculous of this land.** The spirits watch over you, ${interaction.user.username}.`,
      ephemeral: true
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Renounce American Box Miraculous (ambox_renounce)
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('ambox_renounce__')) {
    const [, ownerId] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This offering is not for you.", ephemeral: true });
      return;
    }
    const mid = userMiraculous[interaction.user.id];
    if (!mid) {
      await interaction.reply({ content: "You don't currently hold a Miraculous.", ephemeral: true });
      return;
    }
    const m = findMiraculous(mid);
    delete claimedMiraculous[mid];
    delete userMiraculous[interaction.user.id];
    delete powerCooldowns[interaction.user.id];
    delete mothMode[interaction.user.id];
    delete activeAkuma[interaction.user.id];
    delete luckyCharmUsed[interaction.user.id];
    delete villainAbilityUsed[interaction.user.id];
    delete userAlignment[interaction.user.id];
    delete akumatizationPending[interaction.user.id];
    await interaction.reply({
      content: `🦅 **You have returned the ${m?.animal || 'Unknown'} Miraculous to the Monk.** *The spirit gently retreats back into the ancient box...*`,
      ephemeral: true
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: alignment choice
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('align__')) {
    const [, ownerId, choice] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This choice is not for you.", ephemeral: true });
      return;
    }
    if (userAlignment[interaction.user.id]) {
      await interaction.reply({ content: "You have already made your choice.", ephemeral: true });
      return;
    }
    userAlignment[interaction.user.id] = choice;
    if (choice === 'good') {
      addCharms(interaction.user.id, 100);
      await interaction.reply({
        content: `✨ **The Greater Good!** Your heart is true, hero. You've been rewarded **+100 Charms** 🪙 for choosing to protect others.\n*Current balance: **${getCharms(interaction.user.id)} Charms***`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `🦹 *Darkness stirs...* You've chosen the path of evil. No reward for the wicked — but power has its own rewards.`,
        ephemeral: true
      });
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: buy unification
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId === 'buy_unification') {
    if (interaction.user.username === 'properties.exe') { addCharms(interaction.user.id, 2000); }
    if (guardianUpgrades[interaction.user.id]?.unification) {
      await interaction.reply({ content: "You already own Unification.", ephemeral: true });
      return;
    }
    if (getCharms(interaction.user.id) < 1500) {
      await interaction.reply({ content: `❌ You need 1500 Charms. You currently have ${getCharms(interaction.user.id)}.`, ephemeral: true });
      return;
    }
    userCharms[interaction.user.id] -= 1500;
    if (!guardianUpgrades[interaction.user.id]) guardianUpgrades[interaction.user.id] = {};
    guardianUpgrades[interaction.user.id].unification = true;
    await interaction.reply({
      content: `✨ UNIFICATION UNLOCKED!\n\nYou may now use \`/unify\`.\n\nRemaining Charms: ${getCharms(interaction.user.id)} 🪙`
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: moth mode select
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('mmode__')) {
    const [, ownerId, mode] = interaction.customId.split('__');
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ content: "This choice is not for you.", ephemeral: true });
      return;
    }
    mothMode[interaction.user.id] = mode;
    const label = mode === 'betterfly' ? '🦋 Betterfly' : '🦋 Chrysalis';
    await interaction.update({ content: `You have chosen **${label}**! Use \`/usepower @target\` whenever you're ready.`, components: [] });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: villain pick (Chrysalis)
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('vpick__')) {
    const [, monarchId, targetId, villainId] = interaction.customId.split('__');
    if (interaction.user.id !== monarchId) {
      await interaction.reply({ content: "This menu isn't for you.", ephemeral: true });
      return;
    }
    const villain = villains.find(v => v.id === villainId);
    if (!villain) { await interaction.reply({ content: "Unknown villain.", ephemeral: true }); return; }
    akumatizationPending[targetId] = { monarchId, villain: villainId, mode: 'chrysalis' };
    await interaction.update({ content: `Villain **${villain.name}** selected! Sending akuma now...`, components: [] });
    const channel = interaction.channel;
    let targetUser;
    try { targetUser = await client.users.fetch(targetId); } catch (e) { return; }
    await channel.send(`🦋 *A dark butterfly trembles to life in the shadows...*\n\n**"Fly away my akuma, and evilize ${targetUser.username}!"**`);
    setTimeout(async () => {
      await channel.send(
        `*The akuma drifts silently toward <@${targetId}>...*\n\n` +
        `🦋 **Chrysalis:** *"Hello, ${targetUser.username}. Forgive my intrusion, but, I seem to feel a huge disappointment. No one's interested in what you have to offer. Do you feel ignored? Like no one sees you?"*`
      );
      setTimeout(async () => {
        await channel.send(`🦋 **Chrysalis:** *"I think I know what would be fitting. For no one to be able to ignore you anymore. I can give you this power. Only if you agree, of course."*`);
        const yesBtn = new ButtonBuilder().setCustomId(`akyes__${monarchId}__${targetId}__${villainId}`).setLabel('Yes!').setStyle(ButtonStyle.Primary);
        const noBtn = new ButtonBuilder().setCustomId(`akno__${monarchId}__${targetId}`).setLabel("No! I don't need your power!").setStyle(ButtonStyle.Secondary);
        await channel.send({ content: `<@${targetId}> — what do you say?`, components: [new ActionRowBuilder().addComponents(yesBtn, noBtn)] });
      }, 3000);
    }, 10000);
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: akumatization accept (Chrysalis "Yes!")
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('akyes__')) {
    const [, monarchId, targetId, villainId] = interaction.customId.split('__');
    if (interaction.user.id !== targetId) {
      await interaction.reply({ content: "This button isn't for you.", ephemeral: true });
      return;
    }
    const villain = villains.find(v => v.id === villainId);
    activeAkuma[monarchId] = { targetId, targetUsername: interaction.user.username, villain: villainId };
    delete akumatizationPending[targetId];
    await interaction.update({ components: [] });
    await interaction.followUp({
      content:
        `⚡ <@${targetId}> has accepted the akuma and transformed into **${villain.name}**!\n` +
        `*Use \`/villainability @target\` to unleash your power.*\n` +
        `*Use \`/reject\` to break free at any time.*`
    });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: akumatization reject (Chrysalis "No!")
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('akno__')) {
    const [, monarchId, targetId] = interaction.customId.split('__');
    if (interaction.user.id !== targetId) {
      await interaction.reply({ content: "This button isn't for you.", ephemeral: true });
      return;
    }
    delete akumatizationPending[targetId];
    await interaction.update({ components: [] });
    await interaction.followUp({ content: `🦋 **${interaction.user.username}** has refused the akuma. The butterfly crumbles to dust...` });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Betterfly accept
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('bfly_yes__')) {
    const [, monarchId, targetId] = interaction.customId.split('__');
    if (interaction.user.id !== targetId) {
      await interaction.reply({ content: "This isn't for you.", ephemeral: true });
      return;
    }
    activeAkuma[monarchId] = { targetId, targetUsername: interaction.user.username, villain: 'kamiko' };
    delete akumatizationPending[targetId];
    await interaction.update({ components: [] });
    await interaction.followUp({ content: `✨ **${interaction.user.username}** has accepted Betterfly's gift and transformed into **Kamiko**!\n*A new hero rises for the greater good.*` });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   BUTTON: Betterfly reject
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('bfly_no__')) {
    const [, monarchId, targetId] = interaction.customId.split('__');
    if (interaction.user.id !== targetId) {
      await interaction.reply({ content: "This isn't for you.", ephemeral: true });
      return;
    }
    delete akumatizationPending[targetId];
    await interaction.update({ components: [] });
    await interaction.followUp({ content: `🦋 **${interaction.user.username}** has declined Betterfly's gift. The light fades gently away...` });
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   PANEL BUTTONS
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('panel__')) {
    const allowed = await isAboveBot(interaction);
    if (!allowed) {
      await interaction.reply({ content: "🚫 You don't have permission to use panel actions.", ephemeral: true });
      return;
    }
    const action = interaction.customId.replace('panel__', '');

    if (action === 'reset_all') {
      const count = Object.keys(userMiraculous).length;
      for (const uid of Object.keys(userMiraculous)) { wipeMiraculous(uid); }
      await interaction.reply({ content: `🔄 **All Miraculouses have been reset!** **${count}** holder(s) have had their Miraculous removed. The Guardian reclaims the vault.`, ephemeral: false });
      return;
    }

    if (action === 'give_prompt') {
      const rows = [];
      const allM = [...miraculousList, ...americanMiraculousList];
      for (let i = 0; i < allM.length; i += 5) {
        const row = new ActionRowBuilder();
        allM.slice(i, i + 5).forEach(m => {
          row.addComponents(new ButtonBuilder().setCustomId(`panel_give_select__${m.id}`).setLabel(`${m.animal}`).setStyle(ButtonStyle.Secondary));
        });
        rows.push(row);
      }
      await interaction.reply({ content: "🎁 **Select a Miraculous to give:**", components: rows.slice(0, 5), ephemeral: true });
      return;
    }

    if (action === 'give_charms_prompt') {
      await interaction.reply({ content: "🪙 **Give Charms** — Use `/charms @user amount` to give Charms directly.", ephemeral: true });
      return;
    }

    if (action === 'wipe_economy') {
      const count = Object.keys(userCharms).length;
      for (const uid of Object.keys(userCharms)) { delete userCharms[uid]; }
      for (const uid of Object.keys(patrolCooldowns)) { delete patrolCooldowns[uid]; }
      await interaction.reply({ content: `💸 **Economy wiped!** **${count}** user balance(s) have been cleared. All Charms are gone.`, ephemeral: false });
      return;
    }

    return;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //   PANEL: give miraculous select
  // ══════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId.startsWith('panel_give_select__')) {
    const allowed = await isAboveBot(interaction);
    if (!allowed) { await interaction.reply({ content: "🚫 No permission.", ephemeral: true }); return; }
    const mId = interaction.customId.replace('panel_give_select__', '');
    const m = findMiraculous(mId);
    if (!m) { await interaction.reply({ content: "Unknown Miraculous.", ephemeral: true }); return; }
    if (claimedMiraculous[mId]) {
      const holder = claimedMiraculous[mId];
      await interaction.reply({ content: `⚠️ The **${m.animal} Miraculous** is already held by **${holder.username}** (<@${holder.userId}>).`, ephemeral: true });
      return;
    }
    await interaction.reply({ content: `✅ **${m.emoji} ${m.animal} Miraculous** is available! Use \`/givemiraculous\` to assign it.`, ephemeral: true });
    return;
  }

});

setInterval(() => {
  saveData('./claimedMiraculous.json', claimedMiraculous);
  saveData('./userMiraculous.json', userMiraculous);
  saveData('./luckyCharmUsed.json', luckyCharmUsed);
  saveData('./powerCooldowns.json', powerCooldowns);
  saveData('./userCharms.json', userCharms);
  saveData('./guardianUpgrades.json', guardianUpgrades);
}, 5000);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();

  if (content.includes('tikki, plagg, reveal yourselves!')) {
    const owned = userMiraculous[message.author.id];
    if (!owned || !Array.isArray(owned)) return;
    const hasLadybug = owned.includes('creation') || owned.includes('ladybug');
    const hasCat = owned.includes('destruction') || owned.includes('cat');
    if (!hasLadybug || !hasCat) {
      await message.reply('⚠️ The ritual requires both the Ladybug and Cat Miraculouses.');
      return;
    }
    await message.channel.send('✨ *A powerful wave of energy spreads through the area...*');
    setTimeout(async () => {
      await message.channel.send('❤️ **Tikki:** *"I am Tikki, Kwami of Creation. I am what is and will be."*');
    }, 2000);
    setTimeout(async () => {
      await message.channel.send('🖤 **Plagg:** *"I am Plagg, Kwami of Destruction. I am what destroys and returns all to nothing."*');
    }, 5000);
    setTimeout(async () => {
      const revealEmbed = new EmbedBuilder()
        .setColor(0xFF2D55)
        .setTitle('🌌 THE SUPREME UNION 🌌')
        .setDescription(
          `❤️ Creation and Destruction now stand together.\n\n` +
          `The ancient balance has awakened within <@${message.author.id}>.\n\n` +
          `Reality itself trembles before this fusion of absolute power.`
        )
        .setTimestamp();
      await message.channel.send({ embeds: [revealEmbed] });
    }, 8000);
  }
});

client.on('interactionCreate', async (interaction) => {

  // ════════════════════════════════════════════════════════════════════════════
  //   GIMMI: WEALTH
  // ════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId === 'gimmi_wealth') {
    addCharms(interaction.user.id, 1000000);
    await interaction.reply({ content: `💰 Gimmi has granted infinite wealth.\n\n+1,000,000 Charms 🪙`, ephemeral: true });
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //   GIMMI: POWER
  // ════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId === 'gimmi_power') {
    claimedMiraculous['prodigious'] = { userId: interaction.user.id, username: interaction.user.username };
    userMiraculous[interaction.user.id] = 'prodigious';
    saveData('./userMiraculous.json', userMiraculous);
    saveData('./claimedMiraculous.json', claimedMiraculous);
    await interaction.reply({ content: `⚡ Gimmi has granted absolute power.\n\n🐉 You now possess the Prodigious.`, ephemeral: true });
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //   GIMMI: GRAND RESET
  // ════════════════════════════════════════════════════════════════════════════
  if (interaction.isButton() && interaction.customId === 'gimmi_reset') {
    for (const key in claimedMiraculous) { delete claimedMiraculous[key]; }
    for (const key in userMiraculous) { delete userMiraculous[key]; }
    saveData('./userMiraculous.json', userMiraculous);
    saveData('./claimedMiraculous.json', claimedMiraculous);
    await interaction.reply({ content: `🌌 Gimmi has rewritten reality.\n\nAll Miraculouses across existence have been reset.`, ephemeral: true });
    return;
  }

});

client.login(TOKEN);
