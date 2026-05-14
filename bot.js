// ============================================================
//  Miraculous Ladybug RPG Bot - Discord.js v14
//  v12.0 Masterwork - Deep Logic Integration Rework
//  Single file, slash commands only, one interactionCreate
// ============================================================

const { 
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

try {
  require("dotenv").config();
} catch (_) {
  // dotenv is optional at runtime, but included in package.json for local hosting.
}

// -- Config --------------------------------------------------
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || "1494316404265189519";
const GUILD_IDS = (process.env.GUILD_IDS || "1474746184827404320,1482324961149587550")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);
const DATA_FILE = path.join(__dirname, "data.json");

if (!TOKEN) {
  console.error("Missing DISCORD_TOKEN. Set it in your environment before starting the bot.");
  process.exit(1);
}

// -- Timers / Constants -------------------------------------
const TURN_TIMEOUT_MS = 10_000;
const BATTLE_ABANDON_MS = 300_000;
const PVE_ABANDON_MS = 300_000;
const CLAN_MAX_MEMBERS = 15;
const CLAN_CREATE_COST = 5000;
const IDENTITY_CHOICE_MS = 24 * 60 * 60 * 1000;
const ADMIN_IDS = (process.env.ADMIN_IDS || "999672061221929071")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

let CLAIMS_DISABLED = false;

// -- Thumbnails ---------------------------------------------
const THUMBNAILS = {
  bug: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840298140237845/17cfbc476889d874b68a1a7acc8a93ad.jpg",
  cat: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840259456045056/a69d95dc12cb6eed18771013e23e26c1.jpg",
  fox: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840295506087986/0498c841e65f890291028eb8008ddfee.jpg",
  bee: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840292561555496/278a29181c37bcdf6d2d354c764a4da7.jpg",
  turtle: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840294776410154/08e1b0ba4729f294b6b58fb5fe657c6f.jpg",
  butterfly: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840258831089846/e0a605c59b870bfcd699912ec7f3b03e.jpg",
  peacock: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840293782355988/ad40507fe42e354f3370e46732f850f9.jpg",
  rooster: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840296999125022/ba0134bdbdb09e5008c247c2c088f9a2.jpg",
  goat: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840297645183006/37aeb0b470c5a3188c464a4498d87324.jpg",
  monkey: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840296479162388/40d20e60cc7521d096bd9c038edf7735.jpg",
  mouse: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840296043090002/8dc7d04133d64807849ea4b062eb1330.jpg",
  horse: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840256633409578/Screenshot_2026_0401_230601.jpg",
  snake: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840257941770371/Screenshot_20260401_230409.jpg",
  pig: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840255777505380/Screenshot_2026_0401_230712.jpg",
  rabbit: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840258424377344/89af6b723f2b49613e6b7bbce33e1b6b.jpg",
  dog: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840256138346537/Screenshot_2026_0401_230632.jpg",
  ox: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840259967881286/3b70e7af7407f06df4a21ab4ff85bc20_1.jpg",
  tiger: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840255777505380/Screenshot_2026_0401_230712.jpg",
  dragon: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840255353884783/Screenshot_2026_0401_230948.jpg",
  bat: "https://cdn.discordapp.com/attachments/1483585568657903766/1501840298140237845/17cfbc476889d874b68a1a7acc8a93ad.jpg",
};

// -- Miraculous Definitions --------------------------------
const MIRACULOUSES = {
  bug: {
    name: "Ladybug Miraculous", hero: "Ladybug", power: "Lucky Charm",
    rarity: "legendary", rarityWeight: 2, baseHp: 200, baseAtk: 45, color: 0xe74c3c,
    description: "The miraculous of creation. Grants Lucky Charm and Miraculous Ladybug.",
  },
  cat: {
    name: "Cat Miraculous", hero: "Chat Noir", power: "Cataclysm",
    rarity: "legendary", rarityWeight: 2, baseHp: 190, baseAtk: 50, color: 0x2c2c2c,
    description: "The miraculous of destruction. Cataclysm is now a massive burst with a long cooldown.",
  },
  butterfly: {
    name: "Butterfly Miraculous", hero: "Monarch", power: "Akumatization",
    rarity: "legendary", rarityWeight: 2, baseHp: 180, baseAtk: 55, color: 0x8e44ad,
    description: "The miraculous of transmission. Grants the power to corrupt.",
  },
  peacock: {
    name: "Peacock Miraculous", hero: "Mayura", power: "Amokization",
    rarity: "legendary", rarityWeight: 2, baseHp: 175, baseAtk: 52, color: 0x2980b9,
    description: "The miraculous of emotion. Grants the power to create sentimonsters.",
  },
  bat: {
    name: "Bat Miraculous", hero: "Nightveil", power: "Devocalization",
    rarity: "legendary", rarityWeight: 0, baseHp: 185, baseAtk: 47, color: 0x1a0a2e,
    description: "The miraculous of silence. Strips the enemy of their voice and powers.",
    adminOnly: true,
  },
  fox: {
    name: "Fox Miraculous", hero: "Rena Rouge", power: "Mirage",
    rarity: "epic", rarityWeight: 6, baseHp: 160, baseAtk: 40, color: 0xe67e22,
    description: "The miraculous of illusion. Creates perfect illusions.",
  },
  bee: {
    name: "Bee Miraculous", hero: "Queen Bee", power: "Venom",
    rarity: "epic", rarityWeight: 6, baseHp: 155, baseAtk: 42, color: 0xf1c40f,
    description: "The miraculous of subjection. Venom now stuns for two full enemy turns.",
  },
  turtle: {
    name: "Turtle Miraculous", hero: "Carapace", power: "Shell-ter",
    rarity: "epic", rarityWeight: 6, baseHp: 200, baseAtk: 30, color: 0x27ae60,
    description: "The miraculous of protection. Creates an impenetrable shield.",
  },
  dragon: {
    name: "Dragon Miraculous", hero: "Ryuko", power: "Elemental Control",
    rarity: "epic", rarityWeight: 6, baseHp: 170, baseAtk: 48, color: 0xc0392b,
    description: "The miraculous of perfection. Commands wind, lightning, fire and water.",
  },
  rooster: {
    name: "Rooster Miraculous", hero: "King Rooster", power: "Sublimation",
    rarity: "rare", rarityWeight: 12, baseHp: 145, baseAtk: 35, color: 0xd35400,
    description: "The miraculous of valor. Grants random power boosts.",
  },
  snake: {
    name: "Snake Miraculous", hero: "Viperion", power: "Second Chance",
    rarity: "rare", rarityWeight: 12, baseHp: 150, baseAtk: 36, color: 0x16a085,
    description: "The miraculous of intuition. Second Chance resets HP to full once per battle.",
  },
  horse: {
    name: "Horse Miraculous", hero: "Pegasus", power: "Voyage",
    rarity: "rare", rarityWeight: 12, baseHp: 155, baseAtk: 34, color: 0x7f8c8d,
    description: "The miraculous of travel. Opens portals to teleport and dodge.",
  },
  monkey: {
    name: "Monkey Miraculous", hero: "King Monkey", power: "Uproar",
    rarity: "rare", rarityWeight: 12, baseHp: 148, baseAtk: 37, color: 0xd4ac0d,
    description: "The miraculous of jubilation. Neutralizes superpowers.",
  },
  rabbit: {
    name: "Rabbit Miraculous", hero: "Bunnyx", power: "Burrow",
    rarity: "rare", rarityWeight: 12, baseHp: 152, baseAtk: 38, color: 0xf0e6ff,
    description: "The miraculous of time. Creates portals through time.",
  },
  goat: {
    name: "Goat Miraculous", hero: "Caprikid", power: "Genesis",
    rarity: "uncommon", rarityWeight: 18, baseHp: 135, baseAtk: 30, color: 0xbdc3c7,
    description: "The miraculous of passion. Creates useful objects in desperate moments.",
  },
  mouse: {
    name: "Mouse Miraculous", hero: "Polymouse", power: "Multitude",
    rarity: "uncommon", rarityWeight: 18, baseHp: 130, baseAtk: 28, color: 0xecf0f1,
    description: "The miraculous of multiplication. Splits into many copies.",
  },
  pig: {
    name: "Pig Miraculous", hero: "Pigella", power: "Gift",
    rarity: "uncommon", rarityWeight: 18, baseHp: 128, baseAtk: 27, color: 0xff99cc,
    description: "The miraculous of jubilation. Heals and supports allies.",
  },
  ox: {
    name: "Ox Miraculous", hero: "Minotaurox", power: "Resistance",
    rarity: "uncommon", rarityWeight: 18, baseHp: 175, baseAtk: 26, color: 0x6c3483,
    description: "The miraculous of determination. Grants immense resistance.",
  },
  tiger: {
    name: "Tiger Miraculous", hero: "Purple Tigress", power: "Clout",
    rarity: "uncommon", rarityWeight: 18, baseHp: 145, baseAtk: 32, color: 0xf39c12,
    description: "The miraculous of elation. Charge Clout first, then unleash tremendous force.",
  },
  dog: {
    name: "Dog Miraculous", hero: "Miss Hound", power: "Fetch",
    rarity: "common", rarityWeight: 28, baseHp: 120, baseAtk: 24, color: 0xa0522d,
    description: "The miraculous of adoration. Retrieves the marked target or steals buffs.",
  },
};

// -- Status Effect Registry --------------------------------
const STATUS = {
  burn: { id: "burn", label: "Burning", emoji: "Fire", maxStacks: 1 },
  stun: { id: "stun", label: "Stunned", emoji: "Stun", maxStacks: 1 },
  confused: { id: "confused", label: "Confused", emoji: "Daze", maxStacks: 1 },
  shield: { id: "shield", label: "Shielded", emoji: "Shield", maxStacks: 4 },
  regen: { id: "regen", label: "Regenerating", emoji: "Regen", maxStacks: 1 },
  blessed: { id: "blessed", label: "Blessed", emoji: "Star", maxStacks: 1 },
  corrupted: { id: "corrupted", label: "Corrupted", emoji: "Akuma", maxStacks: 1 },
  immune: { id: "immune", label: "Immune", emoji: "Immune", maxStacks: 1 },
  dodge: { id: "dodge", label: "Evasion", emoji: "Dodge", maxStacks: 1 },
  disabled: { id: "disabled", label: "Disabled", emoji: "Lock", maxStacks: 1 },
  silenced: { id: "silenced", label: "Silenced", emoji: "Mute", maxStacks: 1 },
  foresight: { id: "foresight", label: "Foresight", emoji: "Eye", maxStacks: 1 },
  weakened: { id: "weakened", label: "Weakened", emoji: "Weak", maxStacks: 1 },
  defending: { id: "defending", label: "Defending", emoji: "Guard", maxStacks: 1 },
  burrow_anchor: { id: "burrow_anchor", label: "Timeline Anchored", emoji: "Burrow", maxStacks: 1 },
};

// -- Lore Item Registry ------------------------------------
const ITEMS = {
  purified_butterfly: { id: "purified_butterfly", name: "Purified Butterfly", category: "materials", rarity: "common", description: "A cleansed butterfly freed from akuma corruption." },
  cracked_lucky_charm: { id: "cracked_lucky_charm", name: "Cracked Lucky Charm", category: "materials", rarity: "common", description: "A damaged creation charm that still glows with Ladybug magic." },
  tikki_lucky_thread: { id: "tikki_lucky_thread", name: "Tikki's Lucky Thread", category: "materials", rarity: "rare", description: "Creation thread spun from pure lucky energy." },
  trixx_mirage_dust: { id: "trixx_mirage_dust", name: "Trixx's Mirage Dust", category: "materials", rarity: "uncommon", description: "A glittering residue from a perfect illusion." },
  pollen_stinger: { id: "pollen_stinger", name: "Pollen's Stinger", category: "materials", rarity: "uncommon", description: "A crystallized bee stinger filled with immobilizing magic." },
  wayzz_shell_fragment: { id: "wayzz_shell_fragment", name: "Wayzz Shell Fragment", category: "materials", rarity: "uncommon", description: "A fragment of turtle shield energy." },
  sass_shed_skin: { id: "sass_shed_skin", name: "Sass's Shed Skin", category: "materials", rarity: "rare", description: "A shimmering scale of time-intuition magic." },
  longg_dragon_scale: { id: "longg_dragon_scale", name: "Longg Dragon Scale", category: "materials", rarity: "rare", description: "A scale carrying wind, water, lightning, and fire." },
  scorched_akuma_mask: { id: "scorched_akuma_mask", name: "Scorched Akuma Mask", category: "materials", rarity: "common", description: "A villain mask burned by miraculous energy." },
  akuma_core: { id: "akuma_core", name: "Akuma Core", category: "materials", rarity: "epic", description: "The hardened center of a powerful akuma." },
  duusu_feather: { id: "duusu_feather", name: "Duusu's Feather", category: "materials", rarity: "rare", description: "A blue feather charged with emotion magic." },
  red_moon_dust: { id: "red_moon_dust", name: "Red Moon Dust", category: "materials", rarity: "epic", description: "Rare dust left by a lunar amok event." },
  trixx_ember: { id: "trixx_ember", name: "Trixx Ember", category: "materials", rarity: "uncommon", description: "A warm illusion ember from Rena Rouge's magic." },
  nooroo_dark_wing: { id: "nooroo_dark_wing", name: "Nooroo Dark Wing", category: "materials", rarity: "uncommon", description: "A dark butterfly wing carrying transmission magic." },
  kaalki_portal_gear: { id: "kaalki_portal_gear", name: "Kaalki Portal Gear", category: "materials", rarity: "rare", description: "A golden gear from a Voyage portal focus." },
  ladybug_purification_essence: { id: "ladybug_purification_essence", name: "Ladybug Purification Essence", category: "materials", rarity: "epic", description: "A bright essence that purifies corrupted magic." },
  nooroo_wing: { id: "nooroo_wing", name: "Nooroo Wing", category: "materials", rarity: "uncommon", description: "A butterfly wing humming with transmission energy." },
  fluff_clockwork: { id: "fluff_clockwork", name: "Fluff Clockwork", category: "materials", rarity: "rare", description: "A gear from Bunnyx's time burrow mechanism." },
  longg_storm_essence: { id: "longg_storm_essence", name: "Longg Storm Essence", category: "materials", rarity: "rare", description: "Condensed storm energy from the Dragon Miraculous." },
  stormy_thunder_core: { id: "stormy_thunder_core", name: "Stormy Thunder Core", category: "materials", rarity: "rare", description: "A crackling orb from Stormy Weather's powers." },
  frozen_tear: { id: "frozen_tear", name: "Frozen Tear", category: "materials", rarity: "uncommon", description: "A crystallized tear, magically frozen." },
  guardian_fabric: { id: "guardian_fabric", name: "Guardian Fabric", category: "materials", rarity: "rare", description: "Ancient cloth from guardian robes." },
  guardian_alloy_plate: { id: "guardian_alloy_plate", name: "Guardian Alloy Plate", category: "materials", rarity: "common", description: "A reinforced plate used in guardian training gear." },
  guardian_token: { id: "guardian_token", name: "Guardian Token", category: "materials", rarity: "epic", description: "A token given by the Order of the Guardians." },
  crimson_creation_thread: { id: "crimson_creation_thread", name: "Crimson Creation Thread", category: "materials", rarity: "rare", description: "Red thread dyed with creation energy." },
  bat_echo_crystal: { id: "bat_echo_crystal", name: "Bat Echo Crystal", category: "materials", rarity: "uncommon", description: "A crystal that stores sound vibrations." },
  spirit_bloom: { id: "spirit_bloom", name: "Spirit Bloom", category: "materials", rarity: "uncommon", description: "A flower that blooms near guardian shrines." },
  shadow_moth_ember: { id: "shadow_moth_ember", name: "Shadow Moth Ember", category: "materials", rarity: "epic", description: "An ember from Shadow Moth's dark energy." },
  kaalki_portal_shard: { id: "kaalki_portal_shard", name: "Kaalki Portal Shard", category: "materials", rarity: "rare", description: "A fragment of a Pegasus portal." },
  cosmic_kwami_dust: { id: "cosmic_kwami_dust", name: "Cosmic Kwami Dust", category: "materials", rarity: "legendary", description: "Stardust touched by unknown kwami magic." },
  sentimonster_titan_bone: { id: "sentimonster_titan_bone", name: "Sentimonster Titan Bone", category: "materials", rarity: "epic", description: "A bone fragment from a giant sentimonster." },
  kwami_energy_capsule: { id: "kwami_energy_capsule", name: "Kwami Energy Capsule", category: "materials", rarity: "common", description: "A compact capsule of condensed kwami energy." },
  lunar_essence: { id: "lunar_essence", name: "Lunar Essence", category: "materials", rarity: "epic", description: "Essence harvested during a miraculous lunar event." },
  eclipse_core: { id: "eclipse_core", name: "Eclipse Core", category: "materials", rarity: "legendary", description: "The core formed during a miraculous eclipse." },
  void_feather: { id: "void_feather", name: "Void Feather", category: "materials", rarity: "legendary", description: "A feather from beyond ordinary miraculous reality." },

  ancient_relic: { id: "ancient_relic", name: "Ancient Guardian Relic", category: "artifacts", rarity: "epic", description: "An artifact predating modern miraculous holders." },
  corrupted_crown: { id: "corrupted_crown", name: "Corrupted Monarch Crown", category: "artifacts", rarity: "epic", description: "A crown warped by years of dark power." },
  lost_miraculous_shard: { id: "lost_miraculous_shard", name: "Lost Miraculous Shard", category: "artifacts", rarity: "legendary", description: "A shard from an unknown miraculous." },
  celestial_emblem: { id: "celestial_emblem", name: "Celestial Kwami Emblem", category: "artifacts", rarity: "legendary", description: "An emblem bearing the mark of the cosmos." },

  fire_macaroon: { id: "fire_macaroon", name: "Fire Macaroon", category: "macaroons", rarity: "rare", description: "A spicy red macaroon. +20% damage, 15% burn chance on attacks.", effects: { dmgBonus: 20, burnChance: 15 } },
  ice_macaroon: { id: "ice_macaroon", name: "Ice Macaroon", category: "macaroons", rarity: "rare", description: "A cool blue macaroon. +25% dodge, 15% stun chance on attacks.", effects: { dodgeBonus: 25, stunChance: 15 } },
  water_macaroon: { id: "water_macaroon", name: "Water Macaroon", category: "macaroons", rarity: "rare", description: "A calm teal macaroon. Regeneration for 3 turns, +20 HP at battle start.", effects: { regenTurns: 3, hpBonus: 20 } },
  storm_macaroon: { id: "storm_macaroon", name: "Storm Macaroon", category: "macaroons", rarity: "epic", description: "A crackling violet macaroon. +30% special damage, 20% stun chance.", effects: { specialBonus: 30, stunChance: 20 } },
  shadow_macaroon: { id: "shadow_macaroon", name: "Shadow Macaroon", category: "macaroons", rarity: "epic", description: "A dark grey macaroon. +35% dodge, reduces enemy accuracy.", effects: { dodgeBonus: 35, enemyAccuracyReduction: true } },
  space_macaroon: { id: "space_macaroon", name: "Space Macaroon", category: "macaroons", rarity: "legendary", description: "A shimmering cosmic macaroon. +40 HP, +35% dodge, +25% damage, cooldown reduction.", effects: { hpBonus: 40, dodgeBonus: 35, dmgBonus: 25, cdReduction: true } },
  galaxy_macaroon: { id: "galaxy_macaroon", name: "Galaxy Macaroon", category: "macaroons", rarity: "legendary", description: "A nebula-swirled macaroon. Foresight for 2 turns, +20% special, stun immunity once.", effects: { foresightTurns: 2, specialBonus: 20, stunImmunity: true } },
  venom_macaroon: { id: "venom_macaroon", name: "Venom Macaroon", category: "macaroons", rarity: "epic", description: "A green-tinted macaroon. Burns enemies, +15% damage.", effects: { poisonOnHit: true, dmgBonus: 15 } },
};

