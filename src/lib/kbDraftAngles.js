/** Labels for company research draft `angle` keys (kbDocuments.angle). */
export const KB_DRAFT_ANGLE_LABELS = {
  mission_values: "Mission & values",
  strategic_priorities: "Strategic priorities",
  leadership: "Leadership",
  products_recent: "Products",
  role_summary: "Your role",
  role_expectations: "Role expectations",
  stakeholders_implied: "Likely stakeholders",
  culture_signals: "Culture signals",
  industry_position: "Industry position",
  risks_open_questions: "Questions to ask",
};

export function kbDraftAngleLabel(angle) {
  if (!angle) return "Company context";
  return KB_DRAFT_ANGLE_LABELS[angle] || "Company context";
}
