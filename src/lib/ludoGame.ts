// Ludo Game Engine

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type PlayerType = 'human' | 'cpu' | 'empty';

export interface Token {
  id: number;
  color: PlayerColor;
  position: number; // -1 = home, 0-51 = board, 52-56 = final stretch, 57 = goal
  isHome: boolean;
  isGoal: boolean;
  globalPosition: number; // absolute position on the board for rendering
}

export interface Player {
  color: PlayerColor;
  type: PlayerType;
  tokens: Token[];
  startPosition: number;
  name: string;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  consecutiveSixes: number;
  selectedTokenId: number | null;
  phase: 'setup' | 'rolling' | 'selecting' | 'moving' | 'finished';
  winner: PlayerColor | null;
  message: string;
  lastMovedTokenId: number | null;
  extraTurn: boolean;
}

// Board layout constants
// Each player starts at a different position on the 52-cell track
export const PLAYER_START: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  yellow: 26,
  green: 39,
};

// Entry to final stretch (the cell before entering the home column)
export const PLAYER_FINAL_ENTRY: Record<PlayerColor, number> = {
  red: 50,
  blue: 11,
  yellow: 24,
  green: 37,
};

// Safe cells (can't be killed here)
export const SAFE_CELLS = [0, 5, 8, 13, 18, 21, 26, 31, 34, 39, 44, 47];

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

