'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GameUI } from '@/components/GameUI';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { socket } from '@/lib/socket';
import { CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/constants';
import { FLIP_RUSH_ABI, USDC_ABI } from '@/lib/abi';
import { parseUnits } from 'viem';

export default function Home() {
  const { isConnected, address } = useAccount();
  const [lobbyData, setLobbyData] = useState<{ lobby: any[], activeGames: any[] }>({ lobby: [], activeGames: [] });

  useEffect(() => {
    socket.on('lobbyUpdate', (data) => {
      setLobbyData(data);
    });
    return () => {
      socket.off('lobbyUpdate');
    };
  }, []);

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const handleJoinGame = (gameId: number) => {
    if (!address) return;
    
    // In real app, we check allowance first like in GameUI
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: FLIP_RUSH_ABI,
      functionName: 'joinGame',
      args: [BigInt(gameId)],
    });

    // Notify backend
    socket.emit('gameJoined', { gameId, participant: address });
  };

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        <header className="w-full flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.5)]">
              <span className="text-black font-black text-xl">F</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter">FLIPRUSH</h1>
          </div>
          <ConnectButton showBalance={false} />
        </header>

        {isConnected ? (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <GameUI />
            
            <div className="space-y-6">
              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Live Matches</h3>
                <div className="space-y-3">
                  {lobbyData.activeGames.length > 0 ? (
                    lobbyData.activeGames.map((game, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm font-mono">{game.creator.slice(0, 6)}...{game.creator.slice(-4)}</span>
                          <span className="text-[10px] text-zinc-500 uppercase">Chose {game.side}</span>
                        </div>
                        <button 
                          onClick={() => handleJoinGame(game.gameId)}
                          disabled={game.creator === address || game.status === 'matched'}
                          className="px-4 py-1.5 bg-cyan-500 text-black text-xs font-bold rounded-md hover:bg-cyan-400 disabled:opacity-50"
                        >
                          {game.status === 'matched' ? 'MATCHED' : 'JOIN'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5 opacity-50">
                      <span className="text-sm text-zinc-500 italic">Waiting for players...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Leaderboard</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">1. whale.eth</span>
                    <span className="font-bold text-cyan-400">42 Wins</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">2. degen.arc</span>
                    <span className="font-bold text-cyan-400">38 Wins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              THE FASTEST COIN FLIP <br /> ON ARC NETWORK
            </h2>
            <p className="text-zinc-400 mb-10 max-w-lg mx-auto">
              Wager 0.1 USDC and double your money instantly. 
              Built for speed, fully on-chain, zero friction.
            </p>
            <div className="flex justify-center">
               <ConnectButton showBalance={false} />
            </div>
          </div>
        )}
      </div>

      <footer className="mt-20 text-zinc-600 text-xs tracking-widest uppercase">
        Powered by Arc Network &bull; Secured by Smart Contracts
      </footer>
    </main>
  );
}

