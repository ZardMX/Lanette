import type { IGameFile } from '../types/games';
import type { IPokemon } from '../types/pokemon-showdown';
import { EliminationTournament, game as eliminationTournamentGame } from './templates/elimination-tournament';

const name = "Catch and Evolve";
const description = "Every player is given a randomly generated Pokemon to use as their starter. Each battle that you win, you " +
	"must 'catch' 1 of your opponent's Pokemon (add it to your team) and then evolve 1 Pokemon on your team.";
const bannedTiers: string[] = ['Uber', 'OU', 'UU', 'UUBL', 'RU', 'RUBL', 'NU', 'NUBL', 'PU', 'PUBL'];

class CatchAndEvolve extends EliminationTournament {
	additionsPerRound = 1;
	evolutionsPerRound = 1;
	startingTeamsLength = 1;
	maxPlayers = 64;
	requiredAddition = true;
	requiredEvolution = true;
	canReroll = true;
	baseTournamentName = name;
	tournamentDescription = description;
	banlist = ['Burmy', 'Caterpie', 'Combee', 'Kricketot', 'Magikarp', 'Scatterbug', 'Sunkern', 'Tynamo', 'Type: Null', 'Weedle',
		'Wurmple', 'Cosmog', 'Blipbug', 'Snom'];

	meetsStarterCriteria(pokemon: IPokemon): boolean {
		if (bannedTiers.includes(pokemon.tier)) return false;
		return true;
	}
}

export const game: IGameFile<CatchAndEvolve> = Games.copyTemplateProperties(eliminationTournamentGame, {
	aliases: ['cande', 'ce', 'catchevolve'],
	class: CatchAndEvolve,
	description,
	name,
	variants: [
		{
			name: "Monotype Catch and Evolve",
			variant: "monotype",
		},
		{
			name: "Monoregion Catch and Evolve",
			variant: "monoregion",
			variantAliases: ["monogen"],
		},
		{
			name: "Catch and Evolve Ubers",
			variant: "ubers",
		},
		{
			name: "Catch and Evolve UU",
			variant: "uu",
		},
		{
			name: "Catch and Evolve RU",
			variant: "ru",
		},
		{
			name: "Catch and Evolve NU",
			variant: "nu",
		},
		{
			name: "Catch and Evolve PU",
			variant: "pu",
		},
		{
			name: "Catch and Evolve ZU",
			variant: "zu",
		},
	],
});