const LEGACY_ITEM_ALIASES = {
  akuma_fragment: "purified_butterfly",
  broken_charm: "cracked_lucky_charm",
  lucky_thread: "tikki_lucky_thread",
  mirage_dust: "trixx_mirage_dust",
  venom_fang: "pollen_stinger",
  shell_fragment: "wayzz_shell_fragment",
  time_crystal: "sass_shed_skin",
  dragon_scale: "longg_dragon_scale",
  burnt_mask: "scorched_akuma_mask",
  corrupted_core: "akuma_core",
  sentimonster_claw: "duusu_feather",
  moon_dust: "red_moon_dust",
  fox_ember: "trixx_ember",
  dark_wing: "nooroo_dark_wing",
  stabilizer_gear: "kaalki_portal_gear",
  purification_essence: "ladybug_purification_essence",
  butterfly_wing: "nooroo_wing",
  rabbit_clockwork: "fluff_clockwork",
  storm_essence: "longg_storm_essence",
  thunder_core: "stormy_thunder_core",
  ancient_fabric: "guardian_fabric",
  alloy_plate: "guardian_alloy_plate",
  crimson_thread: "crimson_creation_thread",
  echo_crystal: "bat_echo_crystal",
  shadow_ember: "shadow_moth_ember",
  portal_shard: "kaalki_portal_shard",
  celestial_dust: "cosmic_kwami_dust",
  titan_bone: "sentimonster_titan_bone",
  energy_capsule: "kwami_energy_capsule",
};

const BATTLE_DROP_TABLE = [
  { id: "purified_butterfly", weight: 34, minQty: 1, maxQty: 3 },
  { id: "cracked_lucky_charm", weight: 32, minQty: 1, maxQty: 3 },
  { id: "kwami_energy_capsule", weight: 28, minQty: 1, maxQty: 2 },
  { id: "guardian_alloy_plate", weight: 22, minQty: 1, maxQty: 2 },
  { id: "nooroo_wing", weight: 18, minQty: 1, maxQty: 2 },
  { id: "trixx_mirage_dust", weight: 16, minQty: 1, maxQty: 2 },
  { id: "pollen_stinger", weight: 16, minQty: 1, maxQty: 2 },
  { id: "wayzz_shell_fragment", weight: 15, minQty: 1, maxQty: 2 },
  { id: "longg_dragon_scale", weight: 11, minQty: 1, maxQty: 1 },
  { id: "sass_shed_skin", weight: 11, minQty: 1, maxQty: 1 },
  { id: "tikki_lucky_thread", weight: 9, minQty: 1, maxQty: 1 },
  { id: "fluff_clockwork", weight: 8, minQty: 1, maxQty: 1 },
  { id: "kaalki_portal_shard", weight: 8, minQty: 1, maxQty: 1 },
  { id: "duusu_feather", weight: 8, minQty: 1, maxQty: 1 },
  { id: "akuma_core", weight: 7, minQty: 1, maxQty: 1 },
  { id: "longg_storm_essence", weight: 7, minQty: 1, maxQty: 1 },
  { id: "stormy_thunder_core", weight: 7, minQty: 1, maxQty: 1 },
  { id: "shadow_moth_ember", weight: 5, minQty: 1, maxQty: 1 },
  { id: "guardian_token", weight: 4, minQty: 1, maxQty: 1 },
  { id: "red_moon_dust", weight: 3, minQty: 1, maxQty: 1 },
  { id: "cosmic_kwami_dust", weight: 2, minQty: 1, maxQty: 1 },
  { id: "void_feather", weight: 1, minQty: 1, maxQty: 1 },
];

const PATROL_DROP_TABLE = [
  { id: "purified_butterfly", weight: 42, minQty: 1, maxQty: 4 },
  { id: "cracked_lucky_charm", weight: 40, minQty: 1, maxQty: 4 },
  { id: "kwami_energy_capsule", weight: 35, minQty: 1, maxQty: 3 },
  { id: "guardian_alloy_plate", weight: 28, minQty: 1, maxQty: 3 },
  { id: "nooroo_dark_wing", weight: 20, minQty: 1, maxQty: 2 },
  { id: "scorched_akuma_mask", weight: 20, minQty: 1, maxQty: 2 },
  { id: "trixx_ember", weight: 15, minQty: 1, maxQty: 2 },
  { id: "bat_echo_crystal", weight: 14, minQty: 1, maxQty: 2 },
  { id: "spirit_bloom", weight: 14, minQty: 1, maxQty: 2 },
  { id: "frozen_tear", weight: 13, minQty: 1, maxQty: 2 },
  { id: "kaalki_portal_gear", weight: 10, minQty: 1, maxQty: 1 },
  { id: "longg_storm_essence", weight: 9, minQty: 1, maxQty: 1 },
  { id: "duusu_feather", weight: 8, minQty: 1, maxQty: 1 },
  { id: "akuma_core", weight: 6, minQty: 1, maxQty: 1 },
  { id: "ladybug_purification_essence", weight: 5, minQty: 1, maxQty: 1 },
  { id: "guardian_fabric", weight: 5, minQty: 1, maxQty: 1 },
  { id: "crimson_creation_thread", weight: 4, minQty: 1, maxQty: 1 },
  { id: "sentimonster_titan_bone", weight: 3, minQty: 1, maxQty: 1 },
  { id: "lunar_essence", weight: 2, minQty: 1, maxQty: 1 },
  { id: "eclipse_core", weight: 1, minQty: 1, maxQty: 1 },
];

const MIRACULOUS_DROPS = {
  dragon: "longg_dragon_scale",
  butterfly: "nooroo_wing",
  cat: "akuma_core",
  snake: "sass_shed_skin",
  rabbit: "fluff_clockwork",
  horse: "kaalki_portal_shard",
  peacock: "duusu_feather",
  bug: "tikki_lucky_thread",
  fox: "trixx_ember",
  bee: "pollen_stinger",
  turtle: "wayzz_shell_fragment",
  tiger: "crimson_creation_thread",
  bat: "bat_echo_crystal",
};

const RECIPES = {
  fire_macaroon: { result: "fire_macaroon", qty: 1, ingredients: { trixx_ember: 2, stormy_thunder_core: 1, kwami_energy_capsule: 2 }, failChance: 0 },
  ice_macaroon: { result: "ice_macaroon", qty: 1, ingredients: { frozen_tear: 2, kaalki_portal_gear: 1, guardian_alloy_plate: 1 }, failChance: 0 },
  water_macaroon: { result: "water_macaroon", qty: 1, ingredients: { spirit_bloom: 2, frozen_tear: 1, kwami_energy_capsule: 2 }, failChance: 0 },
  storm_macaroon: { result: "storm_macaroon", qty: 1, ingredients: { longg_storm_essence: 2, stormy_thunder_core: 2, longg_dragon_scale: 1 }, failChance: 0 },
  shadow_macaroon: { result: "shadow_macaroon", qty: 1, ingredients: { shadow_moth_ember: 2, nooroo_dark_wing: 2, akuma_core: 1 }, failChance: 0 },
  venom_macaroon: { result: "venom_macaroon", qty: 1, ingredients: { pollen_stinger: 3, purified_butterfly: 2, scorched_akuma_mask: 1 }, failChance: 0 },
  space_macaroon: { result: "space_macaroon", qty: 1, ingredients: { cosmic_kwami_dust: 1, kaalki_portal_shard: 2, tikki_lucky_thread: 2, guardian_token: 1 }, failChance: 0.15 },
  galaxy_macaroon: { result: "galaxy_macaroon", qty: 1, ingredients: { lunar_essence: 1, eclipse_core: 1, void_feather: 1, ladybug_purification_essence: 2 }, failChance: 0.15 },
  ancient_relic: { result: "ancient_relic", qty: 1, ingredients: { guardian_fabric: 3, guardian_token: 2, guardian_alloy_plate: 2 }, failChance: 0 },
  lost_miraculous_shard: { result: "lost_miraculous_shard", qty: 1, ingredients: { akuma_core: 2, ladybug_purification_essence: 1, guardian_token: 2, red_moon_dust: 1 }, failChance: 0.15 },
  celestial_emblem: { result: "celestial_emblem", qty: 1, ingredients: { cosmic_kwami_dust: 2, eclipse_core: 1, void_feather: 1, crimson_creation_thread: 2 }, failChance: 0.15 },
};

const PEACEFUL_PATROL_TEXT = [
  "You sweep across the Paris rooftops and calm a frightened crowd near the bakery.",
  "A lost civilian thanks you after you guide them away from a suspicious akuma trail.",
  "You spot a strange feather drifting near the Seine, but it dissolves before danger appears.",
  "You patrol the Grand Paris, collect reports, and keep the night quiet.",
  "You interrupt a minor argument before Hawkmoth's influence can find a foothold.",
  "You help a shopkeeper repair damage from yesterday's villain attack.",
];

const VILLAIN_TIERS = [
  {
    minWins: 40, key: "monarch", name: "Monarch", rank: "Boss", hp: 2600, atk: [115, 165], reward: [1100, 1800], color: 0x6c3483,
    abilities: [
      { name: "Alliance Overload", damage: [170, 245], status: "corrupted", duration: 2, text: "Monarch overloads stolen powers through a corrupted alliance ring." },
      { name: "Mega Akuma Surge", damage: [145, 220], status: "weakened", duration: 2, text: "A mega akuma tears through your guard and leaves you weakened." },
      { name: "Transmission Lock", damage: [120, 185], status: "silenced", duration: 1, text: "Monarch locks your voice and tries to deny your special power." },
    ],
  },
  {
    minWins: 15, key: "chat_blanc", name: "Chat Blanc", rank: "S", hp: 1200, atk: [85, 130], reward: [650, 1000], color: 0xecf0f1,
    abilities: [
      { name: "White Cataclysm", damage: [135, 210], status: "burn", duration: 2, text: "Chat Blanc releases unstable destructive energy." },
      { name: "Moonlit Shockwave", damage: [95, 155], status: "stun", duration: 1, text: "A moonlit shockwave rattles the battlefield." },
    ],
  },
  {
    minWins: 5, key: "stormy_weather", name: "Stormy Weather", rank: "A", hp: 650, atk: [55, 90], reward: [350, 650], color: 0x3498db,
    abilities: [
      { name: "Thunder Clap", damage: [75, 125], status: "stun", duration: 1, text: "Stormy Weather calls thunder down from the clouds." },
      { name: "Freezing Gale", damage: [65, 110], status: "weakened", duration: 2, text: "A freezing gale cuts through your suit." },
    ],
  },
  {
    minWins: 0, key: "volpina", name: "Volpina", rank: "F", hp: 260, atk: [24, 44], reward: [120, 260], color: 0xe67e22,
    abilities: [
      { name: "False Mirage", damage: [35, 65], status: "confused", duration: 1, text: "Volpina folds the street into a fake horizon." },
      { name: "Flute Strike", damage: [30, 55], status: null, duration: 0, text: "Volpina strikes with her flute between illusions." },
    ],
  },
];

const STORYLINE_EPISODES = [
  {
    episode: 1, title: "Stormy Weather", villain: "Stormy Weather", hp: 320, atk: [28, 48], reward: [180, 320], color: 0x3498db,
    intro: "Dark clouds gather above Paris. Ladybug lands beside you and says, \"We stop her together. I'll handle the akuma when she's weak.\"",
    win: "Ladybug catches the akuma in her yo-yo and nods at you. \"Nice work. Paris can count on you.\"",
    abilities: [
      { name: "Icy Gust", damage: [35, 60], status: "weakened", duration: 1, text: "A freezing wind claws across the street." },
      { name: "Thunder Snap", damage: [42, 70], status: "stun", duration: 1, text: "Lightning cracks against the rooftop." },
    ],
  },
  {
    episode: 2, title: "The Bubbler", villain: "The Bubbler", hp: 380, atk: [32, 55], reward: [210, 360], color: 0x5dade2,
    intro: "Bubbles swallow half the block. Ladybug says, \"Pop the trap. I'll keep the civilians safe.\"",
    win: "Ladybug purifies the akuma from the bubble wand. \"That was clean teamwork.\"",
    abilities: [
      { name: "Bubble Prison", damage: [40, 68], status: "stun", duration: 1, text: "A heavy bubble tries to lock you in place." },
      { name: "Foam Burst", damage: [45, 72], status: "confused", duration: 1, text: "A spray of bubbles bends the battlefield." },
    ],
  },
  {
    episode: 3, title: "The Pharaoh", villain: "The Pharaoh", hp: 450, atk: [36, 62], reward: [240, 400], color: 0xd4ac0d,
    intro: "Ancient magic coils around the museum. Ladybug whispers, \"Careful. He thinks history is on his side.\"",
    win: "The papyrus tears, the akuma escapes, and Ladybug captures it before it reaches the moonlit glass.",
    abilities: [
      { name: "Mummy Guard", damage: [48, 78], status: "weakened", duration: 1, text: "Wrapped guards rush forward in formation." },
      { name: "Solar Judgment", damage: [55, 85], status: "burn", duration: 1, text: "A golden blast burns across the floor." },
    ],
  },
  {
    episode: 4, title: "Lady Wifi", villain: "Lady Wifi", hp: 520, atk: [40, 70], reward: [270, 450], color: 0xe84393,
    intro: "Screens flash across the city. Ladybug says, \"She wants secrets. We give her a fight instead.\"",
    win: "Ladybug purifies the akuma from the phone. \"Signal restored. Good timing.\"",
    abilities: [
      { name: "Pause Button", damage: [52, 88], status: "stun", duration: 1, text: "A glowing icon freezes the air around you." },
      { name: "Signal Surge", damage: [58, 92], status: "silenced", duration: 1, text: "A burst of static scrambles your voice." },
    ],
  },
  {
    episode: 5, title: "Timebreaker", villain: "Timebreaker", hp: 590, atk: [44, 76], reward: [300, 500], color: 0x1abc9c,
    intro: "Time skips under your feet. Ladybug says, \"Stay anchored. Every second matters.\"",
    win: "Ladybug snatches the akuma from the broken skates and grins. \"We kept the timeline intact.\"",
    abilities: [
      { name: "Time Drain", damage: [62, 98], status: "weakened", duration: 2, text: "A touch steals seconds from your movements." },
      { name: "Rewind Rush", damage: [55, 95], status: "confused", duration: 1, text: "Time snaps backward into a surprise attack." },
    ],
  },
  {
    episode: 6, title: "Mr. Pigeon", villain: "Mr. Pigeon", hp: 660, atk: [48, 82], reward: [330, 540], color: 0x95a5a6,
    intro: "Feathers flood the plaza. Ladybug says, \"Don't underestimate him. Akumas make obsession dangerous.\"",
    win: "Ladybug purifies the akuma from the whistle. \"Paris breathes easier now.\"",
    abilities: [
      { name: "Feather Swarm", damage: [65, 105], status: "confused", duration: 1, text: "A swarm blocks your view." },
      { name: "Sky Dive", damage: [72, 110], status: null, duration: 0, text: "The villain dives from above with surprising speed." },
    ],
  },
  {
    episode: 7, title: "The Evillustrator", villain: "The Evillustrator", hp: 740, atk: [52, 90], reward: [370, 590], color: 0x8e44ad,
    intro: "Drawn monsters crawl off the page. Ladybug says, \"Erase the threat, not the person underneath.\"",
    win: "The pen cracks, and Ladybug purifies the akuma. \"You fought smart.\"",
    abilities: [
      { name: "Ink Blade", damage: [76, 118], status: "burn", duration: 1, text: "Sharp ink slashes across the wall." },
      { name: "Sketch Trap", damage: [70, 112], status: "stun", duration: 1, text: "A drawn cage snaps around your feet." },
    ],
  },
  {
    episode: 8, title: "Rogercop", villain: "Rogercop", hp: 820, atk: [56, 96], reward: [410, 650], color: 0x34495e,
    intro: "Sirens echo down the avenue. Ladybug says, \"Rules matter, but fear can't enforce them.\"",
    win: "Ladybug captures the akuma from the badge. \"Justice is back where it belongs.\"",
    abilities: [
      { name: "Law Beam", damage: [82, 125], status: "disabled", duration: 1, text: "A strict beam tries to lock your power." },
      { name: "Robo Charge", damage: [78, 122], status: "weakened", duration: 1, text: "Metal boots crush into the pavement." },
    ],
  },
  {
    episode: 9, title: "Copycat", villain: "Copycat", hp: 900, atk: [60, 104], reward: [450, 700], color: 0x2c2c2c,
    intro: "A false black-cat silhouette steps from the shadows. Ladybug says, \"Your miraculous is your own. Prove it.\"",
    win: "Ladybug purifies the akuma and looks relieved. \"No copy can match the real hero beside me.\"",
    abilities: [
      { name: "Fake Cataclysm", damage: [95, 145], status: "corrupted", duration: 1, text: "A counterfeit destructive strike tears forward." },
      { name: "Bell Feint", damage: [82, 130], status: "confused", duration: 1, text: "A deceptive bell-ring hides the next hit." },
    ],
  },
  {
    episode: 10, title: "Dark Cupid", villain: "Dark Cupid", hp: 980, atk: [64, 112], reward: [490, 760], color: 0xe74c3c,
    intro: "Black arrows streak through the city. Ladybug says, \"Don't let hate decide your moves.\"",
    win: "The pin splits open, and Ladybug purifies the akuma. \"Heart saved. City saved.\"",
    abilities: [
      { name: "Hate Arrow", damage: [100, 150], status: "corrupted", duration: 2, text: "A dark arrow twists emotion into rage." },
      { name: "Wing Sweep", damage: [88, 138], status: "weakened", duration: 1, text: "Dark wings slam into the rooftop." },
    ],
  },
  {
    episode: 11, title: "Horrificator", villain: "Horrificator", hp: 1070, atk: [68, 120], reward: [530, 820], color: 0x27ae60,
    intro: "Green slime spreads across the school. Ladybug says, \"Fear feeds her. Keep moving.\"",
    win: "Ladybug captures the akuma from the broken makeup case. \"Bravery wins again.\"",
    abilities: [
      { name: "Fear Slime", damage: [105, 158], status: "stun", duration: 1, text: "Sticky slime locks your footing." },
      { name: "Monster Lunge", damage: [96, 150], status: "weakened", duration: 1, text: "The creature lunges with panic-fueled force." },
    ],
  },
  {
    episode: 12, title: "Darkblade", villain: "Darkblade", hp: 1160, atk: [72, 128], reward: [570, 880], color: 0x7f8c8d,
    intro: "A medieval army storms city hall. Ladybug says, \"Break the banner, break the spell.\"",
    win: "Ladybug purifies the akuma from the sword. \"Paris doesn't need a king. It needs heroes.\"",
    abilities: [
      { name: "Knight's Order", damage: [110, 165], status: "disabled", duration: 1, text: "A royal command weighs down your miraculous." },
      { name: "Banner Slash", damage: [102, 160], status: "burn", duration: 1, text: "A blazing banner cuts through your guard." },
    ],
  },
  {
    episode: 13, title: "The Mime", villain: "The Mime", hp: 1260, atk: [76, 136], reward: [620, 940], color: 0xecf0f1,
    intro: "Invisible walls close around the street. Ladybug says, \"Watch the silence. His weapons are real enough.\"",
    win: "Ladybug purifies the akuma from the torn photo. \"Quiet fight. Loud victory.\"",
    abilities: [
      { name: "Invisible Hammer", damage: [118, 175], status: "stun", duration: 1, text: "An unseen hammer crashes down." },
      { name: "Silent Cage", damage: [105, 165], status: "silenced", duration: 1, text: "Invisible bars steal the rhythm of your power." },
    ],
  },
  {
    episode: 14, title: "Kung Food", villain: "Kung Food", hp: 1360, atk: [80, 144], reward: [670, 1000], color: 0xf39c12,
    intro: "A tower of dangerous dishes rises over the hotel. Ladybug says, \"No slipping. No snacking. Just saving Paris.\"",
    win: "Ladybug purifies the akuma from the chef's hat. \"That recipe needed teamwork.\"",
    abilities: [
      { name: "Spicy Strike", damage: [125, 185], status: "burn", duration: 2, text: "A burning wave of sauce splashes forward." },
      { name: "Noodle Bind", damage: [110, 172], status: "stun", duration: 1, text: "Noodles whip around your ankles." },
    ],
  },
  {
    episode: 15, title: "Gamer", villain: "Gamer", hp: 1470, atk: [84, 152], reward: [720, 1060], color: 0x9b59b6,
    intro: "A giant mech stomps through the arena. Ladybug says, \"Boss fight rules. Find the weak point.\"",
    win: "Ladybug purifies the akuma from the glasses. \"High score: teamwork.\"",
    abilities: [
      { name: "Mech Missile", damage: [135, 198], status: "weakened", duration: 1, text: "Targeting lasers paint the ground red." },
      { name: "Combo Breaker", damage: [120, 188], status: "disabled", duration: 1, text: "A coded pulse interrupts your power." },
    ],
  },
  {
    episode: 16, title: "Animan", villain: "Animan", hp: 1580, atk: [88, 160], reward: [780, 1140], color: 0x2ecc71,
    intro: "Animal roars echo from every direction. Ladybug says, \"He changes forms. We adapt faster.\"",
    win: "Ladybug purifies the akuma from the bracelet. \"Wild, but handled.\"",
    abilities: [
      { name: "Predator Pounce", damage: [140, 205], status: "weakened", duration: 1, text: "A beast-form leap crashes into you." },
      { name: "Stampede Shift", damage: [128, 196], status: "confused", duration: 1, text: "Forms change too quickly to track." },
    ],
  },
  {
    episode: 17, title: "Antibug", villain: "Antibug", hp: 1700, atk: [92, 168], reward: [840, 1220], color: 0xc0392b,
    intro: "A red-and-black rival points her weapon at you. Ladybug says, \"She's copying my symbol, not my heart.\"",
    win: "Ladybug purifies the akuma from the charm. \"You're the teammate I needed today.\"",
    abilities: [
      { name: "Anti-Charm", damage: [150, 218], status: "corrupted", duration: 2, text: "A false charm explodes with reversed luck." },
      { name: "Ribbon Lash", damage: [132, 205], status: "stun", duration: 1, text: "A yo-yo-like ribbon snaps around you." },
    ],
  },
  {
    episode: 18, title: "The Puppeteer", villain: "The Puppeteer", hp: 1820, atk: [96, 176], reward: [900, 1300], color: 0xd35400,
    intro: "Controlled heroes move like dolls. Ladybug says, \"Cut the strings without hurting them.\"",
    win: "Ladybug purifies the akuma from the doll. \"You kept control when she tried to take it.\"",
    abilities: [
      { name: "Doll Command", damage: [155, 225], status: "confused", duration: 2, text: "A doll jerks your aim sideways." },
      { name: "String Snare", damage: [140, 212], status: "stun", duration: 1, text: "Magic strings lock your arms." },
    ],
  },
  {
    episode: 19, title: "Reflekta", villain: "Reflekta", hp: 1950, atk: [100, 184], reward: [960, 1380], color: 0xff99cc,
    intro: "Pink light floods the street. Ladybug says, \"Stay yourself. That's the whole fight.\"",
    win: "Ladybug purifies the akuma from the compact. \"Your identity held strong.\"",
    abilities: [
      { name: "Reflection Beam", damage: [160, 235], status: "weakened", duration: 2, text: "A pink beam rattles your transformation." },
      { name: "Mirror Panic", damage: [145, 220], status: "confused", duration: 1, text: "Reflections multiply across every window." },
    ],
  },
  {
    episode: 20, title: "Guitar Villain", villain: "Guitar Villain", hp: 2080, atk: [104, 192], reward: [1020, 1460], color: 0x8e44ad,
    intro: "A dragon-shaped stage roars over Paris. Ladybug says, \"Hit the rhythm before it hits us.\"",
    win: "Ladybug purifies the akuma from the guitar pick. \"Encore denied.\"",
    abilities: [
      { name: "Sonic Riff", damage: [170, 245], status: "silenced", duration: 1, text: "A heavy riff shakes your voice away." },
      { name: "Dragon Amp", damage: [152, 232], status: "burn", duration: 1, text: "A fiery amp blast rolls forward." },
    ],
  },
  {
    episode: 21, title: "Pixelator", villain: "Pixelator", hp: 2220, atk: [108, 200], reward: [1100, 1540], color: 0x1abc9c,
    intro: "Camera flashes trap people in pixels. Ladybug says, \"Don't let him frame the fight.\"",
    win: "Ladybug purifies the akuma from the camera. \"Picture perfect.\"",
    abilities: [
      { name: "Pixel Flash", damage: [175, 255], status: "stun", duration: 1, text: "A flash nearly traps you in a digital prison." },
      { name: "Snapshot Barrage", damage: [160, 240], status: "weakened", duration: 1, text: "Pixel shots burst like glass." },
    ],
  },
  {
    episode: 22, title: "Princess Fragrance", villain: "Princess Fragrance", hp: 2360, atk: [112, 208], reward: [1180, 1640], color: 0xf8c471,
    intro: "Perfume mist covers the palace. Ladybug says, \"Hold your breath and hold the line.\"",
    win: "Ladybug purifies the akuma from the perfume bottle. \"Fresh air at last.\"",
    abilities: [
      { name: "Perfume Cloud", damage: [182, 262], status: "confused", duration: 2, text: "Sweet mist clouds your thoughts." },
      { name: "Royal Command", damage: [165, 248], status: "disabled", duration: 1, text: "A scented command tries to override your will." },
    ],
  },
  {
    episode: 23, title: "Simon Says", villain: "Simon Says", hp: 2500, atk: [116, 216], reward: [1260, 1740], color: 0xe67e22,
    intro: "The villain's voice booms from every screen. Ladybug says, \"Only listen to your instincts.\"",
    win: "Ladybug purifies the akuma from the cards. \"Simon says: Paris is safe.\"",
    abilities: [
      { name: "Simon Says Freeze", damage: [190, 270], status: "stun", duration: 1, text: "The command pins your muscles in place." },
      { name: "Hypnotic Order", damage: [170, 255], status: "silenced", duration: 1, text: "A command tries to silence your miraculous call." },
    ],
  },
  {
    episode: 24, title: "Volpina", villain: "Volpina", hp: 2650, atk: [120, 225], reward: [1350, 1850], color: 0xe67e22,
    intro: "Illusions stretch across the Eiffel Tower. Ladybug says, \"She lies well. We fight better.\"",
    win: "Ladybug purifies the akuma from the necklace. \"Truth wins when we stand together.\"",
    abilities: [
      { name: "Grand Mirage", damage: [198, 282], status: "confused", duration: 2, text: "The whole skyline becomes a trap." },
      { name: "Fox Flute Burst", damage: [178, 265], status: "weakened", duration: 2, text: "A flute note slams into your guard." },
    ],
  },
  {
    episode: 25, title: "Stoneheart", villain: "Stoneheart", hp: 2850, atk: [128, 238], reward: [1500, 2100], color: 0x7f8c8d,
    intro: "Stoneheart towers over Paris for the season finale. Ladybug stands beside you: \"This is it. You and me. We save everyone.\"",
    win: "Ladybug captures the akuma, purifies it, and releases the magic ladybugs over Paris. \"Season one complete. You earned this.\"",
    abilities: [
      { name: "Stone Fist", damage: [210, 300], status: "stun", duration: 1, text: "A giant fist shakes the entire block." },
      { name: "Heartquake", damage: [190, 285], status: "weakened", duration: 2, text: "The ground splits under raw akuma emotion." },
      { name: "Final Rage", damage: [225, 330], status: "corrupted", duration: 2, text: "Stoneheart's grief erupts into a final attack." },
    ],
  },
];

