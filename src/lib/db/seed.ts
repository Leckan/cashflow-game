import postgres from "postgres";
import { catalog } from "../../features/game/content/index.ts";
import { RULES_VERSION } from "../../features/game/types.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log("DATABASE_URL is not set. The playable catalog already lives in src/features/game/content.");
  process.exit(0);
}

const sql = postgres(databaseUrl, { max: 1 });
for (const space of catalog.board) {
  await sql`
    INSERT INTO board_spaces (id, board_version, position, name, category, visual_config, event_config)
    VALUES (${`${RULES_VERSION}:${space.id}`}, ${RULES_VERSION}, ${space.position}, ${space.name}, ${space.category}, ${sql.json({ accent: space.accent })}, ${sql.json({ summary: space.summary })})
    ON CONFLICT (id) DO NOTHING
  `;
}
for (const card of catalog.cards) {
  await sql`
    INSERT INTO event_cards (id, deck_version, title, category, description, effect_config, eligibility_config, educational_explanation)
    VALUES (
      ${`${RULES_VERSION}:${card.id}`},
      ${RULES_VERSION},
      ${card.title},
      ${card.category},
      ${card.description},
      ${sql.json({ options: card.options })},
      ${sql.json({ requiresAssetType: card.requiresAssetType ?? null, minCashCents: card.minCashCents ?? null })},
      ${card.educationalExplanation}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}
for (const challenge of catalog.challenges) {
  await sql`
    INSERT INTO challenges (id, title, description, objective_config, difficulty, is_published)
    VALUES (${challenge.id}, ${challenge.title}, ${challenge.description}, ${sql.json(challenge.objective)}, ${challenge.difficulty}, true)
    ON CONFLICT (id) DO NOTHING
  `;
}
await sql.end();
console.log(`Seeded ${catalog.board.length} spaces, ${catalog.cards.length} cards, and ${catalog.challenges.length} challenges.`);
