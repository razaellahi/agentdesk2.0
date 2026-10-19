import { describe, expect, it } from "vitest";
import { blankModel, fromFormDocument, toFormPayload, validateQmModel } from "./model";

describe("QM model payload", () => {
  it("rejects a scorecard whose sections do not total 100", () => {
    const model = blankModel();
    model.formTitle = "Greeting";
    model.sections[0]!.sectionName = "Opening";
    model.sections[0]!.sectionWeightage = "40";
    model.sections[0]!.attributes[0]!.label = "Greeted the customer";
    model.sections[0]!.attributes[0]!.options = [
      { label: "Yes", value: "yes", optionWeightage: "100" },
      { label: "No", value: "no", optionWeightage: "0" },
    ];
    expect(validateQmModel(model)).toBe("section-weight");
    model.sections[0]!.sectionWeightage = "100";
    expect(validateQmModel(model)).toBeNull();
  });

  it("round-trips a stored form into the unified-admin document", () => {
    const draft = fromFormDocument({
      id: "64b0c0a0e4b0c0a0e4b0c0a1",
      formTitle: "Greeting",
      formDescription: "Opening",
      enableWeightage: true,
      state: "published",
      sections: [
        {
          sectionName: "Opening",
          sectionKey: "opening",
          sectionWeightage: 100,
          attributes: [
            {
              label: "Greeted",
              key: "greeted",
              valueType: "mcq",
              attributeType: "OPTIONS",
              isRequired: true,
              attributeWeightage: 100,
              enableOptionWeightage: true,
              attributeOptions: {
                attributeData: [
                  {
                    values: [
                      { label: "Yes", value: "yes", optionWeightage: 100 },
                      { label: "No", value: "no", optionWeightage: 0 },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const payload = toFormPayload(draft);
    expect(payload).toMatchObject({
      id: "64b0c0a0e4b0c0a0e4b0c0a1",
      formTitle: "Greeting",
      enableWeightage: true,
      formWeightage: 100,
      state: "published",
      isDeleted: false,
    });
    const section = (
      payload.sections as { attributes: { attributeType: string; attributeOptions: unknown }[] }[]
    )[0]!;
    expect(section.attributes[0]).toMatchObject({
      attributeType: "OPTIONS",
      valueType: "mcq",
      key: "greeted",
    });
  });

  it("stores a paragraph question as a textarea", () => {
    const model = blankModel();
    model.enableWeightage = false;
    model.formTitle = "Notes";
    model.sections[0]!.sectionName = "Notes";
    model.sections[0]!.attributes[0] = {
      label: "Comment",
      helpText: "",
      valueType: "paragraph",
      isRequired: false,
      attributeWeightage: "",
      enableOptionWeightage: false,
      enableNotApplicable: false,
      options: [],
    };
    const payload = toFormPayload(model);
    expect(payload.formWeightage).toBeNull();
    const attribute = (payload.sections as { attributes: { attributeType: string }[] }[])[0]!.attributes[0]!;
    expect(attribute.attributeType).toBe("TEXTAREA");
  });
});