const VILLAIN_ABILITIES = [
  { name: "Akumatize", damage: [30, 50], description: "Release an akuma that corrupts the target." },
  { name: "Dark Wind", damage: [20, 35], description: "Summon a cyclone of dark energy." },
  { name: "Shadow Blast", damage: [25, 45], description: "Fire a concentrated beam of shadow." },
  { name: "Charm Crush", damage: [15, 40], description: "Shatter a lucky charm with dark power." },
  { name: "Amok Wave", damage: [20, 38], description: "Send a wave of destructive emotion." },
  { name: "Hawkstrike", damage: [35, 55], description: "A decisive villain strike from above." },
];

// -- Storage / Migration -----------------------------------
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { players: {}, miraculousOwners: {}, clans: {}, warns: {} };
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!data.players) data.players = {};
    if (!data.miraculousOwners) data.miraculousOwners = {};
    if (!data.clans) data.clans = {};
    if (!data.warns) data.warns = {};
    migrateData(data);
    return data;
  } catch (err) {
    console.error("Failed to load data.json:", err);
    return { players: {}, miraculousOwners: {}, clans: {}, warns: {} };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function migrateData(data) {
  for (const player of Object.values(data.players || {})) {
    ensureInventory(player);
    for (const [oldId, newId] of Object.entries(LEGACY_ITEM_ALIASES)) {
      if (player.itemInventory[oldId]) {
        player.itemInventory[newId] = (player.itemInventory[newId] || 0) + player.itemInventory[oldId];
        delete player.itemInventory[oldId];
      }
    }
    if (!Array.isArray(player.miraculouses)) player.miraculouses = [];
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.clanId) player.clanId = null;
    if (!player.activeMacaroon) player.activeMacaroon = null;
    if (player.charms === undefined) player.charms = 0;
    if (!player.storyline || typeof player.storyline !== "object" || Array.isArray(player.storyline)) player.storyline = {};
    if (!player.storyline.season1 || typeof player.storyline.season1 !== "object") {
      player.storyline.season1 = { episode: 1, completed: [] };
    }
    if (!Array.isArray(player.storyline.season1.completed)) player.storyline.season1.completed = [];
    if (!player.storyline.season1.episode) player.storyline.season1.episode = 1;
    if (!player.identity || typeof player.identity !== "object" || Array.isArray(player.identity)) {
      player.identity = { species: null, obedience: null, chosenAt: null, choiceSentAt: null, choiceExpiresAt: null, amokHolderId: null, amokOrders: [] };
    }
    if (!Array.isArray(player.identity.amokOrders)) player.identity.amokOrders = [];
  }
  for (const clan of Object.values(data.clans || {})) {
    if (!Array.isArray(clan.officers)) clan.officers = [];
    if (!Array.isArray(clan.members)) clan.members = [];
    if (!Array.isArray(clan.invites)) clan.invites = [];
    if (!clan.vaultItems) clan.vaultItems = {};
    if (!clan.level) clan.level = 1;
    if (!clan.xp) clan.xp = 0;
    if (!clan.vault) clan.vault = 0;
    if (!clan.wins) clan.wins = 0;
  }
}

function getPlayer(data, userId, username) {
  if (!data.players[userId]) {
    data.players[userId] = {
      username,
      miraculouses: [],
      transformed: null,
      hp: 100,
      maxHp: 100,
      wins: 0,
      losses: 0,
      inventory: [],
      abilityCooldown: 0,
      villaincooldown: 0,
      itemInventory: {},
      charms: 0,
      clanId: null,
      activeMacaroon: null,
      storyProgress: 0,
      storyline: { season1: { episode: 1, completed: [] } },
      identity: { species: null, obedience: null, chosenAt: null, choiceSentAt: null, choiceExpiresAt: null, amokHolderId: null, amokOrders: [] },
    };
  }
  const player = data.players[userId];
  player.username = username;
  ensureInventory(player);
  if (!Array.isArray(player.miraculouses)) player.miraculouses = [];
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (player.charms === undefined) player.charms = 0;
  if (!player.clanId) player.clanId = null;
  if (!player.activeMacaroon) player.activeMacaroon = null;
  if (!player.storyline || typeof player.storyline !== "object" || Array.isArray(player.storyline)) player.storyline = {};
  if (!player.storyline.season1 || typeof player.storyline.season1 !== "object") player.storyline.season1 = { episode: 1, completed: [] };
  if (!Array.isArray(player.storyline.season1.completed)) player.storyline.season1.completed = [];
  if (!player.storyline.season1.episode) player.storyline.season1.episode = 1;
  if (!player.identity || typeof player.identity !== "object" || Array.isArray(player.identity)) {
    player.identity = { species: null, obedience: null, chosenAt: null, choiceSentAt: null, choiceExpiresAt: null, amokHolderId: null, amokOrders: [] };
  }
  if (!Array.isArray(player.identity.amokOrders)) player.identity.amokOrders = [];
  return player;
}

// -- Utility ------------------------------------------------
function now() { return Date.now(); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pct(value, percent) { return Math.floor(value * percent / 100); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function hpBar(hp, maxHp) {
  const safeMax = Math.max(1, maxHp || 1);
  const safe = clamp(Math.floor(hp || 0), 0, safeMax);
  const percent = safe / safeMax;
  const filled = clamp(Math.round(percent * 12), 0, 12);
  const empty = 12 - filled;
  const icon = percent > 0.65 ? "🟩" : percent > 0.30 ? "🟨" : "🟥";
  return `${icon} ${"█".repeat(filled)}${"░".repeat(empty)} ${safe}/${safeMax} (${Math.round(percent * 100)}%)`;
}

function rarityEmoji(rarity) {
  return { legendary: "Legendary", epic: "Epic", rare: "Rare", uncommon: "Uncommon", common: "Common" }[rarity] || "Common";
}

function rarityColor(rarity) {
  return { legendary: 0xf1c40f, epic: 0x8e44ad, rare: 0x3498db, uncommon: 0x2ecc71, common: 0x95a5a6 }[rarity] || 0x95a5a6;
}

function ensureInventory(player) {
  if (!player.itemInventory || typeof player.itemInventory !== "object" || Array.isArray(player.itemInventory)) {
    player.itemInventory = {};
  }
}

function addItem(player, itemId, qty = 1) {
  if (!ITEMS[itemId] || qty <= 0) return false;
  ensureInventory(player);
  player.itemInventory[itemId] = (player.itemInventory[itemId] || 0) + qty;
  return true;
}

function removeItem(player, itemId, qty = 1) {
  ensureInventory(player);
  if (!player.itemInventory[itemId] || player.itemInventory[itemId] < qty) return false;
  player.itemInventory[itemId] -= qty;
  if (player.itemInventory[itemId] <= 0) delete player.itemInventory[itemId];
  return true;
}

function hasItem(player, itemId, qty = 1) {
  ensureInventory(player);
  return (player.itemInventory[itemId] || 0) >= qty;
}

function getInventoryPage(player, category, page = 0, sortBy = "rarity") {
  ensureInventory(player);
  const PAGE_SIZE = 10;
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const entries = Object.entries(player.itemInventory)
    .filter(([id]) => ITEMS[id])
    .filter(([id]) => !category || ITEMS[id].category === category)
    .map(([id, qty]) => ({ item: ITEMS[id], qty }));

  if (sortBy === "rarity") {
    entries.sort((a, b) => rarityOrder[a.item.rarity] - rarityOrder[b.item.rarity] || a.item.name.localeCompare(b.item.name));
  } else if (sortBy === "name") {
    entries.sort((a, b) => a.item.name.localeCompare(b.item.name));
  } else if (sortBy === "qty") {
    entries.sort((a, b) => b.qty - a.qty || a.item.name.localeCompare(b.item.name));
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = clamp(page, 0, totalPages - 1);
  return {
    entries: entries.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    page: safePage,
    totalPages,
    total: entries.length,
  };
}

function rollDrops(table, bonusKey = null, guaranteed = 1) {
  const drops = {};
  const total = table.reduce((sum, row) => sum + row.weight, 0);

  for (const row of table) {
    const chance = row.weight / total;
    if (Math.random() < chance) {
      drops[row.id] = (drops[row.id] || 0) + rand(row.minQty, row.maxQty);
    }
  }

  while (Object.keys(drops).length < guaranteed && table.length) {
    const row = weightedRow(table);
    drops[row.id] = (drops[row.id] || 0) + rand(row.minQty, row.maxQty);
  }

  if (bonusKey && MIRACULOUS_DROPS[bonusKey] && Math.random() < 0.35) {
    const bonusId = MIRACULOUS_DROPS[bonusKey];
    drops[bonusId] = (drops[bonusId] || 0) + 1;
  }

  return drops;
}

function weightedRow(table) {
  const total = table.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;
  for (const row of table) {
    roll -= row.weight;
    if (roll <= 0) return row;
  }
  return table[table.length - 1];
}

function weightedRandomMiraculous() {
  const keys = Object.keys(MIRACULOUSES).filter(key => (MIRACULOUSES[key].rarityWeight || 0) > 0 && !MIRACULOUSES[key].adminOnly);
  const total = keys.reduce((sum, key) => sum + MIRACULOUSES[key].rarityWeight, 0);
  let roll = Math.random() * total;
  for (const key of keys) {
    roll -= MIRACULOUSES[key].rarityWeight;
    if (roll <= 0) return key;
  }
  return keys[keys.length - 1];
}

function obedienceDescription(percent) {
  if (percent <= 10) return "You are almost entirely under your own control.";
  if (percent <= 35) return "You feel outside commands, but your will is still strong.";
  if (percent <= 60) return "An amok holder can pressure your choices, though resistance is possible.";
  if (percent <= 74) return "You are dangerously responsive to the amok holder's commands.";
  if (percent <= 90) return "High obedience. A Peacock holder with your amok can command severe actions.";
  return "Extreme obedience. Like Adrien-level control, the amok holder's will can override yours.";
}

function buildIdentityChoicePayload(username) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("identity_dm_human").setLabel("Choose Human").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("identity_dm_sentihuman").setLabel("Choose Sentihuman").setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Choose Your Miraculous Identity")
        .setColor(0x9b59b6)
        .setDescription(`Hey ${username}, choose what you are in the Miraculous RPG.\n\nYou have **24 hours** to choose. If you do not choose in time, you will automatically become **Human**.`)
        .addFields(
          { name: "Human", value: "1% obedience. You are under your own control and cannot be amok-deleted.", inline: false },
          { name: "Sentihuman", value: "Random 1-99% obedience. You gain **+15% HP** and **+15% damage**, but high obedience means a Peacock holder can command you.", inline: false },
          { name: "Important", value: "You can only choose once unless an admin releases your identity.", inline: false },
        ),
    ],
    components: [row],
  };
}

async function sendIdentityChoiceDM(user, data, username = null) {
  const player = getPlayer(data, user.id, username || user.username);
  if (player.identity?.species) return false;
  const sentAt = now();
  player.identity.choiceSentAt = sentAt;
  player.identity.choiceExpiresAt = sentAt + IDENTITY_CHOICE_MS;
  await user.send(buildIdentityChoicePayload(username || user.username)).catch(() => null);
  return true;
}

function autoHumanIfExpired(player) {
  if (player.identity?.species) return false;
  if (!player.identity?.choiceExpiresAt) return false;
  if (now() < player.identity.choiceExpiresAt) return false;
  player.identity.species = "Human";
  player.identity.obedience = 1;
  player.identity.chosenAt = now();
  player.identity.amokHolderId = null;
  player.identity.amokOrders = [];
  return true;
}

function sentihumanHpBonus(player) {
  return player?.identity?.species === "Sentihuman" ? 1.15 : 1;
}

function sentihumanDamageBonus(side, amount) {
  return side?.species === "Sentihuman" ? Math.floor(amount * 1.15) : amount;
}

function resetPlayerForAmokDeletion(player) {
  player.miraculouses = [];
  player.transformed = null;
  player.hp = 100;
  player.maxHp = 100;
  player.wins = 0;
  player.losses = 0;
  player.inventory = [];
  player.itemInventory = {};
  player.charms = 0;
  player.activeMacaroon = null;
  player.storyProgress = 0;
  player.claimCooldown = 0;
  player.abilityCooldown = 0;
  player.villaincooldown = 0;
  player.identity = { species: null, obedience: null, chosenAt: null, choiceSentAt: null, choiceExpiresAt: null, amokHolderId: null, amokOrders: [] };
  player.storyline = { season1: { episode: 1, completed: [] } };
}

// -- Status Helpers ----------------------------------------
function hasStatus(side, statusId) {
  return Array.isArray(side.statuses) && side.statuses.some(status => status.id === statusId);
}

function getStatus(side, statusId) {
  return Array.isArray(side.statuses) ? side.statuses.find(status => status.id === statusId) : null;
}

