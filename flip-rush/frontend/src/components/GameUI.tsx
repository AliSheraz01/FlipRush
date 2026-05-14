'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2 } from 'lucide-react';
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { FLIP_RUSH_ABI, USDC_ABI } from '@/lib/abi';
import { CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/constants';
import { socket } from '@/lib/socket';

export function GameUI() {
  const { address } = useAccount();
  const [isFlipping, setIsFlipping] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);

  useEffect(() => {
    if (address) {
      socket.connect();
      socket.emit('joinLobby', { walletAddress: address });
    }
    return () => {
      socket.disconnect();
    };
  }, [address]);

  const { data: balanceData } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: decimals } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'decimals',
  });

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
  });

  const { writeContract, data: hash, isPending: isBetting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });

  const handleBet = async () => {
    if (!address) return;

    const entryFee = parseUnits('0.1', 6);
    const sideValue = selectedSide === 'heads' ? 0 : 1;

    try {
      // Check allowance
      if (!allowance || (allowance as bigint) < entryFee) {
        writeContract({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, parseUnits('1000000', 6)],
        });
        return;
      }

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: FLIP_RUSH_ABI,
        functionName: 'createGame',
        args: [sideValue],
      });
    } catch (error) {
      console.error('Bet failed:', error);
    }
  };

  useEffect(() => {
    if (isSuccess && receipt) {
      // Find GameCreated event in logs
      const event = receipt.logs.find(log => log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase());
      // In a real app, we would use viem's decodeEventLog
      // For now, we'll try to get it from the socket or wait for the event watch
      
      socket.emit('gameCreated', {
        gameId: Math.floor(Math.random() * 100000), // Fallback if decoding fails
        creator: address,
        side: selectedSide,
        amount: '0.1'
      });

      setIsFlipping(true);
      setResult(null);
    }
  }, [isSuccess, receipt, address, selectedSide]);

  // Listen for game settled from backend/socket
  useEffect(() => {
    const handleGameMatched = (game: any) => {
      if (game.creator === address || game.participant === address) {
        setIsFlipping(true);
        // Wait for the actual result (usually sent via a separate event or socket update)
      }
    };

    const handleResult = (data: { gameId: any, winner: string, winningSide: number }) => {
       const outcome = data.winningSide === 0 ? 'heads' : 'tails';
       setResult(outcome);
       setIsFlipping(false);
    };

    socket.on('gameMatched', handleGameMatched);
    socket.on('gameResult', handleResult);
    
    return () => {
      socket.off('gameMatched', handleGameMatched);
      socket.off('gameResult', handleResult);
    };
  }, [address]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_-10px_rgba(0,242,255,0.3)] max-w-md w-full mx-auto">
      <div className="w-full flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-wider">FLIP RUSH</h2>
        <div className="text-xs text-zinc-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          Balance: <span className="text-cyan-400 font-bold">
            {balanceData && decimals ? parseFloat(formatUnits(balanceData as bigint, decimals as number)).toFixed(2) : '0.00'} USDC
          </span>
        </div>
      </div>
      
      <div className="relative w-48 h-48 mb-12">
        <AnimatePresence mode='wait'>
          <motion.div
            key={isFlipping ? 'flipping' : (result || 'idle')}
            initial={{ rotateY: 0 }}
            animate={isFlipping ? { 
              rotateY: [0, 720, 1440, 2160],
              y: [0, -100, 0]
            } : { rotateY: 0 }}
            transition={{ 
              duration: isFlipping ? 2 : 0.5,
              ease: isFlipping ? "easeInOut" : "easeOut"
            }}
            className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center border-4 border-white/20 shadow-[0_0_50px_rgba(0,242,255,0.5)]"
          >
            {result === 'heads' ? (
              <span className="text-6xl font-black text-white">H</span>
            ) : result === 'tails' ? (
              <span className="text-6xl font-black text-white">T</span>
            ) : (
              <Coins className="w-24 h-24 text-white/80" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex gap-4 w-full mb-8">
        <button 
          onClick={() => setSelectedSide('heads')}
          className={`flex-1 py-4 border-2 rounded-xl font-bold transition-all ${
            selectedSide === 'heads' ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'bg-zinc-800 border-white/5 text-zinc-500'
          }`}
        >
          HEADS
        </button>
        <button 
          onClick={() => setSelectedSide('tails')}
          className={`flex-1 py-4 border-2 rounded-xl font-bold transition-all ${
            selectedSide === 'tails' ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-zinc-800 border-white/5 text-zinc-500'
          }`}
        >
          TAILS
        </button>
      </div>

      <button
        onClick={handleBet}
        disabled={isFlipping || isBetting || isConfirming}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-black font-black text-lg uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {(isBetting || isConfirming) && <Loader2 className="animate-spin" />}
        {isFlipping ? 'Matching...' : isBetting ? 'Signing...' : isConfirming ? 'Confirming...' : 'Place 0.1 USDC Bet'}
      </button>
    </div>
  );
}

