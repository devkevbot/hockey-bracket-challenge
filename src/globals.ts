export const NHL_TEAM_NAMES = [
  "Boston Bruins",
  "Florida Panthers",
  "Carolina Hurricanes",
  "New York Islanders",
  "New Jersey Devils",
  "New York Rangers",
  "Toronto Maple Leafs",
  "Tampa Bay Lightning",
  "Vegas Golden Knights",
  "Winnipeg Jets",
  "Edmonton Oilers",
  "Los Angeles Kings",
  "Colorado Avalanche",
  "Seattle Kraken",
  "Dallas Stars",
  "Minnesota Wild",
] as const;
export type NhlTeamName = (typeof NHL_TEAM_NAMES)[number];

export const WINS_REQUIRED_IN_SERIES = 4;

export const TOP_SEED_SERIES_WIN_SCORES = [
  `${WINS_REQUIRED_IN_SERIES}-0`,
  `${WINS_REQUIRED_IN_SERIES}-1`,
  `${WINS_REQUIRED_IN_SERIES}-2`,
  `${WINS_REQUIRED_IN_SERIES}-3`,
] as const;

export const BOTTOM_SEED_SERIES_WIN_SCORES = [
  `0-${WINS_REQUIRED_IN_SERIES}`,
  `1-${WINS_REQUIRED_IN_SERIES}`,
  `2-${WINS_REQUIRED_IN_SERIES}`,
  `3-${WINS_REQUIRED_IN_SERIES}`,
] as const;

export const SERIES_WIN_SCORES = [
  `${WINS_REQUIRED_IN_SERIES}-0`,
  `${WINS_REQUIRED_IN_SERIES}-1`,
  `${WINS_REQUIRED_IN_SERIES}-2`,
  `${WINS_REQUIRED_IN_SERIES}-3`,
  `0-${WINS_REQUIRED_IN_SERIES}`,
  `1-${WINS_REQUIRED_IN_SERIES}`,
  `2-${WINS_REQUIRED_IN_SERIES}`,
  `3-${WINS_REQUIRED_IN_SERIES}`,
] as const;

export type SeriesWinScore = (typeof SERIES_WIN_SCORES)[number];

export const SERIES_POSSIBLE_SCORES = [
  "0-0",
  "1-0",
  "2-0",
  "3-0",
  "4-0",

  "0-1",
  "1-1",
  "2-1",
  "3-1",
  "4-1",

  "0-2",
  "1-2",
  "2-2",
  "3-2",
  "4-2",

  "0-3",
  "1-3",
  "2-3",
  "3-3",
  "4-3",

  "0-4",
  "1-4",
  "2-4",
  "3-4",
] as const;

export type SeriesPossibleScore = (typeof SERIES_POSSIBLE_SCORES)[number];
