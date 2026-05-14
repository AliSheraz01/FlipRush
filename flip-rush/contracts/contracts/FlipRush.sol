// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlipRush is ReentrancyGuard, Ownable {
    IERC20 public immutable usdc;
    uint256 public constant ENTRY_FEE = 100000; // 0.1 USDC (6 decimals)
    uint256 public constant WINNER_PAYOUT = 190000; // 0.19 USDC
    uint256 public constant PROTOCOL_FEE = 10000; // 0.01 USDC

    enum Side { HEADS, TAILS }
    enum GameStatus { OPEN, JOINED, SETTLED, CANCELLED }

    struct Game {
        address player1;
        address player2;
        Side player1Side;
        uint256 entryAmount;
        GameStatus status;
        address winner;
        uint256 createdAt;
    }

    mapping(uint256 => Game) public games;
    uint256 public nextGameId;
    uint256 public totalFeesCollected;

    event GameCreated(uint256 indexed gameId, address indexed player1, Side side);
    event GameJoined(uint256 indexed gameId, address indexed player2);
    event GameSettled(uint256 indexed gameId, address indexed winner, Side winningSide);
    event GameCancelled(uint256 indexed gameId, address indexed player);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    function createGame(Side _side) external nonReentrant {
        require(usdc.transferFrom(msg.sender, address(this), ENTRY_FEE), "Transfer failed");

        games[nextGameId] = Game({
            player1: msg.sender,
            player2: address(0),
            player1Side: _side,
            entryAmount: ENTRY_FEE,
            status: GameStatus.OPEN,
            winner: address(0),
            createdAt: block.timestamp
        });

        emit GameCreated(nextGameId, msg.sender, _side);
        nextGameId++;
    }

    function joinGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.OPEN, "Game not open");
        require(game.player1 != msg.sender, "Cannot join own game");
        
        require(usdc.transferFrom(msg.sender, address(this), ENTRY_FEE), "Transfer failed");

        game.player2 = msg.sender;
        game.status = GameStatus.JOINED;

        emit GameJoined(_gameId, msg.sender);

        _settleGame(_gameId);
    }

    function _settleGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        
        // Pseudo-randomness for this lightweight version
        // In production, consider Chainlink VRF or a commit-reveal scheme
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            game.player1,
            game.player2,
            _gameId
        )));

        Side winningSide = Side(random % 2);
        address winner;

        if (game.player1Side == winningSide) {
            winner = game.player1;
        } else {
            winner = game.player2;
        }

        game.winner = winner;
        game.status = GameStatus.SETTLED;
        totalFeesCollected += PROTOCOL_FEE;

        require(usdc.transfer(winner, WINNER_PAYOUT), "Payout failed");

        emit GameSettled(_gameId, winner, winningSide);
    }

    function cancelGame(uint256 _gameId) external nonReentrant {
        Game storage game = games[_gameId];
        require(game.player1 == msg.sender, "Not your game");
        require(game.status == GameStatus.OPEN, "Cannot cancel");

        game.status = GameStatus.CANCELLED;
        require(usdc.transfer(msg.sender, ENTRY_FEE), "Refund failed");

        emit GameCancelled(_gameId, msg.sender);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;
        require(usdc.transfer(owner(), amount), "Withdraw failed");
    }
}
