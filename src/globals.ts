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