function addStatus(side, statusId, duration, meta = {}) {
  if (!Array.isArray(side.statuses)) side.statuses = [];
  const def = STATUS[statusId];
  if (!def) return false;
  const negatives = ["burn", "stun", "confused", "corrupted", "disabled", "silenced", "weakened"];
  if (negatives.includes(statusId) && hasStatus(side, "immune")) {
    removeStatus(side, "immune");
    return false;
  }
  const existing = side.statuses.filter(status => status.id === statusId);
  if (existing.length >= def.maxStacks) {
    existing[existing.length - 1].duration = Math.max(existing[existing.length - 1].duration, duration);
    existing[existing.length - 1].meta = { ...(existing[existing.length - 1].meta || {}), ...meta };
    return true;
  }
  side.statuses.push({ id: statusId, duration, meta });
  return true;
}

function removeStatus(side, statusId) {
  if (!Array.isArray(side.statuses)) return;
  side.statuses = side.statuses.filter(status => status.id !== statusId);
}

function tickStatuses(side, logs, phase = "turn") {
  if (!Array.isArray(side.statuses)) side.statuses = [];
  let hpDelta = 0;
  const expired = [];

  for (const status of side.statuses) {
    if (status.id === "burn" && phase === "turn") {
      const dmg = Math.max(5, pct(side.maxHp, 8));
      hpDelta -= dmg;
      logs.push(`${side.name} takes ${dmg} burn damage.`);
    }
    if (status.id === "regen" && phase === "turn") {
      const heal = Math.max(5, pct(side.maxHp, 5));
      hpDelta += heal;
      logs.push(`${side.name} regenerates ${heal} HP.`);
    }
    status.duration -= 1;
    if (status.duration <= 0) expired.push(status.id);
  }

  for (const statusId of expired) removeStatus(side, statusId);
  return hpDelta;
}

function statusLine(side) {
  if (!Array.isArray(side.statuses) || side.statuses.length === 0) return "None";
  return side.statuses.map(status => {
    const def = STATUS[status.id];
    return def ? `${def.emoji}:${def.label}(${status.duration})` : `${status.id}(${status.duration})`;
  }).join(" | ");
}

// -- Battle Core -------------------------------------------
function makeSide(playerId, playerName, mirKey, macaroon = null, playerData = null) {
  const mir = MIRACULOUSES[mirKey];
  let baseHp = Math.floor(mir.baseHp * sentihumanHpBonus(playerData));
  if (macaroon && ITEMS[macaroon]?.effects?.hpBonus) baseHp += ITEMS[macaroon].effects.hpBonus;
  return {
    id: playerId,
    name: playerName,
    mirKey,
    hp: baseHp,
    maxHp: baseHp,
    statuses: [],
    specialCooldown: 0,
    specialCooldownMs: 20_000,
    tigerChargeState: "empty",
    tigerCharge: 0,
    tigerUnleashUsed: false,
    peacockSenti: 0,
    snakeReviveUsed: false,
    rabbitBurrowSnapshot: null,
    rabbitBurrowUsed: false,
    macaroon,
    macaroonApplied: false,
    defendingThisTurn: false,
    species: playerData?.identity?.species || null,
    obedience: playerData?.identity?.obedience ?? null,
  };
}

function makeVillainSide(villain) {
  return {
    id: "villain",
    name: villain.name,
    villainKey: villain.key,
    hp: villain.hp,
    maxHp: villain.hp,
    atk: villain.atk,
    rank: villain.rank,
    color: villain.color,
    statuses: [],
    abilities: villain.abilities,
    defendingThisTurn: false,
  };
}

function makeLadybugAlly(episodeNumber = 1) {
  const scalingHp = 220 + episodeNumber * 16;
  const scalingAtk = 42 + episodeNumber * 3;
  return {
    id: "ladybug",
    name: "Ladybug",
    mirKey: "bug",
    hp: scalingHp,
    maxHp: scalingHp,
    atk: [scalingAtk, scalingAtk + 32],
    statuses: [],
    specialCooldown: 0,
    luckyCharmUsed: false,
    purificationReady: false,
  };
}

function chooseStorylineEpisode(player) {
  const state = player.storyline?.season1 || { episode: 1, completed: [] };
  const nextEpisode = clamp(state.episode || 1, 1, STORYLINE_EPISODES.length);
  return STORYLINE_EPISODES.find(ep => ep.episode === nextEpisode) || STORYLINE_EPISODES[0];
}

function storyHeroCallout(side) {
  const mir = MIRACULOUSES[side.mirKey];
  return mir?.hero || side.name;
}

function addStoryDialogue(pve, speaker, text) {
  if (pve.mode !== "storyline") return;
  if (!Array.isArray(pve.dialogue)) pve.dialogue = [];
  pve.dialogue.push(`**${speaker}**: ${text}`);
  if (pve.dialogue.length > 5) pve.dialogue = pve.dialogue.slice(-5);
}

function storylineActionDialogue(pve, action) {
  if (pve.mode !== "storyline") return;
  const heroName = storyHeroCallout(pve.hero);
  const villain = pve.villain.name;
  if (action === "fight") {
    addStoryDialogue(pve, "Ladybug", `${heroName}, keep the pressure on ${villain}! I'll watch for the akuma object.`);
  } else if (action === "special") {
    addStoryDialogue(pve, "Ladybug", `${heroName}, now! Use your miraculous power and crack their defense!`);
  } else if (action === "defend") {
    addStoryDialogue(pve, "Ladybug", `Good guard, ${heroName}. I'll cover you while you reset your stance.`);
  } else if (action === "flee") {
    addStoryDialogue(pve, "Ladybug", `${heroName}, fall back if you have to. Paris still needs you alive.`);
  }
}

function applyMacaroonStart(side, logs) {
  if (!side.macaroon || side.macaroonApplied) return;
  side.macaroonApplied = true;
  const item = ITEMS[side.macaroon];
  if (!item?.effects) return;
  const fx = item.effects;
  if (fx.regenTurns) addStatus(side, "regen", fx.regenTurns);
  if (fx.foresightTurns) addStatus(side, "foresight", fx.foresightTurns);
  if (fx.stunImmunity) addStatus(side, "immune", 1);
  logs.push(`${side.name} activates ${item.name}!`);
}

function macaroonProcs(attSide, defSide, baseDmg, logs) {
  if (!attSide.macaroon) return { extra: 0 };
  const fx = ITEMS[attSide.macaroon]?.effects;
  if (!fx) return { extra: 0 };
  let extra = 0;
  if (fx.dmgBonus) extra += pct(baseDmg, fx.dmgBonus);
  if (fx.specialBonus && attSide._useSpecial) extra += pct(baseDmg, fx.specialBonus);
  if (fx.burnChance && Math.random() < fx.burnChance / 100) {
    addStatus(defSide, "burn", 2);
    logs.push(`${attSide.name}'s macaroon ignites the enemy!`);
  }
  if (fx.stunChance && Math.random() < fx.stunChance / 100) {
    addStatus(defSide, "stun", 1);
    logs.push(`${attSide.name}'s macaroon stuns the enemy!`);
  }
  if (fx.poisonOnHit) {
    addStatus(defSide, "burn", 1);
    logs.push(`${attSide.name}'s macaroon leaves burning venom behind!`);
  }
  return { extra };
}

function applyDamage(defSide, amount, logs) {
  let dmg = Math.max(0, Math.floor(amount));
  if (hasStatus(defSide, "defending")) {
    const reduced = Math.ceil(dmg * 0.45);
    logs.push(`${defSide.name}'s defense absorbs ${dmg - reduced} damage.`);
    dmg = reduced;
    removeStatus(defSide, "defending");
  }
  if (hasStatus(defSide, "shield")) {
    const reduced = Math.ceil(dmg * 0.45);
    logs.push(`${defSide.name}'s shield blunts the hit for ${dmg - reduced} damage.`);
    dmg = reduced;
    removeStatus(defSide, "shield");
  }
  defSide.hp = clamp(defSide.hp - dmg, 0, defSide.maxHp);
  return dmg;
}

function checkBurrowRewind(side, opponent, logs) {
  if (!side || side.mirKey !== "rabbit" || !side.rabbitBurrowSnapshot || side.rabbitBurrowUsed) return false;
  const dangerLine = Math.max(1, pct(side.maxHp, 35));
  if (side.hp > 0 && side.hp > dangerLine) return false;

  const savedHp = clamp(side.rabbitBurrowSnapshot.hp, 1, side.maxHp);
  const before = side.hp;
  side.hp = savedHp;
  side.rabbitBurrowSnapshot = null;
  side.rabbitBurrowUsed = true;
  removeStatus(side, "burrow_anchor");
  addStatus(side, "foresight", 2);
  addStatus(side, "dodge", 1);

  let paradoxDamage = 0;
  if (opponent && opponent.hp > 0) {
    paradoxDamage = applyDamage(opponent, rand(70, 125), logs);
  }

  logs.push(`${side.name}'s Burrow anchor snaps shut: timeline rewinds from ${before} HP to ${savedHp} HP, and the paradox hits ${opponent?.name || "the enemy"} for ${paradoxDamage} damage.`);
  return true;
}

function healSide(side, amount) {
  const before = side.hp;
  side.hp = clamp(side.hp + amount, 0, side.maxHp);
  return side.hp - before;
}

function resolveSpecial(attSide, defSide) {
  const logs = [];
  attSide._useSpecial = true;
  let cooldownMs = ITEMS[attSide.macaroon]?.effects?.cdReduction ? 15_000 : 20_000;

  switch (attSide.mirKey) {
    case "bug": {
      const healed = healSide(attSide, 90);
      addStatus(attSide, "shield", 2);
      addStatus(attSide, "regen", 2);
      const dmg = applyDamage(defSide, rand(30, 55), logs);
      logs.push(`${attSide.name} uses Lucky Charm: heals ${healed} HP, gains a temporary shield, and counters for ${dmg} damage.`);
      break;
    }
    case "cat": {
      const burst = rand(125, 190);
      const dmg = applyDamage(defSide, burst, logs);
      addStatus(defSide, "corrupted", 2);
      addStatus(defSide, "weakened", 2);
      cooldownMs = rand(42, 48) * 1000;
      logs.push(`${attSide.name} uses Cataclysm: ${dmg} controlled burst damage. Cooldown set to ${Math.round(cooldownMs / 1000)}s.`);
      break;
    }
    case "bee": {
      const dmg = applyDamage(defSide, rand(55, 95), logs);
      addStatus(defSide, "stun", 2);
      logs.push(`${attSide.name} uses Venom: ${dmg} damage and a two-round stun.`);
      break;
    }
    case "snake": {
      if (!attSide.snakeReviveUsed) {
        attSide.snakeReviveUsed = true;
        const restored = attSide.maxHp - attSide.hp;
        attSide.hp = attSide.maxHp;
        attSide.statuses = (attSide.statuses || []).filter(status => !["burn", "stun", "confused", "corrupted", "disabled", "silenced", "weakened"].includes(status.id));
        logs.push(`${attSide.name} uses Second Chance: HP resets to 100% (+${restored}) and debuffs are cleared. One use spent.`);
      } else {
        const dmg = applyDamage(defSide, rand(45, 80), logs);
        logs.push(`${attSide.name} has already spent Second Chance, so they strike through intuition for ${dmg} damage.`);
      }
      break;
    }
    case "tiger": {
      const charge = clamp(attSide.tigerCharge || 0, 0, 100);
      if (charge < 70) {
        const newCharge = Math.min(100, charge + 10);
        attSide.tigerCharge = newCharge;
        attSide.tigerChargeState = newCharge >= 70 ? "ready" : "charging";
        addStatus(attSide, "shield", 1);
        cooldownMs = 5_000;
        logs.push(`${attSide.name} channels Purple Tigress Clout: charge rises from ${charge}% to ${newCharge}% (+10%).`);
        if (newCharge >= 70) logs.push(`Clout is stable enough to unleash. Use Special again to strike around 100 damage.`);
      } else {
        const minForce = Math.max(55, Math.floor(charge * 1.25));
        const maxForce = Math.max(minForce + 10, Math.floor(charge * 1.55));
        const dmg = applyDamage(defSide, rand(minForce, maxForce), logs);
        attSide.tigerCharge = 0;
        attSide.tigerChargeState = "empty";
        addStatus(defSide, "weakened", charge >= 90 ? 2 : 1);
        cooldownMs = 18_000;
        logs.push(`${attSide.name} unleashes Clout at ${charge}%: ${dmg} force damage. Charge resets to 0%.`);
      }
      break;
    }
    case "fox": {
      const dmg = applyDamage(defSide, rand(55, 100), logs);
      addStatus(attSide, "dodge", 2);
      addStatus(defSide, "confused", 2);
      logs.push(`${attSide.name} uses Mirage: ${dmg} illusion damage, enemy Confused, self gains Evasion.`);
      break;
    }
    case "turtle": {
      addStatus(attSide, "shield", 2);
      addStatus(attSide, "immune", 1);
      const dmg = applyDamage(defSide, rand(40, 75), logs);
      logs.push(`${attSide.name} uses Shell-ter: double Shield, Immunity, and ${dmg} reflected force.`);
      break;
    }
    case "dragon": {
      const elements = [
        ["Lightning", "stun", rand(85, 135), 1],
        ["Water", "regen", rand(55, 90), 2],
        ["Wind", "confused", rand(70, 110), 2],
        ["Fire", "burn", rand(80, 130), 2],
      ];
      const [name, status, raw, dur] = elements[Math.floor(Math.random() * elements.length)];
      const dmg = applyDamage(defSide, raw, logs);
      addStatus(status === "regen" ? attSide : defSide, status, dur);
      logs.push(`${attSide.name} channels ${name}: ${dmg} damage and applies ${status}.`);
      break;
    }
    case "butterfly": {
      const dmg = applyDamage(defSide, rand(70, 120), logs);
      addStatus(defSide, "corrupted", 3);
      addStatus(defSide, "confused", 1);
      logs.push(`${attSide.name} Akumatizes the enemy: ${dmg} damage, Corrupted and Confused.`);
      break;
    }
    case "peacock": {
      if (Math.random() < 0.04) {
        const dmg = applyDamage(defSide, rand(190, 290), logs);
        addStatus(defSide, "corrupted", 2);
        addStatus(defSide, "confused", 2);
        logs.push(`Red Moon! ${attSide.name} channels a rare amok for ${dmg} damage.`);
      } else {
        attSide.peacockSenti = Math.min(3, (attSide.peacockSenti || 0) + 1);
        const dmg = applyDamage(defSide, rand(40, 70) * attSide.peacockSenti, logs);
        logs.push(`${attSide.name} summons sentimonster ${attSide.peacockSenti}/3 for ${dmg} swarm damage.`);
      }
      break;
    }
    case "horse": {
      const dmg = applyDamage(defSide, rand(65, 115), logs);
      addStatus(attSide, "dodge", 2);
      logs.push(`${attSide.name} opens Voyage portals: ${dmg} damage and Evasion.`);
      break;
    }
    case "monkey": {
      const dmg = applyDamage(defSide, rand(60, 105), logs);
      addStatus(defSide, "disabled", 3);
      logs.push(`${attSide.name} uses Uproar: ${dmg} damage and disables specials for 3 turns.`);
      break;
    }
    case "dog": {
      const stealable = ["blessed", "shield", "regen", "dodge", "immune", "foresight"];
      const available = (defSide.statuses || []).filter(status => stealable.includes(status.id));
      const dmg = applyDamage(defSide, rand(55, 95), logs);
      if (available.length) {
        const stolen = available[Math.floor(Math.random() * available.length)];
        removeStatus(defSide, stolen.id);
        addStatus(attSide, stolen.id, stolen.duration);
        logs.push(`${attSide.name} uses Fetch: ${dmg} damage and steals ${stolen.id}.`);
      } else {
        logs.push(`${attSide.name} uses Fetch: ${dmg} damage, but there is no buff to retrieve.`);
      }
      break;
    }
    case "ox": {
      const dmg = applyDamage(defSide, rand(50, 85), logs);
      addStatus(attSide, "immune", 2);
      addStatus(attSide, "shield", 1);
      logs.push(`${attSide.name} uses Resistance: ${dmg} damage, Immunity, and Shield.`);
      break;
    }
    case "pig": {
      const healed = healSide(attSide, rand(80, 130));
      addStatus(attSide, "regen", 3);
      logs.push(`${attSide.name} uses Gift: heals ${healed} HP and gains Regen.`);
      break;
    }
    case "goat": {
      const outcomes = [
        () => { const healed = healSide(attSide, rand(60, 110)); return `creates a healing object and restores ${healed} HP`; },
        () => { addStatus(attSide, "blessed", 3); return "creates a focus charm and becomes Blessed"; },
        () => { const dmg = applyDamage(defSide, rand(80, 135), logs); return `creates a heavy object that deals ${dmg} damage`; },
        () => { addStatus(defSide, "stun", 1); return "creates a trap and stuns the enemy"; },
      ];
      logs.push(`${attSide.name} uses Genesis and ${outcomes[Math.floor(Math.random() * outcomes.length)]()}.`);
      break;
    }
    case "rooster": {
      const dmg = applyDamage(defSide, rand(65, 110), logs);
      addStatus(attSide, ["blessed", "regen", "immune", "dodge"][Math.floor(Math.random() * 4)], 2);
      logs.push(`${attSide.name} uses Sublimation: ${dmg} damage and gains a chosen power boost.`);
      break;
    }
    case "mouse": {
      const hits = rand(4, 7);
      let total = 0;
      for (let i = 0; i < hits; i += 1) total += applyDamage(defSide, rand(15, 28), logs);
      logs.push(`${attSide.name} uses Multitude: ${hits} tiny strikes for ${total} total damage.`);
      break;
    }
    case "rabbit": {
      if (!attSide.rabbitBurrowSnapshot && !attSide.rabbitBurrowUsed) {
        attSide.rabbitBurrowSnapshot = {
          hp: attSide.hp,
          createdAt: now(),
        };
        addStatus(attSide, "burrow_anchor", 3);
        addStatus(attSide, "foresight", 2);
        const dmg = applyDamage(defSide, rand(35, 60), logs);
        cooldownMs = 24_000;
        logs.push(`${attSide.name} opens Burrow: saves this timeline at ${attSide.hp} HP, gains Foresight, and bends time for ${dmg} damage.`);
        logs.push(`If ${attSide.name} drops below 35% HP or would fall while anchored, the timeline rewinds and releases paradox damage.`);
      } else if (attSide.rabbitBurrowSnapshot && !attSide.rabbitBurrowUsed) {
        const savedHp = clamp(attSide.rabbitBurrowSnapshot.hp, 1, attSide.maxHp);
        const missing = Math.max(0, savedHp - attSide.hp);
        const rewindHeal = healSide(attSide, missing);
        attSide.rabbitBurrowSnapshot = null;
        attSide.rabbitBurrowUsed = true;
        removeStatus(attSide, "burrow_anchor");
        addStatus(attSide, "dodge", 2);
        addStatus(attSide, "foresight", 2);
        const dmg = applyDamage(defSide, rand(80, 130) + Math.floor(missing * 0.45), logs);
        cooldownMs = 30_000;
        logs.push(`${attSide.name} manually collapses Burrow: rewinds ${rewindHeal} HP, gains Evasion and Foresight, and detonates a paradox for ${dmg} damage.`);
      } else {
        const dmg = applyDamage(defSide, rand(55, 90), logs);
        addStatus(attSide, "foresight", 1);
        cooldownMs = 18_000;
        logs.push(`${attSide.name}'s main Burrow is spent, so they use a quick time-hop for ${dmg} damage and brief Foresight.`);
      }
      break;
    }
    case "bat": {
      const dmg = applyDamage(defSide, rand(75, 130), logs);
      addStatus(defSide, "silenced", 2);
      addStatus(defSide, "weakened", 2);
      addStatus(attSide, "foresight", 3);
      logs.push(`${attSide.name} uses Devocalization: ${dmg} damage, Silence, Weakness, and Foresight.`);
      break;
    }
    default: {
      const mir = MIRACULOUSES[attSide.mirKey];
      const dmg = applyDamage(defSide, rand(mir.baseAtk + 25, mir.baseAtk + 75), logs);
      logs.push(`${attSide.name} uses ${mir.power} for ${dmg} damage.`);
    }
  }

  attSide._useSpecial = false;
  attSide.specialCooldown = now() + cooldownMs;
  attSide.specialCooldownMs = cooldownMs;
  return logs;
}