export function createInitialState(playerConfigs: { color: PlayerColor; type: PlayerType }[]): GameState {
  const players: Player[] = playerConfigs
    .filter(c => c.type !== 'empty')
    .map(config => ({
      color: config.color,
      type: config.type,
      name: config.color.charAt(0).toUpperCase() + config.color.slice(1),
      startPosition: PLAYER_START[config.color],
      tokens: Array.from({ length: 4 }, (_, i) => ({
        id: i,
        color: config.color,
        position: -1,
        isHome: true,
        isGoal: false,
        globalPosition: -1,
      })),
    }));

  return {
    players,
    currentPlayerIndex: 0,
    diceValue: null,
    isRolling: false,
    consecutiveSixes: 0,
    selectedTokenId: null,
    phase: 'rolling',
    winner: null,
    message: `${players[0]?.name}'s turn. Roll the dice!`,
    lastMovedTokenId: null,
    extraTurn: false,
  };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Convert a player's relative position to global board position
export function toGlobalPosition(relativePos: number, color: PlayerColor): number {
  if (relativePos < 0 || relativePos > 51) return -1;
  return (relativePos + PLAYER_START[color]) % 52;
}

// Convert global position back to player's relative position
export function toRelativePosition(globalPos: number, color: PlayerColor): number {
  return (globalPos - PLAYER_START[color] + 52) % 52;
}

export function getMovableTokens(player: Player, dice: number, state: GameState): number[] {
  const movable: number[] = [];

  for (const token of player.tokens) {
    if (token.isGoal) continue;

    if (token.isHome) {
      // Need a 5 to leave home (from the original rules)
      if (dice === 5) {
        // Check if start cell is not blocked by own wall
        const startGlobal = PLAYER_START[player.color];
        const ownAtStart = player.tokens.filter(t => !t.isHome && !t.isGoal && toGlobalPosition(t.position, player.color) === startGlobal);
        if (ownAtStart.length < 2) {
          movable.push(token.id);
        }
      }
      continue;
    }

    // Token is on board
    const relPos = token.position;
    const newRelPos = relPos + dice;

    // Check if entering final stretch
    const maxPos = 57; // goal
    if (newRelPos > maxPos) continue; // Can't overshoot goal

    // Check for walls (2 same-color tokens) blocking the path
    if (!isPathBlocked(player, token, dice, state)) {
      movable.push(token.id);
    }
  }

  return movable;
}

function isPathBlocked(player: Player, token: Token, dice: number, state: GameState): boolean {
  const color = player.color;
  const startRel = token.position;

  for (let step = 1; step <= dice; step++) {
    const checkRel = startRel + step;

    // If in final stretch (52-57), no blocking from other players
    if (checkRel >= 52) continue;

    const checkGlobal = toGlobalPosition(checkRel, color);

    // Check all other players for walls at this position
    for (const otherPlayer of state.players) {
      if (otherPlayer.color === color) continue;
      const tokensAtPos = otherPlayer.tokens.filter(t =>
        !t.isHome && !t.isGoal && toGlobalPosition(t.position, otherPlayer.color) === checkGlobal
      );
      if (tokensAtPos.length >= 2) return true; // Wall found
    }
  }

  return false;
}

export function moveToken(state: GameState, tokenId: number): GameState {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players[newState.currentPlayerIndex];
  const token = player.tokens.find(t => t.id === tokenId)!;
  const dice = newState.diceValue!;

  let message = '';
  let extraTurn = false;
  let advanceBonus = 0;

  if (token.isHome) {
    // Move out of home to start position
    token.isHome = false;
    token.position = 0;
    token.globalPosition = PLAYER_START[player.color];
    message = `${player.name} moved a token out!`;

    // Check for kill at start
    const killResult = checkKill(newState, player, token);
    if (killResult) {
      message += ` ${killResult}`;
      advanceBonus = 20;
    }
  } else {
    const newRelPos = token.position + dice;

    if (newRelPos === 57) {
      // Reached goal!
      token.position = 57;
      token.isGoal = true;
      token.globalPosition = -1;
      message = `${player.name} reached the goal! 🎉`;
      advanceBonus = 10;

      // Check if all tokens are at goal
      if (player.tokens.every(t => t.isGoal)) {
        newState.winner = player.color;
        newState.phase = 'finished';
        message = `🏆 ${player.name} wins the game!`;
        return newState;
      }
    } else if (newRelPos >= 52) {
      // In final stretch
      token.position = newRelPos;
      token.globalPosition = -1; // Special rendering for final stretch
      message = `${player.name} advances in the home column!`;
    } else {
      token.position = newRelPos;
      token.globalPosition = toGlobalPosition(newRelPos, player.color);

      // Check for kill
      const killResult = checkKill(newState, player, token);
      if (killResult) {
        message = killResult;
        advanceBonus = 20;
      } else {
        message = `${player.name} moved forward ${dice} spaces.`;
      }
    }
  }

  newState.lastMovedTokenId = tokenId;

  // Handle bonus advance (kill = 20, goal = 10)
  if (advanceBonus > 0 && !newState.winner) {
    // Find another token to advance (simplified: auto-advance first available)
    const bonusToken = player.tokens.find(t => !t.isGoal && !t.isHome && t.id !== tokenId);
    if (bonusToken) {
      const bonusNewPos = Math.min(bonusToken.position + advanceBonus, 57);
      if (bonusNewPos === 57) {
        bonusToken.isGoal = true;
        bonusToken.globalPosition = -1;
      } else {
        bonusToken.position = bonusNewPos;
        if (bonusNewPos < 52) {
          bonusToken.globalPosition = toGlobalPosition(bonusNewPos, player.color);
        }
      }
      message += ` Bonus: advanced ${advanceBonus} cells!`;
    }
  }

  // Check for three consecutive sixes
  if (dice === 6) {
    newState.consecutiveSixes++;
    if (newState.consecutiveSixes >= 3) {
      // Send last moved token home
      const lastToken = player.tokens.find(t => t.id === newState.lastMovedTokenId);
      if (lastToken && !lastToken.isGoal) {
        lastToken.isHome = true;
        lastToken.position = -1;
        lastToken.globalPosition = -1;
        message = `Three 6s in a row! ${player.name} loses last moved token!`;
      }
      newState.consecutiveSixes = 0;
      extraTurn = false;
    } else {
      // If all tokens are out, advance 7 instead of 6
      extraTurn = true;
      message += ' Extra turn!';
    }
  } else {
    newState.consecutiveSixes = 0;
  }

  // Must break walls on 6
  if (dice === 6) {
    const walls = findWalls(player);
    if (walls.length > 0 && !token.isHome) {
      // Wall breaking is handled by forcing selection
    }
  }

  if (extraTurn) {
    newState.phase = 'rolling';
    newState.diceValue = null;
    newState.extraTurn = true;
    message += ` ${player.name} rolls again!`;
  } else {
    // Next player
    newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
    newState.consecutiveSixes = 0;
    newState.phase = 'rolling';
    newState.diceValue = null;
    newState.extraTurn = false;
    const nextPlayer = newState.players[newState.currentPlayerIndex];
    message += ` ${nextPlayer.name}'s turn.`;
  }

  newState.message = message;
  newState.selectedTokenId = null;

  return newState;
}

function checkKill(state: GameState, player: Player, token: Token): string | null {
  const globalPos = toGlobalPosition(token.position, player.color);

  // Can't kill on safe cells
  if (SAFE_CELLS.includes(globalPos)) return null;

  for (const otherPlayer of state.players) {
    if (otherPlayer.color === player.color) continue;

    const victimTokens = otherPlayer.tokens.filter(t =>
      !t.isHome && !t.isGoal && toGlobalPosition(t.position, otherPlayer.color) === globalPos
    );

    if (victimTokens.length === 1) {
      // Kill the token
      const victim = victimTokens[0];
      victim.isHome = true;
      victim.position = -1;
      victim.globalPosition = -1;
      return `${player.name} killed ${otherPlayer.name}'s token! 💀`;
    }
  }

  return null;
}

function findWalls(player: Player): number[][] {
  const posMap = new Map<number, Token[]>();
  for (const token of player.tokens) {
    if (!token.isHome && !token.isGoal && token.position < 52) {
      const gp = toGlobalPosition(token.position, player.color);
      if (!posMap.has(gp)) posMap.set(gp, []);
      posMap.get(gp)!.push(token);
    }
  }
  return Array.from(posMap.entries())
    .filter(([_, tokens]) => tokens.length >= 2)
    .map(([pos, tokens]) => tokens.map(t => t.id));
}

// CPU AI: simple strategy
export function cpuSelectToken(state: GameState): number {
  const player = state.players[state.currentPlayerIndex];
  const movable = getMovableTokens(player, state.diceValue!, state);
  if (movable.length === 0) return -1;

  // Priority: kill > advance furthest > leave home
  let bestId = movable[0];
  let bestScore = -Infinity;

  for (const tid of movable) {
    const token = player.tokens.find(t => t.id === tid)!;
    let score = 0;

    if (token.isHome) {
      score = 10; // Getting out is good
    } else {
      const newRelPos = token.position + state.diceValue!;
      if (newRelPos === 57) {
        score = 100; // Reaching goal is best
      } else if (newRelPos >= 52) {
        score = 50 + newRelPos; // Close to goal
      } else {
        // Check if can kill
        const newGlobal = toGlobalPosition(newRelPos, player.color);
        for (const other of state.players) {
          if (other.color === player.color) continue;
          const targets = other.tokens.filter(t =>
            !t.isHome && !t.isGoal && toGlobalPosition(t.position, other.color) === newGlobal
          );
          if (targets.length === 1 && !SAFE_CELLS.includes(newGlobal)) {
            score = 80; // Kill opportunity
          }
        }
        if (score === 0) {
          score = newRelPos; // Prefer furthest along
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = tid;
    }
  }

  return bestId;
}
