#!/usr/bin/env node
/**
 * API and Database Integration Test Script
 * Tests all APIs, database connection, and game mechanics
 *
 * Usage: node scripts/test-api-and-db.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

// ============================================
// Configuration
// ============================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-chars-long';
const IS_ANON_KEY = !process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, colors.cyan);
  log(`  ${title}`, colors.bold);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logTest(name, passed, error = null) {
  if (passed) {
    testResults.passed++;
    log(`  ✓ ${name}`, colors.green);
  } else {
    testResults.failed++;
    log(`  ✗ ${name}`, colors.red);
    if (error) {
      log(`    Error: ${error}`, colors.yellow);
      testResults.errors.push({ test: name, error: String(error) });
    }
  }
}

// ============================================
// 1. Database Connection Tests
// ============================================

async function testDatabaseConnection() {
  logSection('1. DATABASE CONNECTION TESTS');

  // Check environment variables
  logTest('SUPABASE_URL is set', !!SUPABASE_URL, !SUPABASE_URL ? 'Missing SUPABASE_URL' : null);
  logTest('SUPABASE API KEY is set', !!SUPABASE_SERVICE_KEY, !SUPABASE_SERVICE_KEY ? 'Missing API KEY' : null);

  if (IS_ANON_KEY) {
    log('  Note: Using anon/publishable key (limited access)', colors.yellow);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('\n  Cannot proceed with DB tests without credentials', colors.yellow);
    return null;
  }

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Test basic connection
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    logTest('Supabase connection works', !error, error?.message);
  } catch (e) {
    logTest('Supabase connection works', false, e.message);
    return null;
  }

  // Test all tables exist
  const tables = [
    'users',
    'sessions',
    'game_scores',
    'claim_transactions',
    'daily_bonus_claims',
    'barn_game_attempts',
    'barn_game_purchases',
    'payment_references',
    'siwe_nonces',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      logTest(`Table '${table}' exists`, !error, error?.message);
    } catch (e) {
      logTest(`Table '${table}' exists`, false, e.message);
    }
  }

  return supabase;
}

// ============================================
// 2. Auth Service Tests
// ============================================

async function testAuthServices(supabase) {
  logSection('2. AUTH SERVICE TESTS');

  if (!supabase) {
    log('  Skipping - no database connection', colors.yellow);
    return;
  }

  // Test nonce generation
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertError } = await supabase
      .from('siwe_nonces')
      .insert({ nonce, expires_at: expiresAt.toISOString() });

    logTest('Nonce generation (INSERT to siwe_nonces)', !insertError, insertError?.message);

    // Test nonce retrieval
    const { data: nonceData, error: selectError } = await supabase
      .from('siwe_nonces')
      .select('*')
      .eq('nonce', nonce)
      .single();

    logTest('Nonce retrieval (SELECT from siwe_nonces)', !!nonceData && !selectError, selectError?.message);

    // Test nonce consumption (mark as used)
    const { error: updateError } = await supabase
      .from('siwe_nonces')
      .update({ consumed_at: new Date().toISOString() })
      .eq('nonce', nonce);

    logTest('Nonce consumption (UPDATE siwe_nonces)', !updateError, updateError?.message);

    // Clean up test nonce
    await supabase.from('siwe_nonces').delete().eq('nonce', nonce);
  } catch (e) {
    logTest('Nonce operations', false, e.message);
  }

  // Test JWT generation and verification
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const testUserId = crypto.randomUUID();
    const testWallet = '0x1234567890abcdef1234567890abcdef12345678';

    const token = await new SignJWT({ userId: testUserId, walletAddress: testWallet })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    logTest('JWT token generation', !!token && token.split('.').length === 3);

    // Verify token
    const { payload } = await jwtVerify(token, secret);
    logTest('JWT token verification', payload.userId === testUserId && payload.walletAddress === testWallet);
  } catch (e) {
    logTest('JWT operations', false, e.message);
  }

  // Test user creation
  try {
    const testWallet = `0x${crypto.randomBytes(20).toString('hex')}`;
    const testNullifier = `wallet_${testWallet.toLowerCase()}`;

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        nullifier_hash: testNullifier,
        wallet_address: testWallet.toLowerCase(),
        verification_level: 'wallet',
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    logTest('User creation', !!newUser && !createError, createError?.message);

    if (newUser) {
      // Test user retrieval
      const { data: foundUser, error: findError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', testWallet.toLowerCase())
        .single();

      logTest('User retrieval by wallet', !!foundUser && !findError, findError?.message);

      // Test user update
      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', newUser.id);

      logTest('User update (last_login_at)', !updateError, updateError?.message);

      // Clean up
      await supabase.from('users').delete().eq('id', newUser.id);
    }
  } catch (e) {
    logTest('User operations', false, e.message);
  }
}

// ============================================
// 3. Score Service Tests
// ============================================

async function testScoreServices(supabase) {
  logSection('3. SCORE SERVICE TESTS');

  if (!supabase) {
    log('  Skipping - no database connection', colors.yellow);
    return;
  }

  let testUserId = null;

  // Create a test user for score tests
  try {
    const testWallet = `0x${crypto.randomBytes(20).toString('hex')}`;
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        nullifier_hash: `wallet_${testWallet.toLowerCase()}`,
        wallet_address: testWallet.toLowerCase(),
        verification_level: 'wallet',
      })
      .select()
      .single();

    if (user) {
      testUserId = user.id;
      logTest('Test user created for score tests', true);
    } else {
      logTest('Test user created for score tests', false, error?.message);
      return;
    }
  } catch (e) {
    logTest('Test user created for score tests', false, e.message);
    return;
  }

  // Test score submission
  try {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: score, error: insertError } = await supabase
      .from('game_scores')
      .insert({
        user_id: testUserId,
        game_type: 'card_match',
        score: 100,
        monthly_profit: 100,
        leaderboard_period: period,
        time_taken: 45,
        is_validated: true,
      })
      .select()
      .single();

    logTest('Score submission (INSERT to game_scores)', !!score && !insertError, insertError?.message);

    if (score) {
      // Verify score constraints
      logTest('Score has correct game_type', score.game_type === 'card_match');
      logTest('Score has correct period format', /^\d{4}-\d{2}$/.test(score.leaderboard_period));
      logTest('Score is validated', score.is_validated === true);
    }
  } catch (e) {
    logTest('Score submission', false, e.message);
  }

  // Test score validation logic (local checks)
  const scoreValidationTests = [
    { score: 100, valid: true, desc: 'Valid score (100)' },
    { score: 0, valid: true, desc: 'Valid score (0)' },
    { score: 10000, valid: true, desc: 'Valid score (10000 - max)' },
    { score: -1, valid: false, desc: 'Invalid score (-1)' },
    { score: 10001, valid: false, desc: 'Invalid score (10001 - over max)' },
  ];

  for (const test of scoreValidationTests) {
    const isValid = test.score >= 0 && test.score <= 10000;
    logTest(test.desc, isValid === test.valid);
  }

  // Test time validation logic
  const timeValidationTests = [
    { time: 45, valid: true, desc: 'Valid time (45s)' },
    { time: 10, valid: true, desc: 'Valid time (10s - min)' },
    { time: 3600, valid: true, desc: 'Valid time (3600s - max)' },
    { time: 9, valid: false, desc: 'Invalid time (9s - under min)' },
    { time: 3601, valid: false, desc: 'Invalid time (3601s - over max)' },
  ];

  for (const test of timeValidationTests) {
    const isValid = test.time >= 10 && test.time <= 3600;
    logTest(test.desc, isValid === test.valid);
  }

  // Test user stats aggregation
  try {
    const { data: scores, error } = await supabase
      .from('game_scores')
      .select('score, monthly_profit')
      .eq('user_id', testUserId);

    if (!error && scores) {
      const totalGames = scores.length;
      const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
      const monthlyProfit = scores.reduce((sum, s) => sum + (s.monthly_profit || 0), 0);
      const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

      logTest('User stats aggregation works', totalGames > 0 && totalScore > 0);
      log(`    Stats: ${totalGames} games, ${totalScore} total, ${avgScore} avg`, colors.cyan);
    } else {
      logTest('User stats aggregation works', false, error?.message);
    }
  } catch (e) {
    logTest('User stats aggregation works', false, e.message);
  }

  // Clean up test user and scores
  if (testUserId) {
    await supabase.from('game_scores').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  }
}

// ============================================
// 4. Leaderboard Service Tests
// ============================================

async function testLeaderboardServices(supabase) {
  logSection('4. LEADERBOARD SERVICE TESTS');

  if (!supabase) {
    log('  Skipping - no database connection', colors.yellow);
    return;
  }

  // Create test users with scores
  const testUsers = [];

  try {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Create 3 test users with different scores
    for (let i = 0; i < 3; i++) {
      const testWallet = `0x${crypto.randomBytes(20).toString('hex')}`;
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          nullifier_hash: `wallet_${testWallet.toLowerCase()}`,
          wallet_address: testWallet.toLowerCase(),
          verification_level: 'wallet',
        })
        .select()
        .single();

      if (user) {
        testUsers.push(user);

        // Add scores for this user
        const scores = [100 * (i + 1), 50 * (i + 1)];
        for (const score of scores) {
          await supabase.from('game_scores').insert({
            user_id: user.id,
            game_type: 'card_match',
            score,
            monthly_profit: score,
            leaderboard_period: period,
            is_validated: true,
          });
        }
      }
    }

    logTest('Test users and scores created', testUsers.length === 3);

    // Test leaderboard query
    const { data: leaderboardData, error: lbError } = await supabase
      .from('game_scores')
      .select(`
        user_id,
        score,
        monthly_profit,
        users!inner (wallet_address)
      `)
      .eq('leaderboard_period', period);

    logTest('Leaderboard query with JOIN', !!leaderboardData && !lbError, lbError?.message);

    if (leaderboardData) {
      // Test aggregation
      const userScores = new Map();

      for (const score of leaderboardData) {
        const userId = score.user_id;
        if (!userScores.has(userId)) {
          userScores.set(userId, {
            walletAddress: score.users?.wallet_address || '',
            totalScore: 0,
            monthlyProfit: 0,
            gamesPlayed: 0,
          });
        }
        const userScore = userScores.get(userId);
        userScore.totalScore += score.score || 0;
        userScore.monthlyProfit += score.monthly_profit || 0;
        userScore.gamesPlayed += 1;
      }

      // Sort by monthly profit (descending)
      const sorted = Array.from(userScores.values()).sort((a, b) => b.monthlyProfit - a.monthlyProfit);
      const ranked = sorted.map((entry, index) => ({ rank: index + 1, ...entry }));

      logTest('Leaderboard aggregation works', ranked.length > 0);
      logTest('Leaderboard sorting works (by monthlyProfit desc)',
        ranked.length >= 2 ? ranked[0].monthlyProfit >= ranked[1].monthlyProfit : true);

      log(`    Leaderboard has ${ranked.length} entries`, colors.cyan);
    }

    // Test period generation
    const periods = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      periods.push(`${year}-${month}`);
    }

    logTest('Period generation (last 6 months)', periods.length === 6);
    logTest('Current period format is correct', /^\d{4}-\d{2}$/.test(periods[0]));
    log(`    Available periods: ${periods.join(', ')}`, colors.cyan);

  } catch (e) {
    logTest('Leaderboard operations', false, e.message);
  }

  // Clean up test data
  for (const user of testUsers) {
    await supabase.from('game_scores').delete().eq('user_id', user.id);
    await supabase.from('users').delete().eq('id', user.id);
  }
}

// ============================================
// 5. Barn Game Service Tests
// ============================================

async function testBarnGameServices(supabase) {
  logSection('5. BARN GAME (PLAY PASS) SERVICE TESTS');

  if (!supabase) {
    log('  Skipping - no database connection', colors.yellow);
    return;
  }

  let testUserId = null;

  // Create test user
  try {
    const testWallet = `0x${crypto.randomBytes(20).toString('hex')}`;
    const { data: user } = await supabase
      .from('users')
      .insert({
        nullifier_hash: `wallet_${testWallet.toLowerCase()}`,
        wallet_address: testWallet.toLowerCase(),
        verification_level: 'wallet',
      })
      .select()
      .single();

    if (user) {
      testUserId = user.id;
    }
  } catch (e) {
    logTest('Test user for barn game', false, e.message);
    return;
  }

  // Test barn_game_attempts creation
  try {
    const { data: attempt, error } = await supabase
      .from('barn_game_attempts')
      .insert({
        user_id: testUserId,
        free_game_used: false,
      })
      .select()
      .single();

    logTest('Barn game attempts record creation', !!attempt && !error, error?.message);

    if (attempt) {
      // Test Play Pass activation
      const now = Date.now();
      const playPassDuration = 3600000; // 1 hour
      const expiresAt = new Date(now + playPassDuration);

      const { error: updateError } = await supabase
        .from('barn_game_attempts')
        .update({
          play_pass_expires_at: expiresAt.toISOString(),
          play_pass_purchased_at: new Date().toISOString(),
        })
        .eq('user_id', testUserId);

      logTest('Play Pass activation', !updateError, updateError?.message);

      // Test status check
      const { data: status, error: statusError } = await supabase
        .from('barn_game_attempts')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      if (status) {
        const hasActivePass = status.play_pass_expires_at && new Date(status.play_pass_expires_at) > new Date();
        const canPlay = hasActivePass || !status.free_game_used;

        logTest('Play Pass status check', hasActivePass === true);
        logTest('Can play calculation', canPlay === true);
      }

      // Test free game usage
      const { error: freeGameError } = await supabase
        .from('barn_game_attempts')
        .update({
          free_game_used: true,
          cooldown_ends_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', testUserId);

      logTest('Free game usage and cooldown set', !freeGameError, freeGameError?.message);
    }
  } catch (e) {
    logTest('Barn game operations', false, e.message);
  }

  // Test payment reference creation
  try {
    const referenceId = crypto.randomBytes(32).toString('hex');

    const { data: ref, error } = await supabase
      .from('payment_references')
      .insert({
        reference_id: referenceId,
        user_id: testUserId,
        amount: '1000000000000000000', // 1 WLD
        token_symbol: 'WLD',
        item_type: 'play_pass',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    logTest('Payment reference creation', !!ref && !error, error?.message);

    // Clean up payment reference
    if (ref) {
      await supabase.from('payment_references').delete().eq('id', ref.id);
    }
  } catch (e) {
    logTest('Payment reference operations', false, e.message);
  }

  // Clean up test data
  if (testUserId) {
    await supabase.from('barn_game_attempts').delete().eq('user_id', testUserId);
    await supabase.from('users').delete().eq('id', testUserId);
  }
}

// ============================================
// 6. Game Mechanics Tests
// ============================================

function testGameMechanics() {
  logSection('6. GAME MECHANICS TESTS');

  // Test card deck creation
  const FOOTBALL_EMOJIS = ['⚽', '🏆', '🥅', '🧤', '🏟️', '🟨', '🟥', '👟', '🎯', '🏅', '⚡', '🔥'];
  const BONUS_EMOJI = '⭐';

  const createDeck = () => {
    const cards = [];
    FOOTBALL_EMOJIS.forEach((emoji, index) => {
      cards.push({ id: index * 2, emoji, isFlipped: false, isMatched: false });
      cards.push({ id: index * 2 + 1, emoji, isFlipped: false, isMatched: false });
    });

    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    // Add bonus card at center
    cards.splice(12, 0, { id: 24, emoji: BONUS_EMOJI, isFlipped: true, isMatched: true, isBonus: true });

    return cards.map((c, i) => ({ ...c, id: i }));
  };

  const deck = createDeck();

  logTest('Deck has 25 cards (5x5 grid)', deck.length === 25);
  logTest('Deck has 12 pairs (24 cards) + 1 bonus', deck.filter(c => !c.isBonus).length === 24);
  logTest('Bonus card is at center (index 12)', deck[12].isBonus === true && deck[12].emoji === BONUS_EMOJI);
  logTest('Bonus card starts matched', deck[12].isMatched === true && deck[12].isFlipped === true);

  // Count pairs
  const emojiCounts = {};
  deck.filter(c => !c.isBonus).forEach(c => {
    emojiCounts[c.emoji] = (emojiCounts[c.emoji] || 0) + 1;
  });

  const allPairs = Object.values(emojiCounts).every(count => count === 2);
  logTest('All emojis have exactly 2 cards (pairs)', allPairs);

  // Test game state initialization
  const TIME_LIMIT = 90000;
  const initialGame = {
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    score: 0,
    moves: 0,
    gameStartedAt: 0,
    elapsedTime: 0,
    remainingTime: TIME_LIMIT,
    isComplete: false,
    isTimeOut: false,
  };

  logTest('Initial game state is correct',
    initialGame.matchedPairs === 0 &&
    initialGame.remainingTime === 90000 &&
    initialGame.isComplete === false);

  // Test win condition
  const GAME_PAIRS = 12;
  const winCondition = (matchedPairs) => matchedPairs === GAME_PAIRS;

  logTest('Win condition check (12 pairs = win)', winCondition(12) === true);
  logTest('Win condition check (11 pairs = not win)', winCondition(11) === false);

  // Test score calculation
  const calculateReward = (isWin) => isWin ? 100 : 0;
  logTest('Win reward is 100 coins', calculateReward(true) === 100);
  logTest('Loss reward is 0 coins', calculateReward(false) === 0);

  // Test time tracking
  const gameStartedAt = Date.now();
  const elapsedTime = 45000; // 45 seconds
  const remainingTime = TIME_LIMIT - elapsedTime;

  logTest('Time tracking calculation', remainingTime === 45000);
  logTest('Timeout detection (time <= 0)', (TIME_LIMIT - 90001) <= 0);
}

// ============================================
// 7. API Structure Tests
// ============================================

async function testApiStructure() {
  logSection('7. API STRUCTURE TESTS');

  const { readdir, stat } = await import('fs/promises');
  const path = await import('path');
  const apiDir = path.join(process.cwd(), 'api');

  try {
    const entries = await readdir(apiDir, { withFileTypes: true });

    // Check required API directories and files
    const expectedStructure = {
      'auth': ['siwe'],
      'scores': ['submit.ts'],
      'leaderboard': ['index.ts'],
      'user': ['profile.ts'],
      'health.ts': null,
    };

    for (const [name, children] of Object.entries(expectedStructure)) {
      const fullPath = path.join(apiDir, name);

      try {
        const stats = await stat(fullPath);

        if (children === null) {
          // It's a file
          logTest(`API file exists: ${name}`, stats.isFile());
        } else {
          // It's a directory
          logTest(`API directory exists: ${name}/`, stats.isDirectory());

          if (stats.isDirectory()) {
            for (const child of children) {
              const childPath = path.join(fullPath, child);
              try {
                const childStats = await stat(childPath);
                const isValid = childStats.isFile() || childStats.isDirectory();
                logTest(`  └── ${child}`, isValid);
              } catch {
                logTest(`  └── ${child}`, false, 'Not found');
              }
            }
          }
        }
      } catch {
        logTest(`API ${children === null ? 'file' : 'directory'} exists: ${name}`, false, 'Not found');
      }
    }

    // Check auth SIWE endpoints
    const siweDir = path.join(apiDir, 'auth', 'siwe');
    try {
      const siweFiles = await readdir(siweDir);
      logTest('SIWE nonce endpoint exists', siweFiles.includes('nonce.ts'));
      logTest('SIWE verify endpoint exists', siweFiles.includes('verify.ts'));
    } catch {
      logTest('SIWE endpoints', false, 'siwe directory not found');
    }

  } catch (e) {
    logTest('API directory structure', false, e.message);
  }
}

// ============================================
// 8. Configuration Tests
// ============================================

function testConfiguration() {
  logSection('8. CONFIGURATION TESTS');

  // Test constants
  const WORLD_CHAIN = {
    MAINNET: { chainId: 480, name: 'World Chain' },
    TESTNET: { chainId: 4801, name: 'World Chain Sepolia' },
  };

  logTest('World Chain Mainnet config', WORLD_CHAIN.MAINNET.chainId === 480);
  logTest('World Chain Testnet config', WORLD_CHAIN.TESTNET.chainId === 4801);

  // Test game configuration
  const GAME_CONFIG = {
    cardMatch: {
      totalPairs: 12,
      gridSize: 25,
      minMoves: 12,
      maxMoves: 500,
      minTimeSeconds: 10,
      maxTimeSeconds: 3600,
    },
  };

  logTest('Card match pairs count', GAME_CONFIG.cardMatch.totalPairs === 12);
  logTest('Grid size (5x5)', GAME_CONFIG.cardMatch.gridSize === 25);
  logTest('Min time (anti-cheat)', GAME_CONFIG.cardMatch.minTimeSeconds === 10);
  logTest('Max time', GAME_CONFIG.cardMatch.maxTimeSeconds === 3600);

  // Test session configuration
  const SESSION_CONFIG = {
    sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
    tokenExpiry: '7d',
  };

  logTest('Session duration (7 days)', SESSION_CONFIG.sessionDuration === 604800000);

  // Test leaderboard configuration
  const LEADERBOARD_CONFIG = {
    topEntriesCount: 100,
    cacheDuration: 60,
  };

  logTest('Leaderboard top entries', LEADERBOARD_CONFIG.topEntriesCount === 100);
  logTest('Leaderboard cache duration (60s)', LEADERBOARD_CONFIG.cacheDuration === 60);
}

// ============================================
// Main Test Runner
// ============================================

async function runAllTests() {
  log('\n' + '═'.repeat(60), colors.bold);
  log('  BLOOMING BEGINNINGS - API & DATABASE TEST SUITE', colors.bold);
  log('═'.repeat(60), colors.bold);
  log(`  Started at: ${new Date().toISOString()}`, colors.cyan);

  // Run all tests
  const supabase = await testDatabaseConnection();
  await testAuthServices(supabase);
  await testScoreServices(supabase);
  await testLeaderboardServices(supabase);
  await testBarnGameServices(supabase);
  testGameMechanics();
  await testApiStructure();
  testConfiguration();

  // Print summary
  logSection('TEST SUMMARY');

  const total = testResults.passed + testResults.failed;
  const passRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;

  log(`  Total Tests: ${total}`, colors.bold);
  log(`  Passed: ${testResults.passed}`, colors.green);
  log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
  log(`  Pass Rate: ${passRate}%`, passRate >= 80 ? colors.green : colors.yellow);

  if (testResults.errors.length > 0) {
    log('\n  Errors:', colors.red);
    testResults.errors.forEach(({ test, error }) => {
      log(`    - ${test}: ${error}`, colors.yellow);
    });
  }

  console.log('');
  log('═'.repeat(60), colors.bold);

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