function applySentihumanSpecialDamageBonus(attSide, defSide, beforeHp, logs) {
  if (attSide?.species !== "Sentihuman" || !defSide || beforeHp <= defSide.hp) return;
  const dealt = beforeHp - defSide.hp;
  const bonus = Math.max(1, Math.floor(dealt * 0.15));
  const actual = applyDamage(defSide, bonus, logs);
  logs.push(`${attSide.name}'s Sentihuman strength adds ${actual} bonus damage.`);
}

function resolveAttack(attSide, defSide) {
  const logs = [];
  const mir = MIRACULOUSES[attSide.mirKey];
  let baseAtk = mir.baseAtk;
  if (hasStatus(attSide, "blessed")) baseAtk = Math.floor(baseAtk * 1.2);
  if (hasStatus(attSide, "corrupted")) baseAtk = Math.floor(baseAtk * 0.8);
  if (hasStatus(attSide, "weakened")) baseAtk = Math.floor(baseAtk * 0.85);

  if (hasStatus(attSide, "confused") && Math.random() < 0.4) {
    const selfDmg = rand(Math.floor(baseAtk * 0.6), Math.floor(baseAtk * 1.2));
    const dmg = applyDamage(attSide, selfDmg, logs);
    logs.push(`${attSide.name} is confused and hits themselves for ${dmg} damage.`);
    return logs;
  }

  if (hasStatus(defSide, "foresight") && Math.random() < 0.5) {
    logs.push(`${defSide.name}'s Foresight predicts the attack.`);
    return logs;
  }

  if (hasStatus(defSide, "dodge") && Math.random() < 0.6) {
    removeStatus(defSide, "dodge");
    logs.push(`${defSide.name} dodges the attack.`);
    return logs;
  }

  let raw = rand(Math.floor(baseAtk * 0.8), Math.floor(baseAtk * 1.35));
  raw = sentihumanDamageBonus(attSide, raw);
  const proc = macaroonProcs(attSide, defSide, raw, logs);
  raw += proc.extra;
  const dmg = applyDamage(defSide, raw, logs);
  logs.push(`${attSide.name} attacks ${defSide.name} for ${dmg} damage.`);
  return logs;
}

function resolveDefend(side) {
  addStatus(side, "defending", 1);
  addStatus(side, "shield", 1);
  const healed = healSide(side, Math.max(10, pct(side.maxHp, 6)));
  return [`${side.name} defends, gains a shield, and steadies for ${healed} HP.`];
}

function canUseSpecial(side) {
  return now() >= (side.specialCooldown || 0) && !hasStatus(side, "disabled") && !hasStatus(side, "silenced");
}

function specialLabel(side) {
  if (side.mirKey === "tiger") {
    const charge = side.tigerCharge || 0;
    if (charge >= 70) return `Unleash Clout (${charge}%)`;
    return `Charge Clout (+10%)`;
  }
  const mir = MIRACULOUSES[side.mirKey];
  if (!canUseSpecial(side)) {
    if (hasStatus(side, "disabled")) return "Special (disabled)";
    if (hasStatus(side, "silenced")) return "Special (silenced)";
    return `Special (${Math.ceil(((side.specialCooldown || 0) - now()) / 1000)}s)`;
  }
  return mir.power;
}

// -- PvP Engine --------------------------------------------
const activeBattles = new Map();
const turnTimers = new Map();

function clearTurnTimer(battleId) {
  const timer = turnTimers.get(battleId);
  if (timer) clearTimeout(timer);
  turnTimers.delete(battleId);
}

function buildBattleEmbed(battle) {
  const sideA = battle.sides[battle.attackerId];
  const sideB = battle.sides[battle.defenderId];
  const turnName = battle.sides[battle.turn].name;

  const fieldA = `${hpBar(sideA.hp, sideA.maxHp)}\nStatus: ${statusLine(sideA)}${extraSideLine(sideA)}`;
  const fieldB = `${hpBar(sideB.hp, sideB.maxHp)}\nStatus: ${statusLine(sideB)}${extraSideLine(sideB)}`;

  const embed = new EmbedBuilder()
    .setTitle(`Battle - Turn ${(battle.turnCount || 0) + 1}`)
    .setColor(0xe74c3c)
    .addFields(
      { name: `${MIRACULOUSES[sideA.mirKey].hero} - ${sideA.name}`, value: fieldA, inline: false },
      { name: `${MIRACULOUSES[sideB.mirKey].hero} - ${sideB.name}`, value: fieldB, inline: false },
    )
    .setFooter({ text: `${turnName}'s turn - ${TURN_TIMEOUT_MS / 1000}s before auto-skip` });
  if (battle.log.length) embed.setDescription(battle.log.slice(-7).join("\n"));
  return embed;
}

function extraSideLine(side) {
  const lines = [];
  if (side.mirKey === "tiger") {
    const charge = clamp(side.tigerCharge || 0, 0, 100);
    const blocks = Math.round(charge / 10);
    const bar = "▰".repeat(blocks) + "▱".repeat(10 - blocks);
    const next = charge >= 70 ? "Ready to unleash" : `Next charge: ${Math.min(100, charge + 10)}%`;
    lines.push(`Clout Charge: ${bar} ${charge}%`);
    lines.push(`Clout State: ${next}`);
  }
  if (side.mirKey === "peacock") lines.push(`Sentimonsters: ${side.peacockSenti || 0}`);
  if (side.mirKey === "rabbit") {
    if (side.rabbitBurrowSnapshot) {
      lines.push(`Burrow Anchor: ${side.rabbitBurrowSnapshot.hp} HP saved`);
    } else if (side.rabbitBurrowUsed) {
      lines.push("Burrow Anchor: Timeline spent");
    } else {
      lines.push("Burrow Anchor: Ready");
    }
  }
  if (side.macaroon) lines.push(`Macaroon: ${ITEMS[side.macaroon]?.name || side.macaroon}`);
  return lines.length ? `\n${lines.join("\n")}` : "";
}

function buildEndEmbed(battle, winnerId) {
  const winner = battle.sides[winnerId];
  const mir = MIRACULOUSES[winner.mirKey];
  return new EmbedBuilder()
    .setTitle("Battle Over")
    .setDescription(`${battle.log.slice(-7).join("\n")}\n\n**${winner.name}** wins!`)
    .setColor(0xf1c40f)
    .setThumbnail(THUMBNAILS[winner.mirKey])
    .addFields({ name: "Victor", value: `**${winner.name}** as **${mir.hero}**` });
}

function buildBattleButtons(battle) {
  const side = battle.sides[battle.turn];
  const usable = canUseSpecial(side);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`attack_${battle.battleId}`).setLabel("Attack").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`special_${battle.battleId}`).setLabel(specialLabel(side)).setStyle(usable ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!usable),
    new ButtonBuilder().setCustomId(`defend_${battle.battleId}`).setLabel("Defend").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`flee_${battle.battleId}`).setLabel("Flee").setStyle(ButtonStyle.Danger),
  );
}

function processTurn(battle, actorId, action) {
  const oppId = actorId === battle.attackerId ? battle.defenderId : battle.attackerId;
  const att = battle.sides[actorId];
  const def = battle.sides[oppId];
  const startLogs = [];
  applyMacaroonStart(att, startLogs);
  battle.log.push(...startLogs);

  const tickLogs = [];
  const delta = tickStatuses(att, tickLogs);
  att.hp = clamp(att.hp + delta, 0, att.maxHp);
  battle.log.push(...tickLogs);

  if (att.hp <= 0) return { ended: true, winnerId: oppId };
  if (hasStatus(att, "stun")) {
    removeStatus(att, "stun");
    battle.log.push(`${att.name} is stunned and loses their turn.`);
    battle.turn = oppId;
    battle.turnCount = (battle.turnCount || 0) + 1;
    return { ended: false };
  }

  if (action === "flee") {
    battle.log.push(`${att.name} fled the battle.`);
    return { ended: true, winnerId: oppId };
  }

  if (action === "special" && !canUseSpecial(att)) action = "attack";
  if (action === "attack") battle.log.push(...resolveAttack(att, def));
  if (action === "special") {
    const beforeHp = def.hp;
    battle.log.push(...resolveSpecial(att, def));
    applySentihumanSpecialDamageBonus(att, def, beforeHp, battle.log);
  }
  if (action === "defend") battle.log.push(...resolveDefend(att));

  checkBurrowRewind(def, att, battle.log);
  checkBurrowRewind(att, def, battle.log);

  const defTickLogs = [];
  const defDelta = tickStatuses(def, defTickLogs);
  def.hp = clamp(def.hp + defDelta, 0, def.maxHp);
  battle.log.push(...defTickLogs);

  if (def.hp <= 0) return { ended: true, winnerId: actorId };
  if (att.hp <= 0) return { ended: true, winnerId: oppId };

  battle.turn = oppId;
  battle.turnCount = (battle.turnCount || 0) + 1;
  return { ended: false };
}

function startTurnTimer(battleId) {
  clearTurnTimer(battleId);
  const handle = setTimeout(async () => {
    const battle = activeBattles.get(battleId);
    if (!battle || !battle.active) return;
    const currentSide = battle.sides[battle.turn];
    const otherId = battle.turn === battle.attackerId ? battle.defenderId : battle.attackerId;
    const idleMs = now() - (battle.lastActivity || battle.startedAt || now());
    if (idleMs >= BATTLE_ABANDON_MS) {
      activeBattles.delete(battleId);
      clearTurnTimer(battleId);
      try {
        if (battle.lastMessage) {
          await battle.lastMessage.edit({
            embeds: [new EmbedBuilder().setTitle("Battle Abandoned").setDescription("No activity - battle ended.").setColor(0x95a5a6)],
            components: [],
          });
        }
      } catch (_) {}
      return;
    }
    battle.log.push(`${currentSide.name} was inactive - turn skipped.`);
    battle.turn = otherId;
    battle.lastActivity = now();
    try {
      if (battle.lastMessage) await battle.lastMessage.edit({ embeds: [buildBattleEmbed(battle)], components: [buildBattleButtons(battle)] });
    } catch (_) {}
    startTurnTimer(battleId);
  }, TURN_TIMEOUT_MS);
  turnTimers.set(battleId, handle);
}

// -- PvE Patrol Engine -------------------------------------
const activePveBattles = new Map();
const pveTimers = new Map();

function chooseVillainByWins(wins) {
  return VILLAIN_TIERS.find(tier => wins >= tier.minWins) || VILLAIN_TIERS[VILLAIN_TIERS.length - 1];
}

function buildPveEmbed(pve) {
  const hero = pve.hero;
  const villain = pve.villain;
  const embed = new EmbedBuilder()
    .setTitle(pve.mode === "storyline" ? `Season 1 Episode ${pve.episode.episode}: ${pve.episode.title}` : `Patrol Combat - ${villain.name} (${villain.rank})`)
    .setColor(villain.color || 0xe67e22)
    .setDescription(pve.log.slice(-8).join("\n") || "The encounter begins.")
    .addFields(
      { name: `${MIRACULOUSES[hero.mirKey].hero} - ${hero.name}`, value: `${hpBar(hero.hp, hero.maxHp)}\nStatus: ${statusLine(hero)}${extraSideLine(hero)}`, inline: false },
      ...(pve.ally ? [{ name: "Ladybug - Teammate", value: `${hpBar(pve.ally.hp, pve.ally.maxHp)}\nStatus: ${statusLine(pve.ally)}\nRole: Captures the akuma and fights beside you`, inline: false }] : []),
      { name: villain.name, value: `${hpBar(villain.hp, villain.maxHp)}\nStatus: ${statusLine(villain)}`, inline: false },
      ...(pve.mode === "storyline" ? [{ name: "Dialogue", value: (pve.dialogue || []).slice(-4).join("\n") || "**Ladybug**: Stay sharp. The akuma has to be inside one of their objects.", inline: false }] : []),
    )
    .setThumbnail(THUMBNAILS[hero.mirKey])
    .setFooter({ text: pve.mode === "storyline" ? `Storyline battle - Ladybug acts after you - ${TURN_TIMEOUT_MS / 1000}s timer` : `Fight, Special, Defend, or Flee - ${TURN_TIMEOUT_MS / 1000}s timer` });
  return embed;
}

function buildPveButtons(pve) {
  const hero = pve.hero;
  const usable = canUseSpecial(hero);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pvefight_${pve.id}`).setLabel("Fight").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`pvespecial_${pve.id}`).setLabel(specialLabel(hero)).setStyle(usable ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!usable),
    new ButtonBuilder().setCustomId(`pvedefend_${pve.id}`).setLabel("Defend").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`pveflee_${pve.id}`).setLabel("Flee").setStyle(ButtonStyle.Danger),
  );
}

function clearPveTimer(pveId) {
  const timer = pveTimers.get(pveId);
  if (timer) clearTimeout(timer);
  pveTimers.delete(pveId);
}

function startPveTimer(pveId) {
  clearPveTimer(pveId);
  const handle = setTimeout(async () => {
    const pve = activePveBattles.get(pveId);
    if (!pve || !pve.active) return;
    const idleMs = now() - (pve.lastActivity || pve.startedAt || now());
    if (idleMs >= PVE_ABANDON_MS) {
      activePveBattles.delete(pveId);
      clearPveTimer(pveId);
      try {
        if (pve.message) await pve.message.edit({ embeds: [new EmbedBuilder().setTitle("Patrol Abandoned").setDescription("No activity - the villain escaped.").setColor(0x95a5a6)], components: [] });
      } catch (_) {}
      return;
    }
    pve.log.push(`${pve.hero.name} hesitated - the villain takes advantage.`);
    processVillainTurn(pve);
    try {
      if (pve.message) {
        if (pve.hero.hp <= 0) await finishPveBattle(pve, false);
        else await pve.message.edit({ embeds: [buildPveEmbed(pve)], components: [buildPveButtons(pve)] });
      }
    } catch (_) {}
    if (activePveBattles.has(pveId)) startPveTimer(pveId);
  }, TURN_TIMEOUT_MS);
  pveTimers.set(pveId, handle);
}

function processVillainTurn(pve) {
  const villain = pve.villain;
  const hero = pve.hero;
  const ally = pve.ally;
  const tickLogs = [];
  const delta = tickStatuses(villain, tickLogs);
  villain.hp = clamp(villain.hp + delta, 0, villain.maxHp);
  pve.log.push(...tickLogs);
  if (villain.hp <= 0) return;

  if (hasStatus(villain, "stun")) {
    const status = getStatus(villain, "stun");
    removeStatus(villain, "stun");
    if (status && status.duration > 1) addStatus(villain, "stun", status.duration - 1);
    pve.log.push(`${villain.name} is stunned and loses a villain turn.`);
    return;
  }

  if (hasStatus(villain, "confused") && Math.random() < 0.35) {
    const selfDamage = rand(Math.floor(villain.atk[0] * 0.5), Math.floor(villain.atk[1] * 0.9));
    const dmg = applyDamage(villain, selfDamage, pve.log);
    pve.log.push(`${villain.name} is confused and damages themselves for ${dmg}.`);
    return;
  }

  const ability = villain.abilities[Math.floor(Math.random() * villain.abilities.length)];
  let raw = rand(ability.damage[0], ability.damage[1]);
  if (hasStatus(villain, "weakened")) raw = Math.floor(raw * 0.75);
  const livingTargets = [hero, ally].filter(side => side && side.hp > 0);
  const target = livingTargets.length > 1 && Math.random() < 0.38 ? ally : hero;
  if (ITEMS[hero.macaroon]?.effects?.enemyAccuracyReduction && Math.random() < 0.25) {
    pve.log.push(`${hero.name}'s Shadow Macaroon bends the attack away.`);
    return;
  }
  if (hasStatus(target, "dodge") && Math.random() < 0.55) {
    removeStatus(target, "dodge");
    pve.log.push(`${target.name} dodges ${villain.name}'s ${ability.name}.`);
    return;
  }
  const dmg = applyDamage(target, raw, pve.log);
  if (ability.status) addStatus(target, ability.status, ability.duration || 1);
  pve.log.push(`${villain.name} uses ${ability.name} on ${target.name}: ${ability.text} ${dmg} damage.`);
  checkBurrowRewind(target, villain, pve.log);

  const heroTickLogs = [];
  const heroDelta = tickStatuses(hero, heroTickLogs);
  hero.hp = clamp(hero.hp + heroDelta, 0, hero.maxHp);
  pve.log.push(...heroTickLogs);
  if (ally && ally.hp > 0) {
    const allyTickLogs = [];
    const allyDelta = tickStatuses(ally, allyTickLogs);
    ally.hp = clamp(ally.hp + allyDelta, 0, ally.maxHp);
    pve.log.push(...allyTickLogs);
  }
}

function processLadybugTurn(pve) {
  if (!pve.ally || pve.ally.hp <= 0 || pve.villain.hp <= 0) return;
  const ladybug = pve.ally;
  const villain = pve.villain;
  const heroName = storyHeroCallout(pve.hero);

  if (hasStatus(ladybug, "stun")) {
    removeStatus(ladybug, "stun");
    pve.log.push("Ladybug is stunned and cannot follow up this turn.");
    addStoryDialogue(pve, "Ladybug", `${heroName}, I'm pinned for a second. Keep them busy!`);
    return;
  }

  if (!ladybug.luckyCharmUsed && (ladybug.hp < pct(ladybug.maxHp, 55) || pve.hero.hp < pct(pve.hero.maxHp, 45))) {
    ladybug.luckyCharmUsed = true;
    const heroHeal = healSide(pve.hero, 55);
    const allyHeal = healSide(ladybug, 75);
    addStatus(pve.hero, "shield", 1);
    addStatus(ladybug, "shield", 1);
    pve.log.push(`Ladybug uses Lucky Charm support: you heal ${heroHeal} HP, Ladybug heals ${allyHeal} HP, and both heroes gain Shield.`);
    addStoryDialogue(pve, "Ladybug", `Lucky Charm! ${heroName}, use this opening and protect the akuma object from breaking loose!`);
    return;
  }

  if (villain.hp <= pct(villain.maxHp, 18)) {
    const dmg = applyDamage(villain, rand(95, 145), pve.log);
    ladybug.purificationReady = true;
    pve.log.push(`Ladybug sets up the capture with her yo-yo for ${dmg} damage. The akuma is almost exposed.`);
    addStoryDialogue(pve, "Ladybug", `${heroName}, destroy their object now! Once the akuma flies out, I'll capture it!`);
    return;
  }

  const moves = [
    () => {
      const dmg = applyDamage(villain, rand(ladybug.atk[0], ladybug.atk[1]), pve.log);
      return `Ladybug swings in with a yo-yo strike for ${dmg} damage.`;
    },
    () => {
      const dmg = applyDamage(villain, rand(ladybug.atk[0] + 15, ladybug.atk[1] + 35), pve.log);
      addStatus(villain, "weakened", 1);
      return `Ladybug binds ${villain.name}'s weapon and deals ${dmg} damage. Enemy Weakened.`;
    },
    () => {
      addStatus(pve.hero, "blessed", 1);
      const dmg = applyDamage(villain, rand(ladybug.atk[0] - 5, ladybug.atk[1]), pve.log);
      return `Ladybug coordinates your opening, blessing your next strike and dealing ${dmg} damage.`;
    },
  ];
  pve.log.push(moves[Math.floor(Math.random() * moves.length)]());
  const lines = [
    `${heroName}, angle them toward me. We finish this together!`,
    `Their object is the key. Watch their hands, ${heroName}!`,
    `Nice move, ${heroName}. I'll keep Ladybug's yo-yo ready.`,
    `Don't let ${villain.name} control the rhythm. Your miraculous can turn this around!`,
  ];
  addStoryDialogue(pve, "Ladybug", lines[Math.floor(Math.random() * lines.length)]);
}

