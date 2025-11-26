import React, { useState, useEffect, useCallback } from 'react';
import { Player, PlayerLevel, Court, Match, Team, Gender } from './types';
import { DEFAULT_COURT_COUNT, PLACEHOLDER_PLAYER, isPlaceholder, GENDER_COLORS } from './constants';
import { PlayerList } from './components/PlayerList';
import { CourtDisplay } from './components/CourtDisplay';
import { Button } from './components/Button';
import { PlayerSelectModal } from './components/PlayerSelectModal';
import { Users, LayoutGrid, RotateCcw, ListOrdered, CalendarClock, Trophy, Maximize2, Minimize2, RotateCw, Plus, Sparkles } from 'lucide-react';

// History limit for fairness calculations
const HISTORY_SIZE_LIMIT = 20;

const App: React.FC = () => {
  // -- State --
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matchQueue, setMatchQueue] = useState<Match[]>([]);
  const [matchHistory, setMatchHistory] = useState<string[]>([]); // Array of match signature strings
  const [view, setView] = useState<'dashboard' | 'players'>('dashboard');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Queue Drag State
  const [queueDragOver, setQueueDragOver] = useState<{matchId: string, slotIndex: number} | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [substitutionTarget, setSubstitutionTarget] = useState<{
    type: 'court' | 'queue';
    id: number | string;
    playerId: string;
  } | null>(null);

  // -- Initialization --
  useEffect(() => {
    const initialCourts = Array.from({ length: DEFAULT_COURT_COUNT }, (_, i) => ({
      id: i + 1,
      name: `場地 ${i + 1}`,
      currentMatch: null,
    }));
    setCourts(initialCourts);

    // Initial players with gender
    setPlayers([
      { id: '1', name: '瑞育', level: '14', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '2', name: 'Kiki', level: '8', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '3', name: '傑克', level: '8', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '4', name: '大衛', level: '3', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '5', name: '依依', level: '13', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '6', name: '凱文', level: '18', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '7', name: '麥可', level: '2', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '8', name: '莎拉', level: '9', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '9', name: '湯姆', level: '15', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '10', name: '艾美', level: '7', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '11', name: '雷歐', level: '17', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '12', name: '妮娜', level: '1', gender: 'female', gamesPlayed: 0, isPaused: false },
      { id: '13', name: '志豪', level: '12', gender: 'male', gamesPlayed: 0, isPaused: false },
      { id: '14', name: '美玲', level: '6', gender: 'female', gamesPlayed: 0, isPaused: false },
    ]);
  }, []);

  // -- Helper: Get numeric level score --
  const getLevelScore = useCallback((level: string | PlayerLevel) => {
    const num = parseInt(level as string);
    if (!isNaN(num)) return num;
    if (level === PlayerLevel.PRO) return 18;
    if (level === PlayerLevel.ADVANCED) return 14;
    if (level === PlayerLevel.INTERMEDIATE) return 8;
    if (level === PlayerLevel.BEGINNER) return 3;
    return 1;
  }, []);

  // -- Fairness Engine --
  const getProjectedState = useCallback(() => {
    const projectedCounts: Record<string, number> = {};
    const projectedLastMatchTime: Record<string, number> = {};
    
    // Initialize with current actual state
    players.forEach(p => {
      projectedCounts[p.id] = p.gamesPlayed;
      projectedLastMatchTime[p.id] = p.lastMatchTime || 0;
    });

    // Add Active Matches
    courts.forEach(c => {
      if (c.currentMatch) {
        [c.currentMatch.teamA.player1, c.currentMatch.teamA.player2, 
         c.currentMatch.teamB.player1, c.currentMatch.teamB.player2].forEach(p => {
           if (isPlaceholder(p)) return;
           projectedCounts[p.id] = (projectedCounts[p.id] || 0) + 1;
         });
      }
    });

    // Add Queued Matches (simulated sequential execution)
    matchQueue.forEach((m, index) => {
       const simulatedTime = Date.now() + (index + 1) * 1000000; 
       [m.teamA.player1, m.teamA.player2, m.teamB.player1, m.teamB.player2].forEach(p => {
         if (isPlaceholder(p)) return;
         projectedCounts[p.id] = (projectedCounts[p.id] || 0) + 1;
         projectedLastMatchTime[p.id] = simulatedTime;
       });
    });

    return { projectedCounts, projectedLastMatchTime };
  }, [players, courts, matchQueue]);

  // -- Helper to get Best Candidates --
  const getBestCandidates = useCallback(() => {
      const activePlayerIds = new Set<string>();
      courts.forEach(c => {
        if (c.currentMatch) {
          activePlayerIds.add(c.currentMatch.teamA.player1.id);
          activePlayerIds.add(c.currentMatch.teamA.player2.id);
          activePlayerIds.add(c.currentMatch.teamB.player1.id);
          activePlayerIds.add(c.currentMatch.teamB.player2.id);
        }
      });
      matchQueue.forEach(m => {
        activePlayerIds.add(m.teamA.player1.id);
        activePlayerIds.add(m.teamA.player2.id);
        activePlayerIds.add(m.teamB.player1.id);
        activePlayerIds.add(m.teamB.player2.id);
      });

      const { projectedCounts, projectedLastMatchTime } = getProjectedState();
      const availableCandidates = players.filter(p => !p.isPaused && !activePlayerIds.has(p.id) && !isPlaceholder(p));

      return availableCandidates.sort((a, b) => {
        const countA = projectedCounts[a.id] || 0;
        const countB = projectedCounts[b.id] || 0;
        if (countA !== countB) return countA - countB;
        
        const timeA = projectedLastMatchTime[a.id] || 0;
        const timeB = projectedLastMatchTime[b.id] || 0;
        return timeA - timeB; 
      });
  }, [players, courts, matchQueue, getProjectedState]);

  // -- Auto Fill Handlers --
  const handleAutoFillSlot = (matchId: string, slotIndex: number) => {
      const candidates = getBestCandidates();
      if (candidates.length === 0) {
          alert("目前沒有可用球員");
          return;
      }
      const bestPlayer = candidates[0];
      executeMoveOrSwap(bestPlayer, 'queue', matchId, slotIndex);
  };

  const handleAutoFillMatch = (matchId: string) => {
      const candidates = getBestCandidates();
      const match = matchQueue.find(m => m.id === matchId);
      if (!match) return;

      const slots = [
          match.teamA.player1, match.teamA.player2,
          match.teamB.player1, match.teamB.player2
      ];
      const emptySlotIndices = slots.map((p, i) => isPlaceholder(p) ? i : -1).filter(i => i !== -1);

      if (emptySlotIndices.length === 0) return;
      
      if (candidates.length === 0) {
          alert("目前沒有可用球員");
          return;
      }

      setMatchQueue(prev => prev.map(m => {
          if (m.id === matchId) {
              let updatedM = { ...m, teamA: { ...m.teamA }, teamB: { ...m.teamB } };
              const updateSlot = (currentM: Match, slot: number, p: Player) => {
                  const newM = { ...currentM, teamA: { ...currentM.teamA }, teamB: { ...currentM.teamB } };
                  if (slot === 0) newM.teamA.player1 = p;
                  else if (slot === 1) newM.teamA.player2 = p;
                  else if (slot === 2) newM.teamB.player1 = p;
                  else if (slot === 3) newM.teamB.player2 = p;
                  return newM;
              };

              let candidateIdx = 0;
              emptySlotIndices.forEach(slotIdx => {
                  if (candidateIdx < candidates.length) {
                      updatedM = updateSlot(updatedM, slotIdx, candidates[candidateIdx]);
                      candidateIdx++;
                  }
              });
              return updatedM;
          }
          return m;
      }));
  };

  // -- Queue Generation Effect --
  // This effect automatically replenishes the queue when players are available or matches are played.
  useEffect(() => {
    if (players.length < 4) return;
    
    // If all courts are busy, we need less buffer (4).
    // If any court is free, we want more buffer (6) to encourage filling the court.
    const areAllCourtsBusy = courts.every(c => c.currentMatch);
    const targetQueueSize = areAllCourtsBusy ? 4 : 6;

    // Check if we need to generate more matches (either append or fill empty spots)
    // OR if we have empty placeholder matches that can be filled now
    
    // Helper to check if a match is purely placeholders (Draft Match)
    const isDraftMatch = (m: Match) => 
        [m.teamA.player1, m.teamA.player2, m.teamB.player1, m.teamB.player2].every(isPlaceholder);

    // Find the index of the first draft match to replace
    const firstDraftIndex = matchQueue.findIndex(isDraftMatch);
    
    // Need generation if queue is too small OR if we have a draft match we might be able to fill
    const needGeneration = matchQueue.length < targetQueueSize || firstDraftIndex !== -1;

    if (needGeneration) {
      const sortedCandidates = getBestCandidates();

      // Strategy: 
      // 1. Try to form a valid match if candidates >= 4
      // 2. If formed, fill the first draft slot OR append
      // 3. If not, fill queue with draft matches until target size
      
      if (sortedCandidates.length >= 4) {
          const selectedPlayers = sortedCandidates.slice(0, 4);
          // --- Pairing Logic ---
          const combinations = [
            [[0, 1], [2, 3]],
            [[0, 2], [1, 3]],
            [[0, 3], [1, 2]]
          ];
          let bestComboIndex = 0;
          let minPenalty = Infinity;
          combinations.forEach((combo, index) => {
            const t1p1 = selectedPlayers[combo[0][0]];
            const t1p2 = selectedPlayers[combo[0][1]];
            const t2p1 = selectedPlayers[combo[1][0]];
            const t2p2 = selectedPlayers[combo[1][1]];
            const t1Level = getLevelScore(t1p1.level) + getLevelScore(t1p2.level);
            const t2Level = getLevelScore(t2p1.level) + getLevelScore(t2p2.level);
            const levelDiff = Math.abs(t1Level - t2Level);
            const pair1Sig = [t1p1.id, t1p2.id].sort().join('-');
            const pair2Sig = [t2p1.id, t2p2.id].sort().join('-');
            let repetitionPenalty = 0;
            const recentHistory = matchHistory.slice(-10);
            if (recentHistory.some(h => h.includes(`|${pair1Sig}|`) || h.includes(`|${pair2Sig}|`))) {
              repetitionPenalty += 50; 
            }
            const totalPenalty = (levelDiff * 2) + repetitionPenalty + (Math.random() * 5);
            if (totalPenalty < minPenalty) {
              minPenalty = totalPenalty;
              bestComboIndex = index;
            }
          });
          const finalCombo = combinations[bestComboIndex];
          const newMatch: Match = {
            id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            courtId: 0, 
            teamA: { player1: selectedPlayers[finalCombo[0][0]], player2: selectedPlayers[finalCombo[0][1]] },
            teamB: { player1: selectedPlayers[finalCombo[1][0]], player2: selectedPlayers[finalCombo[1][1]] },
            startTime: 0 
          };
          
          setMatchQueue(prev => {
              // If there's a draft match, replace the first one
              const draftIdx = prev.findIndex(isDraftMatch);
              if (draftIdx !== -1) {
                  const newQ = [...prev];
                  newQ[draftIdx] = newMatch;
                  return newQ;
              }
              // Otherwise append if under limit
              if (prev.length < targetQueueSize) {
                  return [...prev, newMatch];
              }
              return prev;
          });
      } else if (matchQueue.length < targetQueueSize) {
          // Not enough players, fill with draft match to reach target size
          const createPlaceholder = () => ({ ...PLACEHOLDER_PLAYER, id: `placeholder-${Date.now()}-${Math.random()}` });
          const draftMatch: Match = {
            id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            courtId: 0,
            teamA: { player1: createPlaceholder(), player2: createPlaceholder() },
            teamB: { player1: createPlaceholder(), player2: createPlaceholder() },
            startTime: 0
          };
          setMatchQueue(prev => [...prev, draftMatch]);
      }
    }
  }, [matchQueue, players, courts, matchHistory, getBestCandidates, getLevelScore]);

  // ... (Simple handlers)
  const handleAddPlayer = (name: string, level: PlayerLevel, gender: Gender = 'male') => {
    setPlayers(prev => [...prev, { id: Date.now().toString(), name, level, gender, gamesPlayed: 0, isPaused: false }]);
  };
  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setMatchQueue(prev => prev.filter(m => 
      m.teamA.player1.id !== id && m.teamA.player2.id !== id && m.teamB.player1.id !== id && m.teamB.player2.id !== id
    ));
  };
  const handleTogglePause = (id: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, isPaused: !p.isPaused } : p));
  };
  const assignMatchToCourt = (courtId: number) => {
    if (matchQueue.length === 0) return;
    // Find the first valid (non-placeholder) match if possible, otherwise first match
    // Actually, users might drag a placeholder match to court, so just take index 0.
    // But wait, if index 0 is a draft and index 1 is ready, maybe prioritize ready?
    // For simplicity, strict FIFO is usually better UI, but let's stick to index 0.
    
    const matchToPlay = matchQueue[0];
    
    // Check if matchToPlay is empty/placeholder? If so, maybe alert? 
    // Nah, let them assign it and then fill it on court.
    
    const remainingQueue = matchQueue.slice(1);
    
    // Only update history/stats if it's a real match
    if (![matchToPlay.teamA.player1, matchToPlay.teamA.player2, matchToPlay.teamB.player1, matchToPlay.teamB.player2].some(isPlaceholder)) {
        const pairA = [matchToPlay.teamA.player1.id, matchToPlay.teamA.player2.id].sort().join('-');
        const pairB = [matchToPlay.teamB.player1.id, matchToPlay.teamB.player2.id].sort().join('-');
        const signature = `|${pairA}|vs|${pairB}|`;
        setMatchHistory(prev => [...prev, signature].slice(-HISTORY_SIZE_LIMIT));
    }
    
    const activeMatch: Match = { ...matchToPlay, courtId, startTime: Date.now() };
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, currentMatch: activeMatch } : c));
    setMatchQueue(remainingQueue);
  };
  const finishMatch = (courtId: number) => {
    setCourts(prev => prev.map(c => {
        if (c.id === courtId && c.currentMatch) {
            const participants = [
                c.currentMatch.teamA.player1.id, c.currentMatch.teamA.player2.id,
                c.currentMatch.teamB.player1.id, c.currentMatch.teamB.player2.id
            ];
            const now = Date.now();
            setPlayers(currentPlayers => currentPlayers.map(p => 
                participants.includes(p.id) && !isPlaceholder(p)
                ? { ...p, gamesPlayed: p.gamesPlayed + 1, lastMatchTime: now } : p
            ));
            return { ...c, currentMatch: null };
        }
        return c;
    }));
  };
  const clearCourt = (courtId: number) => {
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, currentMatch: null } : c));
  };
  const resetAllStats = () => {
    if(!window.confirm("確定要重置所有場數紀錄與排程嗎？")) return;
    setPlayers(prev => prev.map(p => ({...p, gamesPlayed: 0, lastMatchTime: 0})));
    setCourts(prev => prev.map(c => ({...c, currentMatch: null})));
    setMatchQueue([]);
    setMatchHistory([]);
  };

  // -- Location Helpers --
  const getPlayerLocation = (playerId: string): string | null => {
    const court = courts.find(c => c.currentMatch && [
        c.currentMatch.teamA.player1.id, c.currentMatch.teamA.player2.id,
        c.currentMatch.teamB.player1.id, c.currentMatch.teamB.player2.id
    ].includes(playerId));
    if (court) return court.name;

    const matchIndex = matchQueue.findIndex(m => [
        m.teamA.player1.id, m.teamA.player2.id,
        m.teamB.player1.id, m.teamB.player2.id
    ].includes(playerId));
    if (matchIndex !== -1) return `待賽 ${matchIndex + 1}`;

    return null;
  };

  const findPlayerPosition = (playerId: string) => {
      // Check Courts
      for (const c of courts) {
          if (!c.currentMatch) continue;
          const m = c.currentMatch;
          if (m.teamA.player1.id === playerId) return { type: 'court' as const, id: c.id, slot: 0 };
          if (m.teamA.player2.id === playerId) return { type: 'court' as const, id: c.id, slot: 1 };
          if (m.teamB.player1.id === playerId) return { type: 'court' as const, id: c.id, slot: 2 };
          if (m.teamB.player2.id === playerId) return { type: 'court' as const, id: c.id, slot: 3 };
      }
      // Check Queue
      for (let i = 0; i < matchQueue.length; i++) {
          const m = matchQueue[i];
          if (m.teamA.player1.id === playerId) return { type: 'queue' as const, id: m.id, slot: 0 };
          if (m.teamA.player2.id === playerId) return { type: 'queue' as const, id: m.id, slot: 1 };
          if (m.teamB.player1.id === playerId) return { type: 'queue' as const, id: m.id, slot: 2 };
          if (m.teamB.player2.id === playerId) return { type: 'queue' as const, id: m.id, slot: 3 };
      }
      return null; // Bench
  };

  // -- Unified Move/Swap Logic --
  const executeMoveOrSwap = (
      sourcePlayer: Player, 
      targetType: 'court' | 'queue', 
      targetId: string | number, 
      targetSlotIndex: number
  ) => {
      const createPlaceholder = () => ({ ...PLACEHOLDER_PLAYER, id: `placeholder-${Date.now()}-${Math.random()}` });
      
      const sourcePos = findPlayerPosition(sourcePlayer.id);
      
      let targetPlayer: Player = createPlaceholder(); // Default if empty
      
      if (targetType === 'court') {
          const court = courts.find(c => c.id === targetId);
          if (court && court.currentMatch) {
              if (targetSlotIndex === 0) targetPlayer = court.currentMatch.teamA.player1;
              else if (targetSlotIndex === 1) targetPlayer = court.currentMatch.teamA.player2;
              else if (targetSlotIndex === 2) targetPlayer = court.currentMatch.teamB.player1;
              else if (targetSlotIndex === 3) targetPlayer = court.currentMatch.teamB.player2;
          }
      } else {
          const match = matchQueue.find(m => m.id === targetId);
          if (match) {
              if (targetSlotIndex === 0) targetPlayer = match.teamA.player1;
              else if (targetSlotIndex === 1) targetPlayer = match.teamA.player2;
              else if (targetSlotIndex === 2) targetPlayer = match.teamB.player1;
              else if (targetSlotIndex === 3) targetPlayer = match.teamB.player2;
          }
      }

      // Helper to update a match
      const updateMatchSlot = (m: Match, slot: number, p: Player): Match => {
          const newM = { ...m, teamA: { ...m.teamA }, teamB: { ...m.teamB } };
          if (slot === 0) newM.teamA.player1 = p;
          else if (slot === 1) newM.teamA.player2 = p;
          else if (slot === 2) newM.teamB.player1 = p;
          else if (slot === 3) newM.teamB.player2 = p;
          return newM;
      };

      // 1. Update Courts
      setCourts(prev => prev.map(c => {
          let updatedC = { ...c };
          
          // If this court is the TARGET
          if (targetType === 'court' && c.id === targetId) {
              if (!c.currentMatch) {
                  // Create match if empty
                  const phs = [createPlaceholder(), createPlaceholder(), createPlaceholder(), createPlaceholder()];
                  updatedC.currentMatch = {
                      id: `manual-${Date.now()}`, courtId: c.id, startTime: Date.now(),
                      teamA: { player1: phs[0], player2: phs[1] }, teamB: { player1: phs[2], player2: phs[3] }
                  };
              }
              updatedC.currentMatch = updateMatchSlot(updatedC.currentMatch!, targetSlotIndex, sourcePlayer);
          }

          // If this court is the SOURCE (Swap logic: put Target Player here)
          if (sourcePos?.type === 'court' && c.id === sourcePos.id) {
              if (c.currentMatch) {
                  updatedC.currentMatch = updateMatchSlot(updatedC.currentMatch, sourcePos.slot, targetPlayer);
              }
          }
          return updatedC;
      }));

      // 2. Update Queue
      setMatchQueue(prev => prev.map(m => {
          let updatedM = { ...m };

          // If this match is the TARGET
          if (targetType === 'queue' && m.id === targetId) {
              updatedM = updateMatchSlot(updatedM, targetSlotIndex, sourcePlayer);
          }

          // If this match is the SOURCE
          if (sourcePos?.type === 'queue' && m.id === sourcePos.id) {
              updatedM = updateMatchSlot(updatedM, sourcePos.slot, targetPlayer);
          }
          return updatedM;
      }));
  };

  const handleSubstitution = (newPlayerId: string) => {
    if (!substitutionTarget) return;
    const newPlayer = players.find(p => p.id === newPlayerId);
    if (!newPlayer) return;
    
    const findSlot = (type: 'court'|'queue', id: string|number, pid: string) => {
        if (type === 'court') {
            const c = courts.find(x => x.id === id);
            if (!c?.currentMatch) return -1;
            const m = c.currentMatch;
            if (m.teamA.player1.id === pid) return 0;
            if (m.teamA.player2.id === pid) return 1;
            if (m.teamB.player1.id === pid) return 2;
            if (m.teamB.player2.id === pid) return 3;
        } else {
            const m = matchQueue.find(x => x.id === id);
            if (!m) return -1;
            if (m.teamA.player1.id === pid) return 0;
            if (m.teamA.player2.id === pid) return 1;
            if (m.teamB.player1.id === pid) return 2;
            if (m.teamB.player2.id === pid) return 3;
        }
        return -1;
    };

    const slotIdx = findSlot(substitutionTarget.type, substitutionTarget.id, substitutionTarget.playerId);
    if (slotIdx !== -1) {
        executeMoveOrSwap(newPlayer, substitutionTarget.type, substitutionTarget.id, slotIdx);
    }
    setIsModalOpen(false);
    setSubstitutionTarget(null);
  };

  // Wrappers for Drag Handlers
  const handlePlayerDrop = (data: any, targetCourtId: number, targetSlotIndex: number) => {
      if (!data || !data.player) return;
      executeMoveOrSwap(data.player, 'court', targetCourtId, targetSlotIndex);
  };

  const handleQueueDrop = (data: any, targetMatchId: string, targetSlotIndex: number) => {
      if (!data || !data.player) return;
      
      // Check if dragging FROM queue/court (swap) or FROM bench
      // If from bench, check duplicates. If from active, execute swap.
      
      if (data.type === 'bench') {
          // 1. Check if player is on any court
          const isOnCourt = courts.some(c => 
            c.currentMatch && 
            [c.currentMatch.teamA.player1.id, c.currentMatch.teamA.player2.id,
             c.currentMatch.teamB.player1.id, c.currentMatch.teamB.player2.id].includes(data.player.id)
          );
          if (isOnCourt) { alert(`${data.player.name} 正在場上比賽中。`); return; }

          // 2. Check if player is already in queue
          const isAlreadyInQueue = matchQueue.some(m => 
             [m.teamA.player1, m.teamA.player2, m.teamB.player1, m.teamB.player2]
             .some(p => p.id === data.player.id)
          );
          if (isAlreadyInQueue) { alert(`${data.player.name} 已經在待賽名單中了。`); return; }
      }

      executeMoveOrSwap(data.player, 'queue', targetMatchId, targetSlotIndex);
      setQueueDragOver(null);
  };

  // -- Active IDs for PlayerList --
  const onCourtPlayerIds = courts.reduce((acc, c) => {
    if (c.currentMatch) { 
        [c.currentMatch.teamA.player1, c.currentMatch.teamA.player2, c.currentMatch.teamB.player1, c.currentMatch.teamB.player2]
        .forEach(p => { if (!isPlaceholder(p)) acc.push(p.id); }); 
    }
    return acc;
  }, [] as string[]);

  const inQueuePlayerIds = matchQueue.reduce((acc, m) => {
      [m.teamA.player1, m.teamA.player2, m.teamB.player1, m.teamB.player2]
      .forEach(p => { if (!isPlaceholder(p)) acc.push(p.id); });
      return acc;
  }, [] as string[]);

  const availablePlayerCount = players.filter(p => !p.isPaused && !onCourtPlayerIds.includes(p.id) && !inQueuePlayerIds.includes(p.id)).length;

  // ... (Modal prop updates and render)
  const openSubstitutionModal = (type: 'court' | 'queue', id: number | string, playerId: string) => {
    setSubstitutionTarget({ type, id, playerId });
    setIsModalOpen(true);
  };

  // -- Mini Court Renderer for Queue --
  const renderMiniPlayer = (player: Player, matchId: string, slotIndex: number) => {
      const isOver = queueDragOver?.matchId === matchId && queueDragOver?.slotIndex === slotIndex;
      const isPh = isPlaceholder(player);
      
      // GENDER-BASED STYLING for Mini Court
      let levelColor = "bg-gray-100 border-gray-200";
      if (!isPh) {
           if (player.gender === 'female') {
               levelColor = GENDER_COLORS.FEMALE;
           } else {
               levelColor = GENDER_COLORS.MALE;
           }
      }

      return (
          <div 
             className={`w-full h-full flex flex-col items-center justify-center p-[1px] rounded-md border transition-all relative overflow-hidden cursor-pointer group/slot
                ${isPh 
                    ? `border-dashed border-white/40 ${isOver ? 'bg-white/40 border-yellow-300' : 'bg-slate-500/10'}`
                    : `${levelColor} shadow-sm border-white/80 ${isOver ? 'ring-2 ring-yellow-400' : ''}`
                }
             `}
             draggable={!isPh}
             onDragStart={(e) => {
                 e.dataTransfer.setData('application/json', JSON.stringify({
                     type: 'queue',
                     player: player,
                     sourceMatchId: matchId,
                     sourceSlotIndex: slotIndex
                 }));
             }}
             onClick={() => openSubstitutionModal('queue', matchId, player.id)}
             onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setQueueDragOver({ matchId, slotIndex }); }}
             onDragLeave={() => setQueueDragOver(null)}
             onDrop={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setQueueDragOver(null);
                 try {
                     const data = JSON.parse(e.dataTransfer.getData('application/json'));
                     handleQueueDrop(data, matchId, slotIndex);
                 } catch(err){}
             }}
          >
             {isPh ? (
                 <div className="flex items-center justify-center w-full h-full relative">
                     <span className={`text-[9px] font-bold ${isOver ? 'text-yellow-100' : 'text-white/30'} group-hover/slot:opacity-0 transition-opacity scale-75`}>空位</span>
                     <button 
                        className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-50 hover:opacity-100 hover:bg-black/10 transition-all z-10"
                        onClick={(e) => { e.stopPropagation(); handleAutoFillSlot(matchId, slotIndex); }}
                        title="自動填入一名閒置球員"
                     >
                         <Plus className="w-3 h-3 text-white drop-shadow-md" />
                     </button>
                 </div>
             ) : (
                 <div className="flex flex-col items-center w-full h-full justify-between py-0.5">
                    <div className="text-[12px] font-bold truncate w-full text-center leading-tight px-0.5">{player.name}</div>
                    <div className="text-[12px] leading-none opacity-70 scale-90">{player.level}級</div>
                    <div className="text-[12px] leading-none opacity-70 scale-90">{player.gamesPlayed}場</div>
                 </div>
             )}
             {!isPh && (
                <div className="absolute top-0 right-0 opacity-0 hover:opacity-100 p-0.5">
                    <RotateCw className="w-2 h-2 text-gray-500"/>
                </div>
             )}
          </div>
      );
  };

  return (
    <div className="h-[100dvh] bg-slate-100 flex flex-col overflow-hidden font-sans text-gray-900">
      {/* Header */}
      <header className={`bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm shrink-0 relative z-50`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Trophy className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent hidden md:block">
            羽球雙打排點王
          </h1>
          <h1 className="text-xl font-bold text-blue-700 md:hidden">排點王</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
             <Users className="w-3 h-3 mr-1" />
             可用人數: {availablePlayerCount}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetAllStats} 
            title="重置所有紀錄"
            className="text-gray-400 hover:text-red-500"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button 
            variant={isFullScreen ? "danger" : "secondary"}
            size="sm" 
            onClick={() => setIsFullScreen(!isFullScreen)}
            icon={isFullScreen ? <Minimize2 className="w-4 h-4"/> : <Maximize2 className="w-4 h-4"/>}
          >
            {isFullScreen ? "退出" : "全螢幕"}
          </Button>
        </div>
      </header>
      
      {/* Full Screen Overlay Mode */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col h-[100dvh]">
           <div className="absolute top-4 right-4 z-[110]">
              <Button 
                variant="danger" 
                onClick={() => setIsFullScreen(false)}
                className="shadow-lg border-2 border-white/20"
              >
                <Minimize2 className="w-5 h-5 mr-2" /> 退出全螢幕
              </Button>
           </div>
           
           <div className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 min-h-0">
              {courts.map(court => (
                <div key={court.id} className="h-full flex flex-col min-h-0">
                    <CourtDisplay
                        court={court}
                        availablePlayerCount={availablePlayerCount}
                        nextMatchInQueue={matchQueue.length > 0}
                        onFinishMatch={finishMatch}
                        onAssignNext={assignMatchToCourt}
                        onClearCourt={clearCourt}
                        onPlayerClick={(courtId, p) => !isPlaceholder(p) && openSubstitutionModal('court', courtId, p.id)}
                        onDropPlayer={handlePlayerDrop}
                        isFullScreen={true}
                    />
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Column: Dashboard (Courts + Queue) */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-100 p-2 md:p-4 gap-4 transition-all duration-300 ${view === 'players' ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Courts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 shrink-0">
              {courts.map(court => (
                <div key={court.id} className="h-full">
                  <CourtDisplay
                    court={court}
                    availablePlayerCount={availablePlayerCount}
                    nextMatchInQueue={matchQueue.length > 0}
                    onFinishMatch={finishMatch}
                    onAssignNext={assignMatchToCourt}
                    onClearCourt={clearCourt}
                    onPlayerClick={(courtId, p) => !isPlaceholder(p) && openSubstitutionModal('court', courtId, p.id)}
                    onDropPlayer={handlePlayerDrop}
                  />
                </div>
              ))}
            </div>

            {/* Match Queue Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 shrink-0">
               <div className="flex items-center gap-2 mb-3 text-gray-800 font-bold border-b border-gray-100 pb-2">
                 <CalendarClock className="w-5 h-5 text-indigo-500" />
                 待賽清單 
                 <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                    {matchQueue.length} 場
                 </span>
               </div>
               
               {matchQueue.length === 0 ? (
                 <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <ListOrdered className="w-8 h-8 mb-2 opacity-20" />
                    目前沒有待賽隊伍
                 </div>
               ) : (
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                    {matchQueue.map((match, mIdx) => {
                      // Check for empty slots
                      const hasEmptySlots = [
                          match.teamA.player1, match.teamA.player2, 
                          match.teamB.player1, match.teamB.player2
                      ].some(p => isPlaceholder(p));

                      return (
                      <div key={match.id} className="relative group bg-white p-1 rounded-xl shadow border border-gray-200">
                         <div className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full z-20 shadow">
                            {mIdx + 1}
                         </div>
                         {/* Mini Court Visual */}
                         <div className="w-full aspect-[6.1/7] bg-emerald-600 rounded shadow-inner border border-white/80 relative overflow-hidden">
                             {/* Markings */}
                             <div className="absolute inset-[10%] border border-white/50 opacity-80 pointer-events-none"></div>
                             <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40 pointer-events-none"></div>
                             <div className="absolute top-[10%] bottom-[10%] left-1/2 w-px bg-white/50 transform -translate-x-1/2 pointer-events-none"></div>
                             
                             {/* Net */}
                             <div className="absolute top-1/2 left-[-2%] right-[-2%] h-0.5 bg-white/90 transform -translate-y-1/2 z-0 flex items-center justify-center pointer-events-none">
                                 <div className="w-full h-full bg-white opacity-50"></div>
                             </div>

                             {/* "Auto Fill Match" Button (Centered) - Visible on hover if slots are empty */}
                             {hasEmptySlots && (
                                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 opacity-50 hover:opacity-100 transition-opacity">
                                     <button 
                                        className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition-colors text-white ring-1 ring-white"
                                        onClick={(e) => { e.stopPropagation(); handleAutoFillMatch(match.id); }}
                                        title="自動填滿此場比賽"
                                     >
                                         <Sparkles className="w-2.5 h-2.5" />
                                     </button>
                                 </div>
                             )}

                             {/* Players Grid */}
                             <div className="absolute inset-0 grid grid-rows-2 z-10 p-0.5 gap-0.5">
                                 {/* Top Half (Team B) */}
                                 <div className="grid grid-cols-2 gap-0.5">
                                      {renderMiniPlayer(match.teamB.player1, match.id, 2)}
                                      {renderMiniPlayer(match.teamB.player2, match.id, 3)}
                                 </div>
                                 {/* Bottom Half (Team A) */}
                                 <div className="grid grid-cols-2 gap-0.5">
                                      {renderMiniPlayer(match.teamA.player1, match.id, 0)}
                                      {renderMiniPlayer(match.teamA.player2, match.id, 1)}
                                 </div>
                             </div>
                         </div>
                      </div>
                    );
                    })}
                 </div>
               )}
            </div>
        </div>

        {/* Right Column: Player List */}
        <div className={`flex-col bg-white border-l border-gray-200 shadow-xl z-20 transition-all duration-300
            ${view === 'players' ? 'flex w-full absolute inset-0' : 'hidden md:flex md:w-80 md:relative'}
        `}>
           <PlayerList 
             players={players} 
             onAddPlayer={handleAddPlayer}
             onRemovePlayer={handleRemovePlayer}
             onTogglePause={handleTogglePause}
             onCourtPlayerIds={onCourtPlayerIds}
             inQueuePlayerIds={inQueuePlayerIds}
           />
        </div>

      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 flex justify-around p-2 shrink-0 safe-area-bottom">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center p-2 rounded-lg ${view === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">球場狀況</span>
        </button>
        <button 
          onClick={() => setView('players')}
          className={`flex flex-col items-center p-2 rounded-lg ${view === 'players' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">球員名單</span>
        </button>
      </nav>

      {/* Modals */}
      <PlayerSelectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        players={players.filter(p => !p.isPaused && !isPlaceholder(p))}
        onSelect={handleSubstitution}
        currentPlayerId={substitutionTarget?.playerId}
        getPlayerStatus={getPlayerLocation}
      />

    </div>
  );
};

export default App;