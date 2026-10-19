import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CimMessage } from "../../model/types";
import { messageText } from "../../model/outgoing";
import { Media } from "./Media";
import { RichText } from "./RichText";
import { httpLink } from "../../model/links";

interface Choice {
  id?: string;
  title?: string;
  payload?: string;
  type?: string;
  isSelected?: boolean;
  description?: string;
  url?: string;
}
interface Card {
  text?: string;
  additionalCarouselElementDetails?: { id?: string; title?: string; image_url?: string };
  buttons?: Choice[];
}
function Choices({ choices }: { choices: Choice[] }) {
  return (
    <ul className="mt-2 grid gap-1.5">
      {choices.map((choice, index) => {
        const href = httpLink(choice.url ?? (choice.type === "linkButton" ? choice.payload : undefined));
        return (
          <li
            key={choice.id ?? index}
            className={`rounded-md border px-2 py-1.5 text-center text-xs ${choice.isSelected ? "border-primary bg-primary-soft text-primary" : "text-muted-foreground"}`}
          >
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {choice.title ?? choice.payload}
              </a>
            ) : (
              <span>
                {choice.title ?? choice.payload}
                {choice.isSelected && <span className="sr-only"> (selected)</span>}
              </span>
            )}
            {choice.description && <p className="mt-1 text-muted-foreground">{choice.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
/** Source carousel fields and structured content remain readable in a transcript; choices are historical. */
export function StructuredBody({ message, formatting }: { message: CimMessage; formatting: boolean }) {
  const [slide, setSlide] = useState(0);
  const elements = (Array.isArray(message.body.elements) ? message.body.elements : []) as Card[];
  const interactive = (
    message.body.additionalDetails as
      | {
          interactive?: {
            header?: { text?: string };
            body?: { text?: string };
            footer?: { text?: string };
            action?: { sections?: { title?: string; rows?: Choice[] }[] };
          };
        }
      | undefined
  )?.interactive;
  const sections = interactive?.action?.sections ?? [];
  const choices = (Array.isArray(message.body.buttons) ? message.body.buttons : []) as Choice[];
  const card = elements[Math.min(slide, elements.length - 1)];
  return (
    <div className="min-w-0 space-y-2 text-sm">
      {interactive?.header?.text && <p className="font-semibold">{interactive.header.text}</p>}
      <p className="whitespace-pre-wrap">
        <RichText text={interactive?.body?.text ?? messageText(message)} formatting={formatting} />
      </p>
      {card && (
        <section
          className="overflow-hidden rounded-lg border"
          aria-label={`Carousel card ${Math.min(slide + 1, elements.length)} of ${elements.length}`}
        >
          {card.additionalCarouselElementDetails?.image_url && (
            <Media
              url={card.additionalCarouselElementDetails.image_url}
              kind="image"
              name={card.additionalCarouselElementDetails.title}
            />
          )}
          <div className="p-3">
            <p className="font-semibold">{card.additionalCarouselElementDetails?.title}</p>
            <p className="mt-1 whitespace-pre-wrap">
              <RichText text={card.text ?? ""} formatting={formatting} />
            </p>
            <Choices choices={card.buttons ?? []} />
          </div>
          <div className="flex items-center justify-between border-t p-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Previous carousel card"
              disabled={slide === 0}
              onClick={() => setSlide((index) => Math.max(0, index - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="text-xs text-muted-foreground">
              {Math.min(slide + 1, elements.length)} / {elements.length}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Next carousel card"
              disabled={slide >= elements.length - 1}
              onClick={() => setSlide((index) => Math.min(elements.length - 1, index + 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </section>
      )}
      <Choices choices={choices} />
      {sections.map((section, index) => (
        <section key={index}>
          <p className="text-xs font-semibold text-muted-foreground">{section.title}</p>
          <Choices choices={section.rows ?? []} />
        </section>
      ))}
      {interactive?.footer?.text && (
        <p className="text-xs text-muted-foreground">{interactive.footer.text}</p>
      )}
    </div>
  );
}