function processPveHeroTurn(pve, action) {
  const hero = pve.hero;
  const villain = pve.villain;
  applyMacaroonStart(hero, pve.log);

  const tickLogs = [];
  const delta = tickStatuses(hero, tickLogs);
  hero.hp = clamp(hero.hp + delta, 0, hero.maxHp);
  pve.log.push(...tickLogs);
  if (hero.hp <= 0) return { ended: true, won: false };

  if (hasStatus(hero, "stun")) {
    removeStatus(hero, "stun");
    pve.log.push(`${hero.name} is stunned and loses the turn.`);
    processVillainTurn(pve);
    return { ended: hero.hp <= 0 || villain.hp <= 0, won: villain.hp <= 0 };
  }

  if (action === "flee") {
    pve.log.push(`${hero.name} fled the patrol encounter.`);
    storylineActionDialogue(pve, action);
    return { ended: true, won: false, fled: true };
  }
  storylineActionDialogue(pve, action);
  if (action === "fight") pve.log.push(...resolveAttack(hero, villain));
  if (action === "special") {
    if (!canUseSpecial(hero)) pve.log.push(...resolveAttack(hero, villain));
    else {
      const beforeHp = villain.hp;
      pve.log.push(...resolveSpecial(hero, villain));
      applySentihumanSpecialDamageBonus(hero, villain, beforeHp, pve.log);
    }
  }
  if (action === "defend") pve.log.push(...resolveDefend(hero));
  checkBurrowRewind(hero, villain, pve.log);

  if (villain.hp <= 0) return { ended: true, won: true };
  if (pve.ally) {
    processLadybugTurn(pve);
    if (villain.hp <= 0) return { ended: true, won: true };
  }
  processVillainTurn(pve);
  if (hero.hp <= 0) return { ended: true, won: false };
  if (villain.hp <= 0) return { ended: true, won: true };
  pve.turnCount += 1;
  return { ended: false, won: false };
}

async function finishPveBattle(pve, won, interaction = null, fled = false) {
  clearPveTimer(pve.id);
  activePveBattles.delete(pve.id);

  const data = loadData();
  const player = getPlayer(data, pve.ownerId, pve.hero.name);
  let rewardText = "";
  let dropText = "";

  if (won) {
    const reward = rand(pve.reward[0], pve.reward[1]);
    player.charms = (player.charms || 0) + reward;
    if (pve.mode === "storyline") {
      if (!player.storyline) player.storyline = { season1: { episode: 1, completed: [] } };
      if (!player.storyline.season1) player.storyline.season1 = { episode: 1, completed: [] };
      if (!Array.isArray(player.storyline.season1.completed)) player.storyline.season1.completed = [];
      if (!player.storyline.season1.completed.includes(pve.episode.episode)) {
        player.storyline.season1.completed.push(pve.episode.episode);
      }
      player.storyline.season1.episode = Math.min(STORYLINE_EPISODES.length, pve.episode.episode + 1);
      player.wins = (player.wins || 0) + 1;
      player.storyProgress = Math.max(player.storyProgress || 0, pve.episode.episode);
    } else {
      player.wins = (player.wins || 0) + 1;
      player.storyProgress = Math.max(player.storyProgress || 0, player.wins || 0);
    }
    const drops = rollDrops(PATROL_DROP_TABLE, pve.hero.mirKey, pve.mode === "storyline" ? Math.min(7, 2 + Math.ceil(pve.episode.episode / 5)) : pve.villain.key === "monarch" ? 5 : 3);
    const dropEntries = Object.entries(drops).filter(([, qty]) => qty > 0);
    for (const [id, qty] of dropEntries) addItem(player, id, qty);
    rewardText = pve.mode === "storyline"
      ? `Episode ${pve.episode.episode} complete! +${reward} charms.\n${pve.episode.win}`
      : `Victory! +${reward} charms.`;
    dropText = dropEntries.length ? dropEntries.map(([id, qty]) => `${ITEMS[id]?.name || id} x${qty}`).join(", ") : "No material drops.";
    const clan = getPlayerClan(data, pve.ownerId);
    if (clan) {
      clan.xp = (clan.xp || 0) + 35;
      clan.wins = (clan.wins || 0) + 1;
      const xpNeeded = Math.max(500, clan.level * 500);
      if (clan.xp >= xpNeeded) {
        clan.level += 1;
        clan.xp -= xpNeeded;
      }
    }
  } else {
    player.losses = (player.losses || 0) + (fled ? 0 : 1);
    player.charms = Math.max(0, (player.charms || 0) + (fled ? 0 : rand(25, 80)));
    rewardText = fled ? "You escaped safely, but earned no reward." : "Defeat. You recovered a few scattered charms.";
  }

  player.activeMacaroon = null;
  saveData(data);

  const embed = new EmbedBuilder()
    .setTitle(pve.mode === "storyline" ? (won ? "Storyline Victory" : fled ? "Storyline Escaped" : "Storyline Defeat") : won ? "Patrol Victory" : fled ? "Patrol Escaped" : "Patrol Defeat")
    .setColor(won ? 0x2ecc71 : fled ? 0x95a5a6 : 0xe74c3c)
    .setDescription(`${pve.log.slice(-8).join("\n")}\n\n**${rewardText}**`)
    .addFields(
      { name: pve.mode === "storyline" ? "Episode" : "Opponent", value: pve.mode === "storyline" ? `S1E${pve.episode.episode}: ${pve.episode.title}` : `${pve.villain.name} (${pve.villain.rank})`, inline: true },
      { name: "Drops", value: dropText || "None", inline: false },
    );

  if (interaction) return interaction.update({ embeds: [embed], components: [] });
  if (pve.message) await pve.message.edit({ embeds: [embed], components: [] });
}

// -- Clan Helpers ------------------------------------------
function getClan(data, clanId) {
  return data.clans?.[clanId] || null;
}

function getPlayerClan(data, playerId) {
  const player = data.players[playerId];
  if (!player?.clanId) return null;
  return data.clans?.[player.clanId] || null;
}

function clanMemberCount(clan) {
  return 1 + (clan.officers?.length || 0) + (clan.members?.length || 0);
}

function clanRole(clan, userId) {
  if (clan.owner === userId) return "Owner";
  if ((clan.officers || []).includes(userId)) return "Officer";
  if ((clan.members || []).includes(userId)) return "Member";
  return null;
}

// -- Slash Commands ----------------------------------------
const commands = [
  new SlashCommandBuilder().setName("miraculous").setDescription("Claim a random Miraculous! (1 hour cooldown)"),
  new SlashCommandBuilder().setName("profile").setDescription("View your Miraculous hero profile.").addUserOption(o => o.setName("user").setDescription("User to view (default: you)")),
  new SlashCommandBuilder().setName("transform").setDescription("Transform with one of your Miraculouses.").addStringOption(o => o.setName("miraculous").setDescription("Miraculous key to transform with").setRequired(true)),
  new SlashCommandBuilder().setName("detransform").setDescription("Detransform and revert to civilian form."),
  new SlashCommandBuilder().setName("ability").setDescription("Use your hero ability outside of battle! Peacock holders can command amoks.")
    .addStringOption(o => o.setName("peacock_action").setDescription("Peacock-only amok action").addChoices(
      { name: "Influence", value: "influence" },
      { name: "Send to Channel", value: "send_channel" },
      { name: "Kill / Delete Sentihuman", value: "kill" },
      { name: "Inspect Obedience", value: "inspect" },
    ))
    .addUserOption(o => o.setName("target").setDescription("Peacock-only target"))
    .addChannelOption(o => o.setName("channel").setDescription("Channel for Send to Channel orders"))
    .addStringOption(o => o.setName("order").setDescription("Custom Peacock influence order")),
  new SlashCommandBuilder().setName("villainability").setDescription("Use a random villain ability! (30s cooldown)"),
  new SlashCommandBuilder().setName("battle").setDescription("Challenge another user to a PvP battle.").addUserOption(o => o.setName("opponent").setDescription("User to challenge").setRequired(true)),
  new SlashCommandBuilder().setName("inventory").setDescription("View your item inventory.")
    .addStringOption(o => o.setName("category").setDescription("Filter by category").addChoices(
      { name: "All", value: "all" }, { name: "Materials", value: "materials" }, { name: "Consumables", value: "consumables" }, { name: "Artifacts", value: "artifacts" }, { name: "Macaroons", value: "macaroons" },
    ))
    .addStringOption(o => o.setName("sort").setDescription("Sort order").addChoices(
      { name: "By Rarity", value: "rarity" }, { name: "By Name", value: "name" }, { name: "By Qty", value: "qty" },
    ))
    .addIntegerOption(o => o.setName("page").setDescription("Page number (default: 1)")),
  new SlashCommandBuilder().setName("miraculouses").setDescription("View your Miraculous collection."),
  new SlashCommandBuilder().setName("patrol").setDescription("Patrol Paris for peaceful rewards or PvE combat."),
  new SlashCommandBuilder().setName("storyline").setDescription("Play Season 1 story episodes with Ladybug as your teammate."),
  new SlashCommandBuilder().setName("identitysendall").setDescription("Admin: DM Human/Sentihuman choice to every member without an identity."),
  new SlashCommandBuilder().setName("chooseidentity").setDescription("Get your Human/Sentihuman choice DM again if you have not chosen yet."),
  new SlashCommandBuilder().setName("identity").setDescription("View identity and obedience info.").addUserOption(o => o.setName("user").setDescription("User to inspect")),
  new SlashCommandBuilder().setName("obedience").setDescription("View a user's obedience percentage.").addUserOption(o => o.setName("user").setDescription("User to inspect")),
  new SlashCommandBuilder().setName("amokorder").setDescription("Peacock holder command: influence, send to channel, inspect, or delete a sentihuman.")
    .addStringOption(o => o.setName("action").setDescription("Amok action").setRequired(true).addChoices(
      { name: "Influence", value: "influence" },
      { name: "Send to Channel", value: "send_channel" },
      { name: "Kill / Delete Sentihuman", value: "kill" },
      { name: "Inspect Obedience", value: "inspect" },
    ))
    .addUserOption(o => o.setName("target").setDescription("Target sentihuman").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Channel for Send to Channel orders"))
    .addStringOption(o => o.setName("order").setDescription("Custom order text")),
  new SlashCommandBuilder().setName("amokrelease").setDescription("Admin: reset a user's Human/Sentihuman choice so they can choose again.").addUserOption(o => o.setName("user").setDescription("User to reset").setRequired(true)),
  new SlashCommandBuilder().setName("identityleaderboard").setDescription("Show the highest obedience sentihumans."),
  new SlashCommandBuilder().setName("leaderboard").setDescription("Top Miraculous heroes by wins."),
  new SlashCommandBuilder().setName("craft").setDescription("Craft an item from materials.").addStringOption(o => o.setName("recipe").setDescription("Recipe ID to craft").setRequired(true)),
  new SlashCommandBuilder().setName("recipes").setDescription("View all available crafting recipes."),
  new SlashCommandBuilder().setName("use").setDescription("Use a macaroon before your next battle.").addStringOption(o => o.setName("item").setDescription("Macaroon item ID to equip").setRequired(true)),
  new SlashCommandBuilder().setName("clan").setDescription("Clan system commands.")
    .addSubcommand(s => s.setName("create").setDescription("Create a new clan (costs 5000 charms).").addStringOption(o => o.setName("name").setDescription("Clan name").setRequired(true)))
    .addSubcommand(s => s.setName("info").setDescription("View clan info.").addStringOption(o => o.setName("name").setDescription("Clan name (default: your clan)")))
    .addSubcommand(s => s.setName("invite").setDescription("Invite a user to your clan.").addUserOption(o => o.setName("user").setDescription("User to invite").setRequired(true)))
    .addSubcommand(s => s.setName("accept").setDescription("Accept a clan invite.").addStringOption(o => o.setName("clan").setDescription("Clan name to accept").setRequired(true)))
    .addSubcommand(s => s.setName("leave").setDescription("Leave your current clan."))
    .addSubcommand(s => s.setName("kick").setDescription("Kick a member from your clan.").addUserOption(o => o.setName("user").setDescription("Member to kick").setRequired(true)))
    .addSubcommand(s => s.setName("promote").setDescription("Promote a member to officer.").addUserOption(o => o.setName("user").setDescription("Member to promote").setRequired(true)))
    .addSubcommand(s => s.setName("vault").setDescription("View your clan vault."))
    .addSubcommand(s => s.setName("deposit").setDescription("Deposit charms into the clan vault.").addIntegerOption(o => o.setName("amount").setDescription("Charms to deposit").setRequired(true)))
    .addSubcommand(s => s.setName("withdraw").setDescription("Withdraw charms from the clan vault (owner/officer only).").addIntegerOption(o => o.setName("amount").setDescription("Charms to withdraw").setRequired(true)))
    .addSubcommand(s => s.setName("leaderboard").setDescription("Top clans by wins.")),
  new SlashCommandBuilder().setName("givemiraculous").setDescription("Give a miraculous to a user.").addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true)).addStringOption(o => o.setName("miraculous").setDescription("Miraculous key").setRequired(true)),
  new SlashCommandBuilder().setName("advancedwarn").setDescription("Warn a user").addUserOption(o => o.setName("user").setDescription("User to warn").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Warning reason").setRequired(true)),
  new SlashCommandBuilder().setName("panel").setDescription("Toggle miraculous ownership system"),
].map(command => command.toJSON());

// -- Client -------------------------------------------------
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    for (const guildId of GUILD_IDS) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commands });
      console.log(`Commands loaded in guild ${guildId}`);
    }
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
  await sendIdentityChoicesToAllGuilds();
});

client.on("guildMemberAdd", async member => {
  if (member.user.bot) return;
  const data = loadData();
  await sendIdentityChoiceDM(member.user, data, member.user.username);
  saveData(data);
});

async function sendIdentityChoicesToAllGuilds() {
  const data = loadData();
  let changed = false;
  for (const player of Object.values(data.players || {})) {
    if (autoHumanIfExpired(player)) changed = true;
  }
  for (const guild of client.guilds.cache.values()) {
    const members = await guild.members.fetch().catch(() => null);
    if (!members) continue;
    for (const member of members.values()) {
      if (member.user.bot) continue;
      const player = getPlayer(data, member.user.id, member.user.username);
      if (autoHumanIfExpired(player)) changed = true;
      if (!player.identity?.species && !player.identity?.choiceExpiresAt) {
        await sendIdentityChoiceDM(member.user, data, member.user.username);
        changed = true;
      }
    }
  }
  if (changed) saveData(data);
}

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isButton()) return handleButton(interaction);
    if (!interaction.isChatInputCommand()) return;
    return handleCommand(interaction);
  } catch (err) {
    console.error("Interaction error:", err);
    const payload = { content: "Something went wrong while processing that action.", ephemeral: true };
    if (interaction.deferred || interaction.replied) return interaction.followUp(payload).catch(() => {});
    return interaction.reply(payload).catch(() => {});
  }
});

async function handleButton(interaction) {
  const customId = interaction.customId;

  if (customId === "identity_dm_human" || customId === "identity_dm_sentihuman") {
    const data = loadData();
    const player = getPlayer(data, interaction.user.id, interaction.user.username);
    if (player.identity?.species) {
      return interaction.reply({ content: `You already chose **${player.identity.species}**. You cannot choose another identity unless an admin releases your amok identity.`, ephemeral: true });
    }
    if (player.identity?.choiceExpiresAt && now() > player.identity.choiceExpiresAt) {
      player.identity = {
        species: "Human",
        obedience: 1,
        chosenAt: now(),
        choiceSentAt: player.identity.choiceSentAt || null,
        choiceExpiresAt: player.identity.choiceExpiresAt || null,
        amokHolderId: null,
        amokOrders: [],
      };
      saveData(data);
      return interaction.reply({ content: "Your 24 hours expired, so you were automatically set as **Human**.", ephemeral: true });
    }

    if (customId === "identity_dm_human") {
      player.identity = {
        species: "Human",
        obedience: 1,
        chosenAt: now(),
        choiceSentAt: player.identity.choiceSentAt || null,
        choiceExpiresAt: player.identity.choiceExpiresAt || null,
        amokHolderId: null,
        amokOrders: [],
      };
      saveData(data);
      return interaction.reply({ content: "You chose **Human**. Obedience: **1%**. You are under your own control.", ephemeral: true });
    }

    const obedience = rand(1, 99);
    player.identity = {
      species: "Sentihuman",
      obedience,
      chosenAt: now(),
      choiceSentAt: player.identity.choiceSentAt || null,
      choiceExpiresAt: player.identity.choiceExpiresAt || null,
      amokHolderId: null,
      amokOrders: [],
    };
    saveData(data);
    return interaction.reply({ content: `You chose **Sentihuman**.\nObedience: **${obedience}%**.\n${obedienceDescription(obedience)}\nYou now gain **+15% HP** and **+15% damage** in combat.`, ephemeral: true });
  }

  if (customId.startsWith("pvefight_") || customId.startsWith("pvespecial_") || customId.startsWith("pvedefend_") || customId.startsWith("pveflee_")) {
    const [prefix, pveId] = customId.split("_");
    const pve = activePveBattles.get(pveId);
    if (!pve) return interaction.reply({ content: "This patrol encounter is no longer active.", ephemeral: true });
    if (interaction.user.id !== pve.ownerId) return interaction.reply({ content: "This patrol is not yours.", ephemeral: true });
    clearPveTimer(pveId);
    pve.lastActivity = now();
    const action = { pvefight: "fight", pvespecial: "special", pvedefend: "defend", pveflee: "flee" }[prefix];
    const result = processPveHeroTurn(pve, action);
    if (result.ended) return finishPveBattle(pve, result.won, interaction, result.fled);
    const msg = await interaction.update({ embeds: [buildPveEmbed(pve)], components: [buildPveButtons(pve)], fetchReply: true });
    pve.message = msg;
    startPveTimer(pveId);
    return;
  }

  const parts = customId.split("_");
  const action = parts[0];
  const battleId = parts.slice(1).join("_");

  if (action === "accept" || action === "decline") {
    const battle = activeBattles.get(battleId);
    if (!battle) return interaction.reply({ content: "This battle no longer exists.", ephemeral: true });
    if (interaction.user.id !== battle.defenderId) return interaction.reply({ content: "This challenge is not for you.", ephemeral: true });
    if (action === "decline") {
      activeBattles.delete(battleId);
      return interaction.update({ content: "Battle declined.", embeds: [], components: [] });
    }
    battle.active = true;
    battle.turn = battle.attackerId;
    battle.startedAt = now();
    battle.lastActivity = now();
    battle.turnCount = 0;
    const msg = await interaction.update({ content: null, embeds: [buildBattleEmbed(battle)], components: [buildBattleButtons(battle)], fetchReply: true });
    battle.lastMessage = msg;
    startTurnTimer(battleId);
    return;
  }

  if (["attack", "special", "defend", "flee"].includes(action)) {
    const battle = activeBattles.get(battleId);
    if (!battle || !battle.active) return interaction.reply({ content: "No active battle found.", ephemeral: true });
    if (interaction.user.id !== battle.turn) return interaction.reply({ content: "It is not your turn.", ephemeral: true });
    const side = battle.sides[interaction.user.id];
    if (action === "special" && !canUseSpecial(side)) return interaction.reply({ content: "Your special is not ready.", ephemeral: true });
    clearTurnTimer(battleId);
    battle.lastActivity = now();
    const result = processTurn(battle, interaction.user.id, action);
    if (result.ended) return finishPvpBattle(interaction, battle, result.winnerId);
    const msg = await interaction.update({ embeds: [buildBattleEmbed(battle)], components: [buildBattleButtons(battle)], fetchReply: true });
    battle.lastMessage = msg;
    startTurnTimer(battleId);
  }
}

