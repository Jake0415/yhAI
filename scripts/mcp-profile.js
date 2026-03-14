#!/usr/bin/env node
/**
 * MCP 서버 프로필 전환 도구
 *
 * Usage:
 *   node scripts/mcp-profile.js              # 현재 프로필 표시
 *   node scripts/mcp-profile.js minimal      # minimal 프로필로 전환
 *   node scripts/mcp-profile.js dev          # dev 프로필로 전환
 *   node scripts/mcp-profile.js planning     # planning 프로필로 전환
 *   node scripts/mcp-profile.js full         # full 프로필로 전환
 */

const fs = require("fs");
const path = require("path");

const SETTINGS_PATH = path.resolve(
  __dirname,
  "..",
  ".claude",
  "settings.local.json"
);

const PROFILES = {
  minimal: {
    servers: ["slack"],
    description: "기획, Slack 소통 전용 (~20k 토큰 절약)",
  },
  dev: {
    servers: ["slack", "shadcn", "context7", "playwright"],
    description: "프론트엔드 개발 (~8k 토큰 절약)",
  },
  planning: {
    servers: ["slack", "sequential-thinking"],
    description: "복잡한 기획/분석 (~15k 토큰 절약)",
  },
  full: {
    servers: [
      "slack",
      "playwright",
      "context7",
      "sequential-thinking",
      "shadcn",
      "shrimp-task-manager",
    ],
    description: "전체 서버 활성화 (절약 없음)",
  },
};

function readSettings() {
  const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

function detectCurrentProfile(enabledServers) {
  for (const [name, profile] of Object.entries(PROFILES)) {
    const a = [...profile.servers].sort();
    const b = [...enabledServers].sort();
    if (a.length === b.length && a.every((v, i) => v === b[i])) {
      return name;
    }
  }
  return null;
}

function showStatus() {
  const settings = readSettings();
  const allEnabled = settings.enableAllProjectMcpServers;
  const servers = settings.enabledMcpjsonServers || [];

  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║  MCP Server Profile Status                ║");
  console.log("╠═══════════════════════════════════════════╣");

  if (allEnabled) {
    console.log("║  모드: 전체 활성화 (enableAll = true)     ║");
    console.log("║  프로필: N/A                              ║");
  } else {
    const profile = detectCurrentProfile(servers);
    const profileName = profile || "custom";
    console.log(`║  프로필: ${profileName.padEnd(33)}║`);
    console.log(`║  서버: ${servers.join(", ").padEnd(35)}║`);
  }

  console.log("╚═══════════════════════════════════════════╝");

  console.log("\n사용 가능한 프로필:");
  for (const [name, profile] of Object.entries(PROFILES)) {
    const marker = !allEnabled && detectCurrentProfile(servers) === name ? " ◀ 현재" : "";
    console.log(`  ${name.padEnd(10)} ${profile.description}${marker}`);
    console.log(`  ${"".padEnd(10)} 서버: ${profile.servers.join(", ")}`);
  }
  console.log();
}

function switchProfile(profileName) {
  const profile = PROFILES[profileName];
  if (!profile) {
    console.error(`\n오류: 알 수 없는 프로필 "${profileName}"`);
    console.error(`사용 가능: ${Object.keys(PROFILES).join(", ")}\n`);
    process.exit(1);
  }

  const settings = readSettings();
  settings.enableAllProjectMcpServers = false;
  settings.enabledMcpjsonServers = profile.servers;
  writeSettings(settings);

  console.log(`\n✅ 프로필 "${profileName}"로 전환 완료!`);
  console.log(`   서버: ${profile.servers.join(", ")}`);
  console.log(`   ${profile.description}`);
  console.log(`\n⚠️  Claude Code를 재시작해야 적용됩니다.\n`);
}

// ── Main ──
const arg = process.argv[2];

if (!arg) {
  showStatus();
} else {
  switchProfile(arg);
}
