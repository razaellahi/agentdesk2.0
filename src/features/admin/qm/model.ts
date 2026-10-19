/**
 * Quality-management questionnaires stored as unified-admin forms.
 * These are the scorecards reviews are answered against.
 */

export const QUESTION_TYPES = [
  "mcq",
  "dropdown",
  "checkbox",
  "5-star-rating",
  "nps",
  "boolean",
  "shortAnswer",
  "paragraph",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

const OPTION_TYPES = new Set<QuestionType>([
  "mcq",
  "dropdown",
  "checkbox",
  "5-star-rating",
  "nps",
  "boolean",
]);
const WEIGHTED_CHOICE = new Set<QuestionType>(["mcq", "dropdown"]);

export interface QmOptionDraft {
  label: string;
  value: string;
  optionWeightage: string;
}

export interface QmQuestionDraft {
  key?: string;
  label: string;
  helpText: string;
  valueType: QuestionType;
  isRequired: boolean;
  attributeWeightage: string;
  enableOptionWeightage: boolean;
  enableNotApplicable: boolean;
  options: QmOptionDraft[];
}

export interface QmSectionDraft {
  sectionKey?: string;
  sectionName: string;
  sectionDescription: string;
  sectionWeightage: string;
  attributes: QmQuestionDraft[];
}

export interface QmModelDraft {
  id?: string;
  formTitle: string;
  formDescription: string;
  enableWeightage: boolean;
  state: "published" | "unpublished";
  sections: QmSectionDraft[];
}

export interface QmModelSummary {
  id: string;
  formTitle: string;
  formDescription: string;
  state: "published" | "unpublished";
  enableWeightage: boolean;
  updatedAt?: string | null;
}

export type QmValidationCode =
  | "title-required"
  | "title-long"
  | "description-long"
  | "title-duplicate"
  | "section-required"
  | "section-name"
  | "question-required"
  | "question-label"
  | "options-required"
  | "options-unique"
  | "option-weight"
  | "section-weight";

export function isOptionType(valueType: QuestionType): boolean {
  return OPTION_TYPES.has(valueType);
}

export function isWeightedChoice(valueType: QuestionType): boolean {
  return WEIGHTED_CHOICE.has(valueType);
}

export function attributeType(valueType: QuestionType): "INPUT" | "OPTIONS" | "TEXTAREA" {
  if (valueType === "paragraph") return "TEXTAREA";
  if (OPTION_TYPES.has(valueType)) return "OPTIONS";
  return "INPUT";
}

export function defaultOptions(valueType: QuestionType): QmOptionDraft[] {
  if (valueType === "5-star-rating") {
    return [1, 2, 3, 4, 5].map((n) => ({
      label: String(n),
      value: String(n),
      optionWeightage: String(n * 20),
    }));
  }
  if (valueType === "nps") {
    return Array.from({ length: 11 }, (_, n) => ({
      label: String(n),
      value: String(n),
      optionWeightage: String(n * 10),
    }));
  }
  if (valueType === "boolean") {
    return [
      { label: "Yes", value: "true", optionWeightage: "100" },
      { label: "No", value: "false", optionWeightage: "0" },
    ];
  }
  return [
    { label: "", value: "", optionWeightage: "0" },
    { label: "", value: "", optionWeightage: "100" },
  ];
}

export function blankQuestion(valueType: QuestionType = "mcq"): QmQuestionDraft {
  return {
    label: "",
    helpText: "",
    valueType,
    isRequired: true,
    attributeWeightage: "",
    enableOptionWeightage: true,
    enableNotApplicable: false,
    options: defaultOptions(valueType),
  };
}

export function blankSection(): QmSectionDraft {
  return {
    sectionName: "",
    sectionDescription: "",
    sectionWeightage: "100",
    attributes: [{ ...blankQuestion(), attributeWeightage: "100" }],
  };
}

export function blankModel(): QmModelDraft {
  return {
    formTitle: "",
    formDescription: "",
    enableWeightage: true,
    state: "unpublished",
    sections: [blankSection()],
  };
}

function optionFromApi(value: {
  label?: string;
  value?: string | number | boolean | null;
  optionWeightage?: number | null;
}): QmOptionDraft {
  return {
    label: value.label ?? "",
    value: value.value == null ? "" : String(value.value),
    optionWeightage: value.optionWeightage == null ? "" : String(value.optionWeightage),
  };
}

export function fromFormDocument(doc: Record<string, unknown>): QmModelDraft {
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  return {
    id: String(doc.id ?? doc._id ?? ""),
    formTitle: String(doc.formTitle ?? ""),
    formDescription: String(doc.formDescription ?? ""),
    enableWeightage: Boolean(doc.enableWeightage),
    state: doc.state === "published" ? "published" : "unpublished",
    sections:
      sections.length === 0
        ? [blankSection()]
        : sections.map((section) => {
            const row = section as Record<string, unknown>;
            const attributes = Array.isArray(row.attributes) ? row.attributes : [];
            return {
              sectionKey: typeof row.sectionKey === "string" ? row.sectionKey : undefined,
              sectionName: String(row.sectionName ?? ""),
              sectionDescription: String(row.sectionDescription ?? ""),
              sectionWeightage: row.sectionWeightage == null ? "" : String(row.sectionWeightage),
              attributes: attributes.map((attribute) => {
                const question = attribute as Record<string, unknown>;
                const valueType = QUESTION_TYPES.includes(question.valueType as QuestionType)
                  ? (question.valueType as QuestionType)
                  : "shortAnswer";
                const optionsRoot = question.attributeOptions as
                  { attributeData?: { values?: unknown[] }[] } | undefined;
                const values = optionsRoot?.attributeData?.[0]?.values ?? [];
                return {
                  key: typeof question.key === "string" ? question.key : undefined,
                  label: String(question.label ?? ""),
                  helpText: String(question.helpText ?? ""),
                  valueType,
                  isRequired: Boolean(question.isRequired),
                  attributeWeightage:
                    question.attributeWeightage == null ? "" : String(question.attributeWeightage),
                  enableOptionWeightage: Boolean(question.enableOptionWeightage),
                  enableNotApplicable: Boolean(question.enableNotApplicable),
                  options: OPTION_TYPES.has(valueType)
                    ? (
                        values as {
                          label?: string;
                          value?: string | number | boolean | null;
                          optionWeightage?: number | null;
                        }[]
                      ).map(optionFromApi)
                    : [],
                };
              }),
            };
          }),
  };
}

export function validateQmModel(
  model: QmModelDraft,
  existing: { id: string; formTitle: string }[] = [],
): QmValidationCode | null {
  const title = model.formTitle.trim();
  if (!title) return "title-required";
  if (title.length > 500) return "title-long";
  if (model.formDescription.length > 1000) return "description-long";
  if (
    existing.some((row) => row.id !== model.id && row.formTitle.trim().toLowerCase() === title.toLowerCase())
  ) {
    return "title-duplicate";
  }
  if (model.sections.length === 0) return "section-required";
  if (model.enableWeightage) {
    const total = model.sections.reduce((sum, section) => sum + (Number(section.sectionWeightage) || 0), 0);
    if (total !== 100) return "section-weight";
  }
  for (const section of model.sections) {
    if (!section.sectionName.trim()) return "section-name";
    if (section.attributes.length === 0) return "question-required";
    for (const question of section.attributes) {
      if (!question.label.trim()) return "question-label";
      if (!OPTION_TYPES.has(question.valueType)) continue;
      const labels = question.options.map((option) => option.label.trim()).filter(Boolean);
      if (labels.length < 2) return "options-required";
      if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) return "options-unique";
      if (model.enableWeightage && WEIGHTED_CHOICE.has(question.valueType)) {
        for (const option of question.options) {
          if (!option.label.trim()) continue;
          const weight = option.optionWeightage === "" ? Number.NaN : Number(option.optionWeightage);
          if (!Number.isFinite(weight) || weight < 0 || weight > 100) return "option-weight";
        }
      }
    }
  }
  return null;
}