async function finishPvpBattle(interaction, battle, winnerId) {
  const data = loadData();
  const attData = data.players[battle.attackerId];
  const defData = data.players[battle.defenderId];
  if (attData) {
    attData.wins = (attData.wins || 0) + (winnerId === battle.attackerId ? 1 : 0);
    attData.losses = (attData.losses || 0) + (winnerId !== battle.attackerId ? 1 : 0);
    attData.activeMacaroon = null;
  }
  if (defData) {
    defData.wins = (defData.wins || 0) + (winnerId === battle.defenderId ? 1 : 0);
    defData.losses = (defData.losses || 0) + (winnerId !== battle.defenderId ? 1 : 0);
    defData.activeMacaroon = null;
  }
  const winnerData = data.players[winnerId];
  if (winnerData) {
    const drops = rollDrops(BATTLE_DROP_TABLE, battle.sides[winnerId].mirKey, 3);
    const entries = Object.entries(drops).filter(([, qty]) => qty > 0);
    for (const [id, qty] of entries) addItem(winnerData, id, qty);
    if (entries.length) battle.log.push(`Drops for ${battle.sides[winnerId].name}: ${entries.map(([id, qty]) => `${ITEMS[id]?.name || id} x${qty}`).join(", ")}`);
    const clan = getPlayerClan(data, winnerId);
    if (clan) {
      clan.xp = (clan.xp || 0) + 50;
      clan.wins = (clan.wins || 0) + 1;
      const needed = Math.max(500, clan.level * 500);
      if (clan.xp >= needed) {
        clan.level += 1;
        clan.xp -= needed;
      }
    }
  }
  saveData(data);
  activeBattles.delete(battle.battleId);
  clearTurnTimer(battle.battleId);
  return interaction.update({ embeds: [buildEndEmbed(battle, winnerId)], components: [] });
}

async function runPeacockAmokAction(interaction, data, holderPlayer, action, targetUser, channel, orderText) {
  if (!holderPlayer.transformed || holderPlayer.transformed !== "peacock") {
    return interaction.reply({ content: "Only a transformed Peacock holder can use amok commands.", ephemeral: true });
  }
  if (!targetUser) return interaction.reply({ content: "Choose a target for the Peacock action.", ephemeral: true });
  if (targetUser.bot) return interaction.reply({ content: "You cannot target a bot with an amok command.", ephemeral: true });

  const targetPlayer = getPlayer(data, targetUser.id, targetUser.username);
  const identity = targetPlayer.identity || {};
  if (identity.species !== "Sentihuman") {
    return interaction.reply({ content: `${targetUser.username} is not a Sentihuman, or has not chosen yet.`, ephemeral: true });
  }

  const obedience = Number(identity.obedience || 0);

  if (action === "inspect") {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Amok Inspection")
          .setColor(0x2980b9)
          .setDescription(`**${targetUser.username}** is a **Sentihuman**.`)
          .addFields(
            { name: "Obedience", value: `${obedience}%`, inline: true },
            { name: "Control Reading", value: obedienceDescription(obedience), inline: false },
          ),
      ],
      ephemeral: true,
    });
  }

  if (action === "influence") {
    const order = orderText || "Stand down and obey the amok holder.";
    targetPlayer.identity.amokHolderId = interaction.user.id;
    targetPlayer.identity.amokOrders.push({ type: "influence", order, by: interaction.user.id, at: now() });
    saveData(data);
    await targetUser.send(`**Peacock Amok Order**\nObedience: **${obedience}%**\nOrder: ${order}\n${obedience < 35 ? "Your will is strong enough to resist most of it." : obedience < 75 ? "You feel the command pulling at your choices." : "The command feels extremely hard to resist."}`).catch(() => null);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Amok Influence Sent")
          .setColor(0x9b59b6)
          .setDescription(`Sent an amok order to **${targetUser.username}**.`)
          .addFields({ name: "Order", value: order }, { name: "Obedience", value: `${obedience}%`, inline: true }),
      ],
    });
  }

  if (action === "send_channel") {
    if (!channel) return interaction.reply({ content: "Choose a channel for the Send to Channel action.", ephemeral: true });
    const order = `Go to ${channel} now.`;
    targetPlayer.identity.amokHolderId = interaction.user.id;
    targetPlayer.identity.amokOrders.push({ type: "send_channel", channelId: channel.id, by: interaction.user.id, at: now() });
    saveData(data);
    await targetUser.send(`**Peacock Amok Order**\nObedience: **${obedience}%**\nOrder: ${order}\n${obedience < 35 ? "You can resist this order if you choose." : obedience < 75 ? "You feel pressured to follow it." : "The amok command feels overwhelming."}`).catch(() => null);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Amok Channel Order")
          .setColor(0x9b59b6)
          .setDescription(`Ordered **${targetUser.username}** to go to ${channel}.`)
          .addFields({ name: "Obedience", value: `${obedience}%`, inline: true }),
      ],
    });
  }

  if (action === "kill") {
    if (obedience < 75) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Amok Deletion Failed")
            .setColor(0xe74c3c)
            .setDescription(`**${targetUser.username}** has only **${obedience}% obedience**. Their will is too strong to delete their sentihuman state.`),
        ],
      });
    }

    resetPlayerForAmokDeletion(targetPlayer);
    for (const [mirKey, ownerId] of Object.entries(data.miraculousOwners || {})) {
      if (ownerId === targetUser.id) delete data.miraculousOwners[mirKey];
    }
    for (const clan of Object.values(data.clans || {})) {
      clan.officers = (clan.officers || []).filter(id => id !== targetUser.id);
      clan.members = (clan.members || []).filter(id => id !== targetUser.id);
      clan.invites = (clan.invites || []).filter(id => id !== targetUser.id);
      if (clan.owner === targetUser.id) clan.owner = interaction.user.id;
    }
    const member = interaction.guild ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : null;
    saveData(data);
    await targetUser.send("Your Sentihuman state was deleted by an amok command. Your RPG data was reset and you must choose Human or Sentihuman again.").catch(() => null);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Amok Deletion Complete")
          .setColor(0x1a0a2e)
          .setDescription(`**${targetUser.username}** had **${obedience}% obedience**. Their sentihuman state and RPG progression were reset. They must choose Human or Sentihuman again.`),
      ],
    });
  }

  return interaction.reply({ content: "Unknown Peacock action.", ephemeral: true });
}

