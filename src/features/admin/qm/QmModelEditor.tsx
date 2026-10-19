import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirm } from "@/components/common/confirm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveQmModel } from "./api";
import {
  QUESTION_TYPES,
  blankQuestion,
  blankSection,
  defaultOptions,
  isOptionType,
  isWeightedChoice,
  validateQmModel,
  type QmModelDraft,
  type QmModelSummary,
  type QmQuestionDraft,
  type QmValidationCode,
  type QuestionType,
} from "./model";

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function QmModelEditor({
  initial,
  existing,
  onClose,
}: {
  initial: QmModelDraft;
  existing: QmModelSummary[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<QmValidationCode | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: async () => {
      const code = validateQmModel(draft, existing);
      setError(code);
      if (code) throw new Error(code);
      await saveQmModel(draft);
    },
    onSuccess: async () => {
      toast.success(t(initial.id ? "qm.updated-toast" : "qm.created"));
      await queryClient.invalidateQueries({ queryKey: ["qm-models"] });
      onClose();
    },
    onError: (cause: Error) => {
      if (
        !cause.message.startsWith("title-") &&
        !cause.message.endsWith("-required") &&
        cause.message !== "section-weight" &&
        !cause.message.startsWith("option") &&
        !cause.message.startsWith("question") &&
        !cause.message.startsWith("section") &&
        !cause.message.startsWith("description")
      ) {
        toast.error(cause.message);
      }
    },
  });

  async function close() {
    if (dirty && !(await confirm({ title: t("qm.discard-title"), description: t("qm.discard-body") })))
      return;
    onClose();
  }

  function updateQuestion(sectionIndex: number, questionIndex: number, next: QmQuestionDraft) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              attributes: section.attributes.map((question, qIndex) =>
                qIndex === questionIndex ? next : question,
              ),
            }
          : section,
      ),
    }));
  }

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Button type="button" variant="ghost" onClick={() => void close()}>
          {t("qm.back")}
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {initial.id ? t("qm.edit") : t("qm.new")}
        </h2>
        <Button type="submit" disabled={save.isPending}>
          {t("labels.save")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="qm-title">{t("qm.title-field")}</Label>
            <Input
              id="qm-title"
              value={draft.formTitle}
              maxLength={500}
              onChange={(event) => setDraft({ ...draft, formTitle: event.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="qm-state">{t("qm.state")}</Label>
            <select
              id="qm-state"
              className={selectClass}
              value={draft.state}
              onChange={(event) => setDraft({ ...draft, state: event.target.value as QmModelDraft["state"] })}
            >
              <option value="unpublished">{t("qm.unpublished")}</option>
              <option value="published">{t("qm.published")}</option>
            </select>
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label htmlFor="qm-description">{t("qm.description")}</Label>
            <Textarea
              id="qm-description"
              value={draft.formDescription}
              maxLength={1000}
              onChange={(event) => setDraft({ ...draft, formDescription: event.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={draft.enableWeightage}
              onCheckedChange={(checked) => setDraft({ ...draft, enableWeightage: checked })}
              aria-label={t("qm.weightage")}
            />
            {t("qm.weightage")}
          </label>
        </div>

        {draft.sections.map((section, sectionIndex) => (
          <section key={section.sectionKey ?? sectionIndex} className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-48 flex-1 gap-1.5">
                <Label htmlFor={`section-${sectionIndex}`}>{t("qm.section")}</Label>
                <Input
                  id={`section-${sectionIndex}`}
                  value={section.sectionName}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sections: draft.sections.map((row, index) =>
                        index === sectionIndex ? { ...row, sectionName: event.target.value } : row,
                      ),
                    })
                  }
                />
              </div>
              {draft.enableWeightage && (
                <div className="grid w-28 gap-1.5">
                  <Label htmlFor={`section-weight-${sectionIndex}`}>{t("qm.weight")}</Label>
                  <Input
                    id={`section-weight-${sectionIndex}`}
                    type="number"
                    min={0}
                    max={100}
                    value={section.sectionWeightage}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        sections: draft.sections.map((row, index) =>
                          index === sectionIndex ? { ...row, sectionWeightage: event.target.value } : row,
                        ),
                      })
                    }
                  />
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("qm.remove-section")}
                onClick={() =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.filter((_, index) => index !== sectionIndex),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
            {section.attributes.map((question, questionIndex) => (
              <QuestionFields
                key={question.key ?? questionIndex}
                question={question}
                weighted={draft.enableWeightage}
                onChange={(next) => updateQuestion(sectionIndex, questionIndex, next)}
                onRemove={() =>
                  setDraft({
                    ...draft,
                    sections: draft.sections.map((row, index) =>
                      index === sectionIndex
                        ? {
                            ...row,
                            attributes: row.attributes.filter((_, qIndex) => qIndex !== questionIndex),
                          }
                        : row,
                    ),
                  })
                }
              />
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  sections: draft.sections.map((row, index) =>
                    index === sectionIndex
                      ? { ...row, attributes: [...row.attributes, blankQuestion()] }
                      : row,
                  ),
                })
              }
            >
              <Plus />
              {t("qm.add-question")}
            </Button>
          </section>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft({ ...draft, sections: [...draft.sections, blankSection()] })}
        >
          <Plus />
          {t("qm.add-section")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive-text">
            {t(`qm.errors.${error}`)}
          </p>
        )}
      </div>
    </form>
  );
}

function QuestionFields({
  question,
  weighted,
  onChange,
  onRemove,
}: {
  question: QmQuestionDraft;
  weighted: boolean;
  onChange: (question: QmQuestionDraft) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const questionId = useId();
  const typeId = useId();
  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor={questionId}>{t("qm.question")}</Label>
          <Input
            id={questionId}
            value={question.label}
            onChange={(event) => onChange({ ...question, label: event.target.value })}
          />
        </div>
        <div className="grid w-44 gap-1.5">
          <Label htmlFor={typeId}>{t("qm.type")}</Label>
          <select
            id={typeId}
            className={selectClass}
            value={question.valueType}
            onChange={(event) => {
              const valueType = event.target.value as QuestionType;
              onChange({
                ...question,
                valueType,
                options: isOptionType(valueType) ? defaultOptions(valueType) : [],
              });
            }}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`qm.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        {weighted && (
          <div className="grid w-28 gap-1.5">
            <Label>{t("qm.weight")}</Label>
            <Input
              type="number"
              min={0}
              max={100}
              aria-label={t("qm.question-weight")}
              value={question.attributeWeightage}
              onChange={(event) => onChange({ ...question, attributeWeightage: event.target.value })}
            />
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("qm.remove-question")}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={question.isRequired}
          onCheckedChange={(checked) => onChange({ ...question, isRequired: checked === true })}
        />
        {t("qm.required")}
      </label>
      {isOptionType(question.valueType) && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("qm.options")}</p>
          {question.options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={t("qm.option")}
                value={option.label}
                onChange={(event) =>
                  onChange({
                    ...question,
                    options: question.options.map((row, optionIndex) =>
                      optionIndex === index ? { ...row, label: event.target.value } : row,
                    ),
                  })
                }
              />
              {weighted && isWeightedChoice(question.valueType) && (
                <Input
                  className="w-24"
                  type="number"
                  min={0}
                  max={100}
                  aria-label={t("qm.option-weight")}
                  value={option.optionWeightage}
                  onChange={(event) =>
                    onChange({
                      ...question,
                      options: question.options.map((row, optionIndex) =>
                        optionIndex === index ? { ...row, optionWeightage: event.target.value } : row,
                      ),
                    })
                  }
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("qm.remove-option")}
                onClick={() =>
                  onChange({
                    ...question,
                    options: question.options.filter((_, optionIndex) => optionIndex !== index),
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onChange({
                ...question,
                options: [...question.options, { label: "", value: "", optionWeightage: "0" }],
              })
            }
          >
            <Plus />
            {t("qm.add-option")}
          </Button>
        </div>
      )}
    </div>
  );
}