function uniqueKey(label: string, used: Set<string>, fallback: string): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  let key = base;
  let n = 2;
  while (used.has(key)) key = `${base}-${n++}`;
  used.add(key);
  return key;
}

function optionValue(valueType: QuestionType, option: QmOptionDraft): string | number | boolean {
  if (valueType === "boolean") return option.value === "true";
  if (valueType === "5-star-rating" || valueType === "nps") return Number(option.value);
  return option.value || option.label.trim();
}

/** Form document accepted by unified-admin POST/PUT `/forms`. */
export function toFormPayload(model: QmModelDraft): Record<string, unknown> {
  const sectionKeys = new Set<string>();
  const payload: Record<string, unknown> = {
    formTitle: model.formTitle.trim(),
    formDescription: model.formDescription.trim(),
    enableWeightage: model.enableWeightage,
    isDeleted: false,
    formWeightage: model.enableWeightage ? 100 : null,
    state: model.state,
    sections: model.sections.map((section, sectionIndex) => {
      const questionKeys = new Set<string>();
      return {
        sectionName: section.sectionName.trim(),
        sectionKey:
          section.sectionKey || uniqueKey(section.sectionName, sectionKeys, `section-${sectionIndex + 1}`),
        sectionDescription: section.sectionDescription.trim(),
        sectionWeightage: model.enableWeightage ? Number(section.sectionWeightage) || 0 : null,
        attributes: section.attributes.map((question) => {
          const valueType = question.valueType;
          const row: Record<string, unknown> = {
            label: question.label.trim(),
            helpText: question.helpText.trim(),
            key: question.key || uniqueKey(question.label, questionKeys, "question"),
            attributeType: attributeType(valueType),
            valueType,
            isRequired: question.isRequired,
            attributeWeightage: model.enableWeightage ? Number(question.attributeWeightage) || 0 : null,
            enableOptionWeightage: Boolean(model.enableWeightage && question.enableOptionWeightage),
            enableNotApplicable: Boolean(
              model.enableWeightage && WEIGHTED_CHOICE.has(valueType) && question.enableNotApplicable,
            ),
          };
          if (OPTION_TYPES.has(valueType)) {
            row.attributeOptions = {
              enableCategory: false,
              enableStyle: valueType === "5-star-rating" || valueType === "nps",
              reverseOrder: false,
              isMultipleChoice: valueType === "checkbox",
              attributeData: [
                {
                  label: "",
                  values: question.options
                    .filter((option) => option.label.trim())
                    .map((option) => ({
                      label: option.label.trim(),
                      value: optionValue(valueType, option),
                      optionWeightage:
                        model.enableWeightage && WEIGHTED_CHOICE.has(valueType)
                          ? Number(option.optionWeightage) || 0
                          : null,
                    })),
                },
              ],
            };
          }
          return row;
        }),
      };
    }),
  };
  if (model.id) payload.id = model.id;
  return payload;
}
