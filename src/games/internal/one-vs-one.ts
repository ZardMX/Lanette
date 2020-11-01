import type { Player } from "../../room-activity";
import { ScriptedGame } from "../../room-game-scripted";
import type { Room } from "../../rooms";
import type { IGameFile, IGameFormat } from "../../types/games";
import type { User } from "../../users";

export class OneVsOne extends ScriptedGame {
	leftPlayer: Player | null = null;
	leftPlayerPromotedName: string = '';
	rightPlayer: Player | null = null;
	rightPlayerPromotedName: string = '';
	internalGame: boolean = true;
	noForceEndMessage: boolean = true;
	originalModchat: string = '';
	winner: Player | undefined;

	challengeFormat!: IGameFormat;

	room!: Room;

	setupChallenge(leftPlayer: User, rightPlayer: User, challengeFormat: IGameFormat): void {
		this.challengeFormat = challengeFormat;
		this.rightPlayer = this.createPlayer(rightPlayer)!;
		this.leftPlayer = this.createPlayer(leftPlayer)!;
		this.minPlayers = 2;
		this.name += " (" + challengeFormat.name + ")";

		const text = this.leftPlayer.name + " challenges " + this.rightPlayer.name + " to a one vs. one game of " +
			challengeFormat.nameWithOptions + "!";
		this.on(text, () => {
			this.timeout = setTimeout(() => {
				this.say(this.rightPlayer!.name + " failed to accept the challenge in time!");
				this.forceEnd(Users.self);
			}, 2 * 60 * 1000);
		});
		this.say(text);
	}

	acceptChallenge(user: User): boolean {
		if (this.started || !this.rightPlayer || !this.leftPlayer) return false;
		if (user.id !== this.rightPlayer.id) {
			user.say("You are not the defender in the current one vs. one challenge.");
			return false;
		}

		const leftPlayer = Users.get(this.leftPlayer.name);
		if (!leftPlayer) {
			this.say("The challenger must be in the room for the challenge to begin.");
			return false;
		}

		if (this.timeout) clearTimeout(this.timeout);

		this.originalModchat = this.room.modchat;
		this.say("/modchat +");
		if (!user.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + user.name);
			this.rightPlayerPromotedName = user.id;
		}
		if (!leftPlayer.hasRank(this.room, 'voice')) {
			this.say("/roomvoice " + leftPlayer.name);
			this.leftPlayerPromotedName = leftPlayer.id;
		}

		this.start();
		return true;
	}

	rejectChallenge(user: User): boolean {
		if (this.started || !this.rightPlayer) return false;
		if (user.id !== this.rightPlayer.id) {
			user.say("You are not the defender in the current one vs. one challenge.");
			return false;
		}
		this.say(user.name + " rejected the challenge!");
		this.forceEnd(user);
		return true;
	}

	cancelChallenge(user: User): boolean {
		if (this.started || !this.leftPlayer) return false;
		if (user.id !== this.leftPlayer.id) {
			user.say("You are not the challenger in the current one vs. one challenge.");
			return false;
		}
		this.say(user.name + " cancelled their challenge!");
		this.forceEnd(user);
		return true;
	}

	onStart(): void {
		this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
	}

	onNextRound(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("nextRound() called without leftPlayer and rightPlayer");

		if (this.rightPlayer.eliminated) {
			this.say(this.rightPlayer.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}
		if (this.leftPlayer.eliminated) {
			this.say(this.leftPlayer.name + " has left the game!");
			this.timeout = setTimeout(() => this.end(), 5 * 1000);
			return;
		}

		const game = Games.createChildGame(this.challengeFormat, this);
		game.internalGame = true;
		game.inheritPlayers(this.players);
		game.minPlayers = 2;

		if (game.format.challengePoints && game.format.challengePoints.onevsone) {
			game.format.options.points = game.format.challengePoints.onevsone;
		} else if ('points' in game.format.customizableOptions) {
			game.format.options.points = game.format.customizableOptions.points.max;
		} else if (game.format.defaultOptions.includes('points')) {
			game.format.options.points = 10;
		}

		game.sayHtml(game.getDescriptionHtml());
		game.signups();

		if (!game.format.options.freejoin) {
			this.timeout = setTimeout(() => game.start(), 5 * 1000);
		}
	}

	onChildEnd(winners: Map<Player, number>): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("onChildEnd() called without leftPlayer and rightPlayer");

		const rightPlayerPoints = winners.get(this.rightPlayer) || 0;
		const leftPlayerPoints = winners.get(this.leftPlayer) || 0;
		this.rightPlayer.reset();
		this.leftPlayer.reset();

		let winner;
		if (rightPlayerPoints > leftPlayerPoints) {
			winner = this.rightPlayer;
		} else if (leftPlayerPoints > rightPlayerPoints) {
			winner = this.leftPlayer;
		}

		if (winner) {
			this.winner = winner;
		} else {
			this.say("No one wins!");
		}

		this.end();
	}

	resetModchatAndRanks(): void {
		this.say("/modchat " + this.originalModchat);
		if (this.leftPlayerPromotedName) this.say("/roomdeauth " + this.leftPlayerPromotedName);
		if (this.rightPlayerPromotedName) this.say("/roomdeauth " + this.rightPlayerPromotedName);
	}

	updateLastChallengeTime(): void {
		if (!this.leftPlayer) return;

		if (!(this.room.id in Games.lastOneVsOneChallengeTimes)) Games.lastOneVsOneChallengeTimes[this.room.id] = {};
		Games.lastOneVsOneChallengeTimes[this.room.id][this.leftPlayer.id] = Date.now();
	}

	onEnd(): void {
		if (!this.leftPlayer || !this.rightPlayer) throw new Error("onEnd() called without leftPlayer and rightPlayer");

		if (this.leftPlayer.eliminated || this.rightPlayer === this.winner) {
			this.say(this.rightPlayer.name + " has won the challenge!");
		} else if (this.rightPlayer.eliminated || this.leftPlayer === this.winner) {
			this.say(this.leftPlayer.name + " has won the challenge!");
		}

		this.resetModchatAndRanks();
		this.updateLastChallengeTime();
	}

	onForceEnd(user?: User): void {
		this.resetModchatAndRanks();
		if (user && this.leftPlayer && user.id === this.leftPlayer.id) {
			this.updateLastChallengeTime();
		}
	}

	getLeftPlayer(): Player {
		if (!this.leftPlayer) throw new Error("getLeftPlayer() called without left player");
		return this.leftPlayer;
	}

	getRightPlayer(): Player {
		if (!this.rightPlayer) throw new Error("getRightPlayer() called without right player");
		return this.rightPlayer;
	}
}

export const game: IGameFile<OneVsOne> = {
	class: OneVsOne,
	description: "Players compete one vs. one in a chosen format!",
	freejoin: true,
	name: "One vs. One",
};
