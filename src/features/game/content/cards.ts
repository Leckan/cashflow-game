import { usd } from "../money";
import type { CardOption, EventCard, SpaceCategory } from "../types";

function card(
  id: string,
  category: SpaceCategory,
  title: string,
  description: string,
  educationalExplanation: string,
  options: CardOption[],
  extra: Partial<EventCard> = {},
): EventCard {
  return { id, category, title, description, educationalExplanation, options, ...extra };
}

const acknowledge = (detail: string): CardOption => ({
  id: "acknowledge",
  label: "Continue",
  detail,
  effect: { type: "noop" },
});

export const cards: EventCard[] = [
  card(
    "quiet-review",
    "review",
    "A quiet look at the sheet",
    "Nothing on the table demands cash. The month still settles when you end the turn.",
    "A turn with no deal is not a wasted turn. The statement changes when income and spending settle, even if you buy nothing.",
    [acknowledge("Leave the sheet as it is.")],
  ),
  card(
    "tut-paycheck",
    "tutorial",
    "The paycheck and the month",
    "Your salary is earned. It arrives because of work. The living costs leave whether you feel busy or not. The difference is this month's cash flow, before any investment.",
    "Income minus expenses is cash flow. Net worth is a different sentence: what you own minus what you owe. A person can have a positive cash flow and a negative net worth, or the reverse.",
    [acknowledge("Compare the paycheck with the living costs on your statement.")],
  ),
  card(
    "tut-maple",
    "tutorial",
    "Read Maple Street before you touch it",
    "The duplex is fictional. Cash to start is $40,000. The base month is $450 after the loan and operating costs, and only if both units stay full.",
    "Opening a deal does not buy it. If the cash is not there, declining is a complete decision. A positive line on a seller's sheet can still be the wrong month to say yes.",
    [
      {
        id: "buy",
        label: "Buy the duplex",
        detail: "Pay the down payment and closing costs if your cash covers them.",
        effect: { type: "buy", offerId: "maple-street-duplex" },
      },
      { id: "decline", label: "Decline", detail: "Leave the listing. Your cash stays where it is.", effect: { type: "noop" } },
    ],
    { riskNote: "Vacancy, repairs, and price changes are not in the $450." },
  ),
  card(
    "tut-leak",
    "tutorial",
    "A $200 leak",
    "A pipe in the story of this turn needs a plumber. The bill is $200. It is not a moral failure. It is a cash test.",
    "An emergency reserve is cash, not the value of a retirement fund you cannot spend this afternoon. If the bill is larger than cash, this game uses a hardship bridge with a high fictional rate, and only up to a cap.",
    [
      {
        id: "pay",
        label: "Pay $200",
        detail: "Cash falls by $200, or a hardship bridge covers what cash cannot.",
        effect: { type: "expense", amountCents: usd(200), description: "Plumber for a burst pipe." },
      },
    ],
  ),
  card(
    "tut-goal",
    "tutorial",
    "What winning means here",
    "The spire lights when recurring passive income covers the month's expenses and cash is not negative. A large net worth with no passive income is a different ending.",
    "Financial independence in this game is a cash-flow test, not a net-worth test. Debt payments and operating costs count as expenses. Salary does not count as passive.",
    [acknowledge("Keep that definition for the next game.")],
  ),
  card(
    "deal-maple",
    "real_estate",
    "Maple Street Duplex",
    "Hypothetical listing. Price $180,000. Down payment $36,000. Closing costs $4,000. Sheet rent $2,400. Operating costs $700. Loan payment $1,250.",
    "Base cash flow is $450 only while those assumptions hold. Closing costs reduce net worth even though the down payment becomes equity. This is not a property you can tour.",
    [
      { id: "buy", label: "Buy", detail: "Requires $40,000 cash.", effect: { type: "buy", offerId: "maple-street-duplex" } },
      { id: "decline", label: "Decline", detail: "No change to cash, debt, or income.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 4, riskNote: "Downside on the card includes a vacant unit." },
  ),
  card(
    "deal-loft",
    "real_estate",
    "Workshop Loft",
    "A fictional loft. Less cash to start than the duplex, and less income.",
    "Smaller is not automatically safer. You still owe the payment if the tenant leaves.",
    [
      { id: "buy", label: "Buy", detail: "Down payment plus closing costs.", effect: { type: "buy", offerId: "workshop-loft" } },
      { id: "decline", label: "Decline", detail: "Walk past the listing.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "deal-fourplex",
    "real_estate",
    "Orchard Court Fourplex",
    "Four fictional units. The base month looks strong and the down payment is large. One building would hold a lot of your story.",
    "Concentration means a single vacancy wave can hit income and net worth together. Size the reserve before you admire the rent roll.",
    [
      { id: "buy", label: "Buy", detail: "A large cash requirement.", effect: { type: "buy", offerId: "orchard-fourplex" } },
      { id: "decline", label: "Decline", detail: "Leave the fourplex on the market.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 5, riskNote: "High concentration even in the base case." },
  ),
  card(
    "deal-laundry",
    "small_business",
    "Northline Laundry Route",
    "The seller talks about $6,400 a month moving through the machines. Your base profit share is $2,200, and the card asks for a $400 reserve on top.",
    "Revenue is not profit. The attendant, the building rent, and the parts are why the owner's number is smaller than the coins in the machines.",
    [
      { id: "buy", label: "Buy the route", detail: "$28,000 cash. No loan in this scenario.", effect: { type: "buy", offerId: "northline-laundry" } },
      { id: "decline", label: "Decline", detail: "The route stays with the seller.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 4 },
  ),
  card(
    "deal-kiosk",
    "small_business",
    "Harbor Kiosk",
    "A small fictional cart. Base cash flow is $120 a month after a friend's staffing and supplies.",
    "A little passive income is a start and a poor retirement plan. Name the gap between $120 and your monthly spending out loud.",
    [
      { id: "buy", label: "Buy the kiosk", detail: "$4,000 cash.", effect: { type: "buy", offerId: "harbor-kiosk" } },
      { id: "decline", label: "Decline", detail: "Keep the cash.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "deal-stall",
    "small_business",
    "Night Market Stall",
    "Saturday nights look busy. The owner's base month is $280 after the attendant and the stall rent.",
    "A crowd is not a cash-flow statement. Ask what is left on a quiet week.",
    [
      { id: "buy", label: "Buy the stall", detail: "$9,000 cash.", effect: { type: "buy", offerId: "night-market-stall" } },
      { id: "decline", label: "Decline", detail: "Leave the stall.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "deal-lantern",
    "securities",
    "Lantern Index Units",
    "Fictional units. You pay $8,000. The scenario distributes $40 a month. The price does not come from a live market.",
    "A distribution can be spent. A higher marked price cannot, until a sale exists in the game. Do not treat the whole $8,000 as monthly income.",
    [
      { id: "buy", label: "Buy units", detail: "$8,000 cash.", effect: { type: "buy", offerId: "lantern-index" } },
      { id: "decline", label: "Decline", detail: "Hold cash instead.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "deal-cedar",
    "securities",
    "Cedar Town Bond",
    "A fictional bond with a small coupon. The town is invented. The coupon is not a guarantee outside this table.",
    "Calm income can still be the wrong tool for an emergency. Liquidity is whether you can pay a bill this turn.",
    [
      { id: "buy", label: "Buy the bond", detail: "$3,000 cash.", effect: { type: "buy", offerId: "cedar-bond" } },
      { id: "decline", label: "Decline", detail: "Skip the coupon.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "deal-kiosk-bargain",
    "negotiation",
    "The kiosk seller is ready to leave",
    "They will take $500 less. The cart is the same cart, including the slow months.",
    "A discount changes the cash you need. It does not erase demand risk. Declining a cheaper deal is allowed.",
    [
      {
        id: "buy",
        label: "Buy for $3,500",
        detail: "Negotiated price. The scenario is still hypothetical.",
        effect: { type: "buy", offerId: "harbor-kiosk", priceDiscountCents: usd(500) },
      },
      { id: "decline", label: "Decline", detail: "Even at a discount.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 4 },
  ),
  card(
    "partner-loft",
    "negotiation",
    "A partner wants the loft decision today",
    "Urgency is not a number on the statement. The loft's cash flows are the same as the ordinary listing.",
    "You can refuse a rushed yes. If you buy, you still live with vacancy and the loan.",
    [
      { id: "buy", label: "Buy the loft", detail: "Same price as the ordinary listing.", effect: { type: "buy", offerId: "workshop-loft" } },
      { id: "decline", label: "Not today", detail: "The partner can wait or find someone else.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 3 },
  ),
  card(
    "repair-roof",
    "unexpected",
    "A roof bill",
    "A fictional roof needs $1,500. If you own a property, this is the cost of keeping the income. If you do not, it is a home repair in the story of your own housing.",
    "Reserves exist for this sentence. A property that cash-flows $450 does not absorb a $1,500 bill inside that same $450.",
    [
      {
        id: "pay",
        label: "Pay $1,500",
        detail: "Uses cash, then a hardship bridge if cash is short and the cap allows it.",
        effect: { type: "expense", amountCents: usd(1500), description: "Roof repair.", waivedIfInsured: true },
      },
    ],
    { cooldownTurns: 4 },
  ),
  card(
    "vacancy-one",
    "unexpected",
    "One unit goes quiet",
    "If you own a rental, its income pauses for two months in this scenario. The loan does not pause.",
    "Vacancy is why a base-case cash flow is not a salary. The payment you owe is still in the expenses.",
    [acknowledge("Note the pause on the rental, if you have one.")],
    {
      requiresAssetType: "real_estate",
      cooldownTurns: 4,
    },
  ),
  card(
    "market-down",
    "market",
    "The lantern market drops",
    "Simulated prices fall 12%. Nothing here is a quote from a real exchange. If you hold no units, your cash does not move.",
    "An unrealized loss changes net worth and does not, by itself, change the cash you can spend. It becomes a realized loss only if you sell. This game marks the price and keeps the units.",
    [acknowledge("Mark the fictional prices.")],
    { cooldownTurns: 3, riskNote: "12% is a game event, not a forecast." },
  ),
  card(
    "market-up",
    "market",
    "The lantern market recovers",
    "Simulated prices rise 8%. The rise is not money in the bank.",
    "Net worth can improve while cash flow stays the same. That is the gap people feel when a statement looks rich and a bill is still due.",
    [acknowledge("Mark the fictional prices.")],
    { cooldownTurns: 3 },
  ),
  card(
    "course-night",
    "career",
    "A night course",
    "Pay $800 once. In this game your salary rises by $200 a month. Outside the game, a course does not come with that promise.",
    "Divide the cash you pay by the monthly raise and you get a payback period inside the rules. The raise is earned income. It is not an asset you can sell.",
    [
      {
        id: "take-course",
        label: "Pay $800",
        detail: "Salary becomes $200 higher each month, as a game rule.",
        effect: {
          type: "salary_delta",
          deltaCents: usd(200),
          costCents: usd(800),
          description: "Night course. The raise is a game assumption.",
        },
      },
      { id: "skip", label: "Skip", detail: "Keep the cash and the current salary.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 6 },
  ),
  card(
    "overtime",
    "salary",
    "A busy month",
    "A one-time $300 of overtime. It will not repeat unless another card says so.",
    "One-time earned cash is helpful and easy to mistake for a raise. Your monthly salary line does not change.",
    [
      {
        id: "collect",
        label: "Collect $300",
        detail: "Cash increases once.",
        effect: { type: "cash", deltaCents: usd(300), description: "Overtime pay.", transactionType: "earned_bonus" },
      },
    ],
  ),
  card(
    "side-hours",
    "career",
    "Extra Saturday hours",
    "A standing side shift. In this game other earned income rises by $250 a month. It still depends on you showing up.",
    "Earned income can fund investments. It is not itself passive. If the shift ends, the $250 ends with it.",
    [
      {
        id: "take-shift",
        label: "Take the shift",
        detail: "Adds $250 of earned income each month.",
        effect: { type: "living_delta", deltaCents: 0, description: "Placeholder" },
      },
      { id: "skip", label: "Keep your Saturdays", detail: "No change.", effect: { type: "noop" } },
    ],
  ),
  card(
    "fee-window",
    "tax",
    "A filing fee",
    "A fictional $350 fee. It is not a tax strategy and it does not describe your real return.",
    "Fees are cash out. They do not buy an asset. If cash is short, the hardship rule applies.",
    [
      {
        id: "pay",
        label: "Pay $350",
        detail: "Cash leaves.",
        effect: { type: "expense", amountCents: usd(350), description: "Filing fee." },
      },
    ],
    { cooldownTurns: 5 },
  ),
  card(
    "policy-offer",
    "insurance",
    "A three-month cover note",
    "Pay $300. For three turns, repair bills marked as covered cost nothing in this game. The premium is gone either way.",
    "Insurance is a purchase of a smaller surprise, not a profit center. Skip it only if the cash you keep is a reserve you will actually hold.",
    [
      {
        id: "insure",
        label: "Pay $300",
        detail: "Covers the next repair events for three turns.",
        effect: { type: "insure", turns: 3, premiumCents: usd(300), description: "Three-month cover note." },
      },
      { id: "skip", label: "Skip coverage", detail: "Keep the $300 and the risk.", effect: { type: "noop" } },
    ],
    { cooldownTurns: 4 },
  ),
  card(
    "gift-table",
    "charity",
    "The community table",
    "You may give $100. The game does not refund it, raise your income, or score it as an investment.",
    "A gift is a use of surplus, not a hidden deal. Giving money you need for a reserve is a different decision from giving money you can spare.",
    [
      {
        id: "give",
        label: "Give $100",
        detail: "Cash decreases. No asset is created.",
        effect: { type: "charity", amountCents: usd(100), description: "Gift to the community table." },
      },
      { id: "keep", label: "Not this turn", detail: "No gift.", effect: { type: "noop" } },
    ],
  ),
  card(
    "rest-bench",
    "rest",
    "Nothing is offered",
    "You sit. No one requires a purchase.",
    "Skipping a deal is a decision with a number attached: the cash you still have.",
    [acknowledge("End the turn when you are ready for the month to settle.")],
  ),
  card(
    "start-gate",
    "start",
    "Back at the gate",
    "Passing the gate does not pay you. Each ended turn already settled a month of income and spending.",
    "Some games pay a salary for crossing a square. This one pays the month when the turn ends, so the gate is only a landmark.",
    [acknowledge("Check cash flow before you roll again.")],
  ),
  card(
    "milestone-read",
    "milestone",
    "Read the gap",
    "Compare passive income with total monthly expenses. The gap is the definition of the rest of the game.",
    "If passive income is smaller than the month's expenses, net worth can still rise from saving the paycheck. That rise is useful and it is not the win condition.",
    [acknowledge("Look at the independence line.")],
  ),
  card(
    "statement-hour",
    "review",
    "Statement hour",
    "Trace one number to its source: cash, a loan payment, or an asset's income.",
    "If you cannot point to the entry that changed a number, do not trust the number. This game keeps a ledger for that reason.",
    [acknowledge("Open the statement if you have not.")],
  ),
  card(
    "rent-rise",
    "unexpected",
    "Your own rent rises",
    "Living expenses increase by $80 a month in this scenario. It is not a property you own. It is the cost of your household.",
    "A lifestyle increase is the opposite of a raise in passive income. The independence target moved.",
    [
      {
        id: "accept",
        label: "Update the budget",
        detail: "Living expenses rise by $80 each month.",
        effect: { type: "living_delta", deltaCents: usd(80), description: "Household rent increase." },
      },
    ],
    { cooldownTurns: 6 },
  ),
];

const sideHours = cards.find((item) => item.id === "side-hours");
if (sideHours) {
  sideHours.options[0] = {
    id: "take-shift",
    label: "Take the shift",
    detail: "Adds $250 of earned income each month. It is not passive.",
    effect: { type: "salary_delta", deltaCents: usd(250), costCents: 0, description: "Saturday shift." },
  };
}

export const vacancyEffect = {
  type: "pause_income" as const,
  assetType: "real_estate" as const,
  turns: 2,
  description: "A unit is vacant for two months.",
};

const vacancy = cards.find((item) => item.id === "vacancy-one");
if (vacancy) {
  vacancy.options = [
    {
      id: "acknowledge",
      label: "Record the vacancy",
      detail: "Rental income on one property pauses for two months.",
      effect: vacancyEffect,
    },
  ];
}

export const marketDownBps = -1200;
export const marketUpBps = 800;

const down = cards.find((item) => item.id === "market-down");
if (down) {
  down.options = [
    {
      id: "acknowledge",
      label: "Mark the drop",
      detail: "Fictional prices move down 12%.",
      effect: { type: "market_move", deltaBps: marketDownBps, description: "Simulated market drop of 12%." },
    },
  ];
}

const up = cards.find((item) => item.id === "market-up");
if (up) {
  up.options = [
    {
      id: "acknowledge",
      label: "Mark the rise",
      detail: "Fictional prices move up 8%.",
      effect: { type: "market_move", deltaBps: marketUpBps, description: "Simulated market rise of 8%." },
    },
  ];
}