async function handleCommand(interaction) {
  const { commandName, user } = interaction;
  const data = loadData();
  const player = getPlayer(data, user.id, user.username);

  if (commandName === "advancedwarn") {
    if (!ADMIN_IDS.includes(user.id)) return interaction.reply({ content: "No permission.", ephemeral: true });
    const target = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");
    data.warns[target.id] = (data.warns[target.id] || 0) + 1;
    saveData(data);
    try {
      await target.send({ embeds: [new EmbedBuilder().setTitle("Advanced Warning").setColor(0xe74c3c).setThumbnail(target.displayAvatarURL()).setDescription(`You have received a warning in **${interaction.guild.name}**.`).addFields({ name: "Reason", value: reason }, { name: "Total Warnings", value: `${data.warns[target.id]}` }, { name: "Moderator", value: user.username }).setTimestamp()] });
    } catch (_) {}
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Warning Issued").setColor(0xe67e22).setThumbnail(target.displayAvatarURL()).addFields({ name: "User", value: `${target}`, inline: true }, { name: "Moderator", value: `${user}`, inline: true }, { name: "Reason", value: reason }, { name: "Total Warnings", value: `${data.warns[target.id]}` }).setTimestamp()] });
  }

  if (commandName === "panel") {
    if (!ADMIN_IDS.includes(user.id)) return interaction.reply({ content: "No permission.", ephemeral: true });
    CLAIMS_DISABLED = !CLAIMS_DISABLED;
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Panel Updated").setDescription(CLAIMS_DISABLED ? "Ownership system disabled." : "Ownership system enabled.").setColor(CLAIMS_DISABLED ? 0x2ecc71 : 0xe74c3c)] });
  }

  if (commandName === "givemiraculous") {
    if (!ADMIN_IDS.includes(user.id)) return interaction.reply({ content: "No permission.", ephemeral: true });
    const target = interaction.options.getUser("user");
    const key = interaction.options.getString("miraculous").toLowerCase();
    if (!MIRACULOUSES[key]) return interaction.reply({ content: "Invalid miraculous key.", ephemeral: true });
    const targetPlayer = getPlayer(data, target.id, target.username);
    if (!targetPlayer.miraculouses.includes(key)) targetPlayer.miraculouses.push(key);
    if (!CLAIMS_DISABLED) data.miraculousOwners[key] = target.id;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Miraculous Given").setDescription(`Gave **${MIRACULOUSES[key].name}** to ${target}`).setColor(0x2ecc71)] });
  }

  if (commandName === "miraculous") {
    if (now() < (player.claimCooldown || 0)) {
      return interaction.reply({ content: `Wait **${Math.ceil(((player.claimCooldown || 0) - now()) / 60000)}** minute(s) before claiming again.`, ephemeral: true });
    }
    const key = weightedRandomMiraculous();
    if (!CLAIMS_DISABLED && data.miraculousOwners[key]) {
      const ownerName = data.players[data.miraculousOwners[key]]?.username || "Someone";
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Miraculous Taken!").setDescription(`The **${MIRACULOUSES[key].name}** is already held by **${ownerName}**.`).setColor(0xff0000).setThumbnail(THUMBNAILS[key])], ephemeral: true });
    }
    const mir = MIRACULOUSES[key];
    if (!player.miraculouses.includes(key)) player.miraculouses.push(key);
    if (!CLAIMS_DISABLED) data.miraculousOwners[key] = user.id;
    player.claimCooldown = now() + 3_600_000;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${rarityEmoji(mir.rarity)} - You found the ${mir.name}!`).setDescription(mir.description).addFields({ name: "Hero Identity", value: mir.hero, inline: true }, { name: "Special Power", value: mir.power, inline: true }, { name: "Rarity", value: mir.rarity.toUpperCase(), inline: true }, { name: "Base HP", value: String(mir.baseHp), inline: true }, { name: "Base ATK", value: String(mir.baseAtk), inline: true }, { name: "Key", value: `\`${key}\``, inline: true }).setColor(mir.color).setThumbnail(THUMBNAILS[key]).setFooter({ text: "Use /transform <key> to transform!" })] });
  }

  if (commandName === "profile") {
    const targetUser = interaction.options.getUser("user") || user;
    const target = getPlayer(data, targetUser.id, targetUser.username);
    const mirKey = target.transformed;
    const mir = mirKey ? MIRACULOUSES[mirKey] : null;
    const mirList = target.miraculouses.length ? target.miraculouses.map(k => `${rarityEmoji(MIRACULOUSES[k]?.rarity)} ${MIRACULOUSES[k]?.name || k} (\`${k}\`)`).join("\n") : "None collected yet.";
    const clan = target.clanId ? data.clans?.[target.clanId] : null;
    const clanTag = clan ? ` [${clan.tag || clan.name.substring(0, 4).toUpperCase()}]` : "";
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${targetUser.username}${clanTag}'s Profile`).setThumbnail(mir ? THUMBNAILS[mirKey] : targetUser.displayAvatarURL()).setColor(mir ? mir.color : 0x95a5a6).addFields({ name: "Status", value: mir ? `Transformed as **${mir.hero}**` : "Civilian", inline: true }, { name: "Charms", value: `${target.charms || 0}`, inline: true }, { name: "Clan", value: clan ? `${clan.name} (${clanRole(clan, targetUser.id)})` : "None", inline: true }, { name: "HP", value: hpBar(target.hp, target.maxHp) }, { name: "Wins", value: String(target.wins || 0), inline: true }, { name: "Losses", value: String(target.losses || 0), inline: true }, { name: "Miraculouses Owned", value: mirList }, { name: "Active Macaroon", value: target.activeMacaroon ? ITEMS[target.activeMacaroon]?.name || target.activeMacaroon : "None", inline: true }).setFooter({ text: "Miraculous Ladybug RPG v12.0" })] });
  }

  if (commandName === "transform") {
    const key = interaction.options.getString("miraculous").toLowerCase();
    if (!MIRACULOUSES[key]) return interaction.reply({ content: `Unknown key \`${key}\`. Check /miraculouses for your keys.`, ephemeral: true });
    if (!player.miraculouses.includes(key)) return interaction.reply({ content: `You don't own the **${MIRACULOUSES[key].name}**.`, ephemeral: true });
    const mir = MIRACULOUSES[key];
    player.transformed = key;
    player.maxHp = Math.floor(mir.baseHp * sentihumanHpBonus(player));
    player.hp = player.maxHp;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Transformation Sequence!").setDescription(`**${user.username}** transforms into **${mir.hero}**!\n\n*${mir.power} is now active!*`).setColor(mir.color).setThumbnail(THUMBNAILS[key]).addFields({ name: "HP", value: hpBar(player.hp, player.maxHp) }, { name: "Special Power", value: mir.power })] });
  }

  if (commandName === "detransform") {
    if (!player.transformed) return interaction.reply({ content: "You are not currently transformed.", ephemeral: true });
    const prev = MIRACULOUSES[player.transformed];
    player.transformed = null;
    player.hp = 100;
    player.maxHp = 100;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Detransformed!").setDescription(`**${user.username}** reverts from **${prev.hero}** back to civilian form.`).setColor(0x95a5a6)] });
  }

  if (commandName === "ability") {
    if (!player.transformed) return interaction.reply({ content: "You must be transformed to use an ability.", ephemeral: true });
    const peacockAction = interaction.options.getString("peacock_action");
    if (player.transformed === "peacock" && peacockAction) {
      const target = interaction.options.getUser("target");
      const channel = interaction.options.getChannel("channel");
      const order = interaction.options.getString("order");
      return runPeacockAmokAction(interaction, data, player, peacockAction, target, channel, order);
    }
    if (peacockAction && player.transformed !== "peacock") {
      return interaction.reply({ content: "Those options are only for transformed Peacock holders.", ephemeral: true });
    }
    if (now() < (player.abilityCooldown || 0)) return interaction.reply({ content: `Ability on cooldown for **${Math.ceil(((player.abilityCooldown || 0) - now()) / 1000)}s**.`, ephemeral: true });
    const mir = MIRACULOUSES[player.transformed];
    const heal = player.transformed === "bug" ? 90 : rand(10, 30);
    const dmg = player.transformed === "cat" ? rand(125, 190) : rand(Math.floor(mir.baseAtk * 0.8), Math.floor(mir.baseAtk * 1.5));
    player.hp = Math.min(player.maxHp, player.hp + heal);
    player.abilityCooldown = now() + 45_000;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${mir.power} Activated!`).setDescription(`**${user.username}** uses **${mir.power}**!`).setColor(mir.color).setThumbnail(THUMBNAILS[player.transformed]).addFields({ name: "Power Output", value: `${dmg} energy`, inline: true }, { name: "HP Restored", value: `+${heal} HP`, inline: true }, { name: "Current HP", value: hpBar(player.hp, player.maxHp) }).setFooter({ text: "45 second cooldown" })] });
  }

  if (commandName === "villainability") {
    if (now() < (player.villaincooldown || 0)) return interaction.reply({ content: `Villain ability on cooldown for **${Math.ceil(((player.villaincooldown || 0) - now()) / 1000)}s**.`, ephemeral: true });
    const ability = VILLAIN_ABILITIES[Math.floor(Math.random() * VILLAIN_ABILITIES.length)];
    const dmg = rand(ability.damage[0], ability.damage[1]);
    player.villaincooldown = now() + 30_000;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`Villain Power: ${ability.name}!`).setDescription(`**${user.username}** unleashes **${ability.name}**!\n\n*${ability.description}*`).setColor(0x8e44ad).addFields({ name: "Damage Output", value: `${dmg} dark damage` }).setFooter({ text: "30 second cooldown" })] });
  }

  if (commandName === "battle") {
    const opponent = interaction.options.getUser("opponent");
    if (opponent.id === user.id) return interaction.reply({ content: "You cannot battle yourself.", ephemeral: true });
    if (opponent.bot) return interaction.reply({ content: "You cannot battle a bot.", ephemeral: true });
    if (!player.transformed) return interaction.reply({ content: "You must be transformed to battle.", ephemeral: true });
    const opponentPlayer = getPlayer(data, opponent.id, opponent.username);
    if (!opponentPlayer.transformed) return interaction.reply({ content: `**${opponent.username}** is not transformed.`, ephemeral: true });
    const battleId = `${user.id}-${opponent.id}-${Date.now()}`;
    const mirA = MIRACULOUSES[player.transformed];
    const mirB = MIRACULOUSES[opponentPlayer.transformed];
    const battle = {
      battleId, attackerId: user.id, defenderId: opponent.id, attackerName: user.username, defenderName: opponent.username,
      attackerMir: player.transformed, defenderMir: opponentPlayer.transformed, turn: user.id, active: false, log: [], lastMessage: null,
      turnCount: 0, startedAt: now(), lastActivity: now(),
      sides: {
        [user.id]: makeSide(user.id, user.username, player.transformed, player.activeMacaroon, player),
        [opponent.id]: makeSide(opponent.id, opponent.username, opponentPlayer.transformed, opponentPlayer.activeMacaroon, opponentPlayer),
      },
    };
    activeBattles.set(battleId, battle);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`accept_${battleId}`).setLabel("Accept").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`decline_${battleId}`).setLabel("Decline").setStyle(ButtonStyle.Danger));
    return interaction.reply({ content: `${opponent}`, embeds: [new EmbedBuilder().setTitle("Battle Challenge!").setDescription(`**${user.username}** (${mirA.hero}) challenges **${opponent.username}** (${mirB.hero})!`).setColor(0xe74c3c).addFields({ name: mirA.hero, value: hpBar(mirA.baseHp, mirA.baseHp) }, { name: mirB.hero, value: hpBar(mirB.baseHp, mirB.baseHp) }).setFooter({ text: `${opponent.username}, accept or decline!` })], components: [row] });
  }

  if (commandName === "miraculouses") {
    if (!player.miraculouses.length) return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${user.username}'s Miraculous Collection`).setDescription("No Miraculouses yet! Use `/miraculous` to claim one.").setColor(0x95a5a6)] });
    const fields = player.miraculouses.map(k => {
      const m = MIRACULOUSES[k];
      return { name: `${rarityEmoji(m?.rarity)} ${m?.name || k}`, value: `Hero: **${m?.hero || "Unknown"}** | Power: **${m?.power || "Unknown"}** | ATK: ${m?.baseAtk || 0} | HP: ${m?.baseHp || 0}\nKey: \`${k}\``, inline: false };
    });
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${user.username}'s Miraculous Collection`).addFields(fields).setColor(0x3498db)] });
  }

  if (commandName === "inventory") {
    const rawCat = interaction.options.getString("category") || "all";
    const sortBy = interaction.options.getString("sort") || "rarity";
    const page = Math.max(0, (interaction.options.getInteger("page") || 1) - 1);
    const result = getInventoryPage(player, rawCat === "all" ? null : rawCat, page, sortBy);
    if (!result.total) return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${user.username}'s Inventory`).setDescription("Your inventory is empty! Win battles and patrols to earn drops.").setColor(0x95a5a6)] });
    const lines = result.entries.map(({ item, qty }) => `${rarityEmoji(item.rarity)} **${item.name}** x${qty}\n*${item.description}*`);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${user.username}'s Inventory`).setDescription(lines.join("\n\n")).setColor(0x3498db).setFooter({ text: `Page ${result.page + 1}/${result.totalPages} - ${result.total} item types | Sort: ${sortBy} | Category: ${rawCat}` })] });
  }

  if (commandName === "patrol") {
    if (!player.transformed) return interaction.reply({ content: "You must be transformed to patrol.", ephemeral: true });
    if (Math.random() < 0.70) {
      const charms = rand(100, 500);
      player.charms = (player.charms || 0) + charms;
      const bonusDrops = Math.random() < 0.30 ? rollDrops(PATROL_DROP_TABLE, player.transformed, 1) : {};
      const entries = Object.entries(bonusDrops);
      for (const [id, qty] of entries) addItem(player, id, qty);
      saveData(data);
      const flavor = PEACEFUL_PATROL_TEXT[Math.floor(Math.random() * PEACEFUL_PATROL_TEXT.length)];
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Peaceful Patrol").setDescription(`${flavor}\n\nYou earn **${charms} charms**.${entries.length ? `\n\nFound: ${entries.map(([id, qty]) => `${ITEMS[id].name} x${qty}`).join(", ")}` : ""}`).setColor(0x2ecc71).setThumbnail(THUMBNAILS[player.transformed])] });
    }

    const tier = chooseVillainByWins(player.wins || 0);
    const pveId = `${user.id}-${Date.now()}`;
    const pve = {
      id: pveId,
      ownerId: user.id,
      active: true,
      hero: makeSide(user.id, user.username, player.transformed, player.activeMacaroon, player),
      villain: makeVillainSide(tier),
      reward: tier.reward,
      log: [`A patrol turns dangerous: ${tier.name} appears!`],
      turnCount: 0,
      startedAt: now(),
      lastActivity: now(),
      message: null,
    };
    activePveBattles.set(pveId, pve);
    const msg = await interaction.reply({ embeds: [buildPveEmbed(pve)], components: [buildPveButtons(pve)], fetchReply: true });
    pve.message = msg;
    startPveTimer(pveId);
    return;
  }

  if (commandName === "storyline") {
    if (!player.transformed) return interaction.reply({ content: "You must be transformed to start the storyline.", ephemeral: true });
    const episode = chooseStorylineEpisode(player);
    const pveId = `story-${user.id}-${Date.now()}`;
    const villainTemplate = {
      key: `story_s1e${episode.episode}`,
      name: episode.villain,
      rank: `S1E${episode.episode}`,
      hp: episode.hp,
      atk: episode.atk,
      reward: episode.reward,
      color: episode.color,
      abilities: episode.abilities,
    };
    const pve = {
      id: pveId,
      ownerId: user.id,
      active: true,
      mode: "storyline",
      episode,
      hero: makeSide(user.id, user.username, player.transformed, player.activeMacaroon, player),
      ally: makeLadybugAlly(episode.episode),
      villain: makeVillainSide(villainTemplate),
      reward: episode.reward,
      log: [
        `Season 1 Episode ${episode.episode}: ${episode.title}`,
        episode.intro,
      ],
      dialogue: [
        `**Ladybug**: ${storyHeroCallout(makeSide(user.id, user.username, player.transformed, player.activeMacaroon, player))}, stay with me. We weaken ${episode.villain}, then I capture the akuma.`,
      ],
      turnCount: 0,
      startedAt: now(),
      lastActivity: now(),
      message: null,
    };
    activePveBattles.set(pveId, pve);
    const msg = await interaction.reply({ embeds: [buildPveEmbed(pve)], components: [buildPveButtons(pve)], fetchReply: true });
    pve.message = msg;
    startPveTimer(pveId);
    return;
  }

  if (commandName === "identitysendall") {
    if (!ADMIN_IDS.includes(user.id)) return interaction.reply({ content: "No permission.", ephemeral: true });
    if (!interaction.guild) return interaction.reply({ content: "Use this command inside a server.", ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    let sent = 0;
    let skipped = 0;
    for (const member of members.values()) {
      if (member.user.bot) {
        skipped += 1;
        continue;
      }
      const targetPlayer = getPlayer(data, member.user.id, member.user.username);
      autoHumanIfExpired(targetPlayer);
      if (targetPlayer.identity?.species) {
        skipped += 1;
        continue;
      }
      await sendIdentityChoiceDM(member.user, data, member.user.username);
      sent += 1;
    }
    saveData(data);
    return interaction.editReply(`Sent identity choice DMs to **${sent}** member(s). Skipped **${skipped}** member(s).`);
  }

  if (commandName === "chooseidentity") {
    if (player.identity?.species) return interaction.reply({ content: `You already chose **${player.identity.species}**.`, ephemeral: true });
    await sendIdentityChoiceDM(user, data, user.username);
    saveData(data);
    return interaction.reply({ content: "I sent you the Human/Sentihuman choice DM. You have 24 hours before auto-Human.", ephemeral: true });
  }

  if (commandName === "identity" || commandName === "obedience") {
    const target = interaction.options.getUser("user") || user;
    const targetPlayer = getPlayer(data, target.id, target.username);
    const identity = targetPlayer.identity || {};
    const species = identity.species || "Not chosen";
    const obedience = identity.obedience === null || identity.obedience === undefined ? "Unknown" : `${identity.obedience}%`;
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${target.username}'s Identity`)
          .setColor(species === "Sentihuman" ? 0x9b59b6 : species === "Human" ? 0x3498db : 0x95a5a6)
          .addFields(
            { name: "Species", value: species, inline: true },
            { name: "Obedience", value: obedience, inline: true },
            { name: "Reading", value: typeof identity.obedience === "number" ? obedienceDescription(identity.obedience) : "They have not chosen Human or Sentihuman yet.", inline: false },
          ),
      ],
      ephemeral: commandName === "obedience",
    });
  }

  if (commandName === "amokorder") {
    const action = interaction.options.getString("action");
    const target = interaction.options.getUser("target");
    const channel = interaction.options.getChannel("channel");
    const order = interaction.options.getString("order");
    return runPeacockAmokAction(interaction, data, player, action, target, channel, order);
  }

  if (commandName === "amokrelease") {
    if (!ADMIN_IDS.includes(user.id)) return interaction.reply({ content: "No permission.", ephemeral: true });
    const target = interaction.options.getUser("user");
    const targetPlayer = getPlayer(data, target.id, target.username);
    targetPlayer.identity = { species: null, obedience: null, chosenAt: null, choiceSentAt: null, choiceExpiresAt: null, amokHolderId: null, amokOrders: [] };
    saveData(data);
    await target.send("Your Human/Sentihuman identity was released by an admin. You may choose again from the identity panel.").catch(() => null);
    return interaction.reply({ content: `${target.username}'s identity was reset. They can choose again.`, ephemeral: true });
  }

  if (commandName === "identityleaderboard") {
    const sentis = Object.values(data.players || {})
      .filter(p => p.identity?.species === "Sentihuman")
      .sort((a, b) => (b.identity?.obedience || 0) - (a.identity?.obedience || 0))
      .slice(0, 10);
    const lines = sentis.map((p, index) => `**${index + 1}.** ${p.username} - ${p.identity.obedience}% obedience`);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Sentihuman Obedience Leaderboard")
          .setColor(0x9b59b6)
          .setDescription(lines.join("\n") || "No Sentihumans have chosen yet."),
      ],
    });
  }

  if (commandName === "leaderboard") {
    const sorted = Object.values(data.players).sort((a, b) => (b.wins || 0) - (a.wins || 0)).slice(0, 10);
    const lines = sorted.map((p, i) => `**${i + 1}.** ${p.username} - ${p.wins || 0}W/${p.losses || 0}L (${p.transformed ? MIRACULOUSES[p.transformed]?.hero || p.transformed : "Civilian"})`);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Miraculous Leaderboard").setDescription(lines.join("\n") || "No players yet.").setColor(0xf1c40f)] });
  }

  if (commandName === "recipes") {
    const lines = Object.entries(RECIPES).map(([key, recipe]) => {
      const result = ITEMS[recipe.result];
      const ing = Object.entries(recipe.ingredients).map(([id, qty]) => `${(player.itemInventory[id] || 0) >= qty ? "OK" : "NO"} ${ITEMS[id]?.name || id} x${qty} (have ${player.itemInventory[id] || 0})`).join("\n");
      return `**${rarityEmoji(result.rarity)} ${result.name}** (\`${key}\`)${recipe.failChance ? ` - ${Math.round(recipe.failChance * 100)}% fail chance` : ""}\n${ing}`;
    });
    const pages = [];
    for (let i = 0; i < lines.length; i += 5) pages.push(lines.slice(i, i + 5).join("\n\n"));
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Crafting Recipes").setDescription(pages[0] || "No recipes available.").setColor(0x27ae60).setFooter({ text: `Page 1/${pages.length} - use /craft <recipe_id> to craft` })] });
  }

  if (commandName === "craft") {
    const recipeKey = interaction.options.getString("recipe").toLowerCase();
    const recipe = RECIPES[recipeKey];
    if (!recipe) return interaction.reply({ content: `Unknown recipe \`${recipeKey}\`. Use /recipes to see all recipes.`, ephemeral: true });
    const result = ITEMS[recipe.result];
    const missing = Object.entries(recipe.ingredients).filter(([id, qty]) => !hasItem(player, id, qty)).map(([id, qty]) => `${ITEMS[id]?.name || id}: need ${qty}, have ${player.itemInventory[id] || 0}`);
    if (missing.length) return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Missing Ingredients").setDescription("You don't have everything needed:\n" + missing.map(m => `- ${m}`).join("\n")).setColor(0xe74c3c)], ephemeral: true });
    for (const [id, qty] of Object.entries(recipe.ingredients)) removeItem(player, id, qty);
    if (recipe.failChance > 0 && Math.random() < recipe.failChance) {
      saveData(data);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Craft Failed!").setDescription(`The legendary crafting of **${result.name}** failed and materials were lost.`).setColor(0x95a5a6)] });
    }
    addItem(player, recipe.result, recipe.qty);
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Craft Successful!").setDescription(`**${user.username}** crafted **${rarityEmoji(result.rarity)} ${result.name}** x${recipe.qty}!`).setColor(rarityColor(result.rarity)).addFields({ name: "Effect", value: result.description })] });
  }

  if (commandName === "use") {
    const itemId = interaction.options.getString("item").toLowerCase();
    const item = ITEMS[itemId];
    if (!item) return interaction.reply({ content: `Unknown item \`${itemId}\`.`, ephemeral: true });
    if (item.category !== "macaroons") return interaction.reply({ content: "Only macaroons can be equipped with /use.", ephemeral: true });
    if (!hasItem(player, itemId)) return interaction.reply({ content: `You don't have **${item.name}** in your inventory.`, ephemeral: true });
    removeItem(player, itemId, 1);
    player.activeMacaroon = itemId;
    saveData(data);
    const fx = item.effects || {};
    const fxList = [];
    if (fx.dmgBonus) fxList.push(`+${fx.dmgBonus}% damage`);
    if (fx.specialBonus) fxList.push(`+${fx.specialBonus}% special damage`);
    if (fx.dodgeBonus) fxList.push(`+${fx.dodgeBonus}% dodge chance`);
    if (fx.hpBonus) fxList.push(`+${fx.hpBonus} HP at battle start`);
    if (fx.regenTurns) fxList.push(`Regen for ${fx.regenTurns} turns`);
    if (fx.foresightTurns) fxList.push(`Foresight for ${fx.foresightTurns} turns`);
    if (fx.burnChance) fxList.push(`${fx.burnChance}% burn on attacks`);
    if (fx.stunChance) fxList.push(`${fx.stunChance}% stun on attacks`);
    if (fx.poisonOnHit) fxList.push("Burning venom on attack");
    if (fx.stunImmunity) fxList.push("Stun immunity once");
    if (fx.cdReduction) fxList.push("Special cooldown reduction");
    if (fx.enemyAccuracyReduction) fxList.push("Reduces enemy accuracy");
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${item.name} Equipped!`).setDescription(`**${user.username}** equips **${rarityEmoji(item.rarity)} ${item.name}** for their next battle.\n\n${item.description}`).setColor(rarityColor(item.rarity)).addFields({ name: "Effects", value: fxList.length ? fxList.join("\n") : "-" }).setFooter({ text: "This macaroon activates at the start of your next battle." })] });
  }

  if (commandName === "clan") return handleClanCommand(interaction, data, player);
}

async function handleClanCommand(interaction, data, player) {
  const user = interaction.user;
  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    if (player.clanId) return interaction.reply({ content: "You are already in a clan. Leave it first.", ephemeral: true });
    const clanName = interaction.options.getString("name").trim();
    if (!clanName || clanName.length < 2 || clanName.length > 32) return interaction.reply({ content: "Clan name must be 2-32 characters.", ephemeral: true });
    if (Object.values(data.clans || {}).some(c => c.name.toLowerCase() === clanName.toLowerCase())) return interaction.reply({ content: `A clan named **${clanName}** already exists.`, ephemeral: true });
    if ((player.charms || 0) < CLAN_CREATE_COST) return interaction.reply({ content: `Creating a clan costs **${CLAN_CREATE_COST} charms**. You have ${player.charms || 0}.`, ephemeral: true });
    player.charms -= CLAN_CREATE_COST;
    const clanId = `clan_${user.id}_${Date.now()}`;
    data.clans[clanId] = { id: clanId, name: clanName, tag: clanName.substring(0, 4).toUpperCase(), owner: user.id, officers: [], members: [], level: 1, xp: 0, wins: 0, vault: 0, vaultItems: {}, invites: [], createdAt: now() };
    player.clanId = clanId;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Clan Created!").setDescription(`**${clanName}** has been founded by **${user.username}**!`).setColor(0xf1c40f).addFields({ name: "Clan Tag", value: data.clans[clanId].tag, inline: true }, { name: "Level", value: "1", inline: true }, { name: "Cost Paid", value: `${CLAN_CREATE_COST} charms`, inline: true })] });
  }

  if (sub === "info") {
    const searchName = interaction.options.getString("name");
    const clan = searchName ? Object.values(data.clans || {}).find(c => c.name.toLowerCase() === searchName.toLowerCase()) : (player.clanId ? data.clans?.[player.clanId] : null);
    if (!clan) return interaction.reply({ content: searchName ? `No clan named **${searchName}** found.` : "You are not in a clan.", ephemeral: true });
    const memberList = [data.players[clan.owner]?.username || "Unknown Owner", ...(clan.officers || []).map(id => `${data.players[id]?.username || "?"} (Officer)`), ...(clan.members || []).map(id => data.players[id]?.username || "?")].join("\n");
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`[${clan.tag}] ${clan.name}`).setColor(0xf1c40f).addFields({ name: "Owner", value: data.players[clan.owner]?.username || "Unknown", inline: true }, { name: "Level", value: `${clan.level}`, inline: true }, { name: "XP", value: `${clan.xp}/${clan.level * 500}`, inline: true }, { name: "Members", value: `${clanMemberCount(clan)}/${CLAN_MAX_MEMBERS}`, inline: true }, { name: "Wins", value: `${clan.wins || 0}`, inline: true }, { name: "Vault", value: `${clan.vault || 0} charms`, inline: true }, { name: "Roster", value: memberList || "None" })] });
  }

  if (sub === "invite") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    if (clan.owner !== user.id && !(clan.officers || []).includes(user.id)) return interaction.reply({ content: "Only owners and officers can invite.", ephemeral: true });
    if (clanMemberCount(clan) >= CLAN_MAX_MEMBERS) return interaction.reply({ content: `Your clan is full (${CLAN_MAX_MEMBERS} members max).`, ephemeral: true });
    const target = interaction.options.getUser("user");
    const targetP = getPlayer(data, target.id, target.username);
    if (targetP.clanId) return interaction.reply({ content: `${target.username} is already in a clan.`, ephemeral: true });
    if (!clan.invites) clan.invites = [];
    if (clan.invites.includes(target.id)) return interaction.reply({ content: `${target.username} already has a pending invite.`, ephemeral: true });
    clan.invites.push(target.id);
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Invite Sent").setDescription(`**${target.username}** has been invited to **${clan.name}**.\nThey can accept with \`/clan accept ${clan.name}\`.`).setColor(0x2ecc71)] });
  }

  if (sub === "accept") {
    if (player.clanId) return interaction.reply({ content: "You are already in a clan.", ephemeral: true });
    const clanName = interaction.options.getString("clan");
    const clan = Object.values(data.clans || {}).find(c => c.name.toLowerCase() === clanName.toLowerCase());
    if (!clan) return interaction.reply({ content: `No clan named **${clanName}** found.`, ephemeral: true });
    if (!clan.invites?.includes(user.id)) return interaction.reply({ content: `You don't have a pending invite from **${clan.name}**.`, ephemeral: true });
    if (clanMemberCount(clan) >= CLAN_MAX_MEMBERS) return interaction.reply({ content: "That clan is now full.", ephemeral: true });
    clan.invites = clan.invites.filter(id => id !== user.id);
    clan.members = [...(clan.members || []), user.id];
    player.clanId = clan.id;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Joined Clan!").setDescription(`**${user.username}** joined **${clan.name}**!`).setColor(0xf1c40f)] });
  }

  if (sub === "leave") {
    if (!player.clanId) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    const clan = data.clans?.[player.clanId];
    if (!clan) {
      player.clanId = null;
      saveData(data);
      return interaction.reply({ content: "Left your missing clan record.", ephemeral: true });
    }
    if (clan.owner === user.id) return interaction.reply({ content: "You are the clan owner. Transfer ownership or disband the clan first.", ephemeral: true });
    clan.officers = (clan.officers || []).filter(id => id !== user.id);
    clan.members = (clan.members || []).filter(id => id !== user.id);
    player.clanId = null;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Left Clan").setDescription(`**${user.username}** left **${clan.name}**.`).setColor(0x95a5a6)] });
  }

  if (sub === "kick") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    if (clan.owner !== user.id && !(clan.officers || []).includes(user.id)) return interaction.reply({ content: "Only owners and officers can kick.", ephemeral: true });
    const target = interaction.options.getUser("user");
    const targetP = data.players[target.id];
    if (!targetP?.clanId || targetP.clanId !== clan.id) return interaction.reply({ content: `${target.username} is not in your clan.`, ephemeral: true });
    if (clan.owner === target.id) return interaction.reply({ content: "You cannot kick the clan owner.", ephemeral: true });
    if (clan.officers?.includes(user.id) && clan.officers?.includes(target.id)) return interaction.reply({ content: "Officers cannot kick other officers. Only the owner can.", ephemeral: true });
    clan.officers = (clan.officers || []).filter(id => id !== target.id);
    clan.members = (clan.members || []).filter(id => id !== target.id);
    targetP.clanId = null;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Member Kicked").setDescription(`**${target.username}** was removed from **${clan.name}**.`).setColor(0xe74c3c)] });
  }

  if (sub === "promote") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    if (clan.owner !== user.id) return interaction.reply({ content: "Only the clan owner can promote members.", ephemeral: true });
    const target = interaction.options.getUser("user");
    if (!(clan.members || []).includes(target.id)) return interaction.reply({ content: `${target.username} is not a regular member of your clan.`, ephemeral: true });
    clan.members = (clan.members || []).filter(id => id !== target.id);
    clan.officers = [...(clan.officers || []), target.id];
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Member Promoted").setDescription(`**${target.username}** is now an Officer of **${clan.name}**!`).setColor(0xf1c40f)] });
  }

  if (sub === "vault") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${clan.name} - Vault`).setColor(0xf1c40f).setDescription("Use `/clan deposit` to add charms, `/clan withdraw` (officer+) to take them.").addFields({ name: "Charms", value: `${clan.vault || 0}`, inline: true })] });
  }

  if (sub === "deposit") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    const amount = interaction.options.getInteger("amount");
    if (amount <= 0) return interaction.reply({ content: "Amount must be positive.", ephemeral: true });
    if ((player.charms || 0) < amount) return interaction.reply({ content: `You only have **${player.charms || 0} charms**.`, ephemeral: true });
    player.charms -= amount;
    clan.vault = (clan.vault || 0) + amount;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Deposit Successful").setDescription(`**${user.username}** deposited **${amount} charms** into **${clan.name}**'s vault.`).setColor(0x2ecc71).addFields({ name: "Vault Balance", value: `${clan.vault} charms`, inline: true })] });
  }

  if (sub === "withdraw") {
    const clan = player.clanId ? data.clans?.[player.clanId] : null;
    if (!clan) return interaction.reply({ content: "You are not in a clan.", ephemeral: true });
    if (clan.owner !== user.id && !(clan.officers || []).includes(user.id)) return interaction.reply({ content: "Only owners and officers can withdraw.", ephemeral: true });
    const amount = interaction.options.getInteger("amount");
    if (amount <= 0) return interaction.reply({ content: "Amount must be positive.", ephemeral: true });
    if ((clan.vault || 0) < amount) return interaction.reply({ content: `The vault only has **${clan.vault || 0} charms**.`, ephemeral: true });
    clan.vault -= amount;
    player.charms = (player.charms || 0) + amount;
    saveData(data);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Withdrawal Successful").setDescription(`**${user.username}** withdrew **${amount} charms** from **${clan.name}**'s vault.`).setColor(0x3498db).addFields({ name: "Vault Balance", value: `${clan.vault} charms`, inline: true })] });
  }

  if (sub === "leaderboard") {
    const sorted = Object.values(data.clans || {}).sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.level || 1) - (a.level || 1)).slice(0, 10);
    const lines = sorted.map((c, i) => `**${i + 1}.** [${c.tag}] ${c.name} - Lv.${c.level} | ${c.wins || 0} wins | ${clanMemberCount(c)} members`);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle("Clan Leaderboard").setDescription(lines.join("\n") || "No clans yet.").setColor(0xf1c40f)] });
  }
}

client.login(TOKEN);
