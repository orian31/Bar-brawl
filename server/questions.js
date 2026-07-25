// Bar Brawl trivia deck. Each question: 4 choices, index of correct answer.
export const QUESTIONS = [
  {
    text: "What spirit is the base of a classic Mojito?",
    choices: ["Vodka", "White rum", "Gin", "Tequila"],
    answer: 1
  },
  {
    text: "Which country is credited with inventing lager beer?",
    choices: ["Belgium", "Ireland", "Germany", "Czech Republic"],
    answer: 3
  },
  {
    text: "In darts, what is the highest score possible with a single dart?",
    choices: ["50", "60", "40", "180"],
    answer: 1
  },
  {
    text: "What does 'IPA' stand for on a beer menu?",
    choices: ["Irish Pale Ale", "India Pale Ale", "Imperial Pale Ale", "Island Pale Ale"],
    answer: 1
  },
  {
    text: "A classic Old Fashioned is built on which spirit?",
    choices: ["Whiskey", "Brandy", "Rum", "Gin"],
    answer: 0
  },
  {
    text: "How many balls (excluding the cue ball) are on a standard pool table at the start of an 8-ball game?",
    choices: ["14", "15", "16", "21"],
    answer: 1
  },
  {
    text: "What fruit garnish is traditional on an Old Fashioned?",
    choices: ["Lime wedge", "Orange peel", "Cherry only", "Lemon twist"],
    answer: 1
  },
  {
    text: "Which country produces the most wine by volume?",
    choices: ["France", "USA", "Italy", "Spain"],
    answer: 2
  },
  {
    text: "What's the name for a shot of espresso dropped into a glass of beer... wait, that's not a thing. What IS a boilermaker?",
    choices: ["Beer + whiskey shot", "Coffee + rum", "Cider + gin", "Wine + soda"],
    answer: 0
  },
  {
    text: "In beer pong, how many cups are typically set up per side?",
    choices: ["6", "8", "10", "12"],
    answer: 2
  },
  {
    text: "What's the main ingredient in a traditional margarita besides tequila and lime?",
    choices: ["Triple sec", "Grenadine", "Vermouth", "Amaretto"],
    answer: 0
  },
  {
    text: "Which of these is NOT a real cocktail?",
    choices: ["Moscow Mule", "Dark 'n' Stormy", "Brooklyn Thunder", "Paloma"],
    answer: 2
  }
];

export function pickQuestions(count = 6) {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
