import { Component, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";
import { createLogger } from "@/core/logging/logger";

const log = createLogger("transcript");

interface Props extends WithTranslation {
  messageId: string;
  children: ReactNode;
  /** Replaces the quiet one-line placeholder, for boundaries around a whole transcript. */
  fallback?: ReactNode;
}

/**
 * One activity that cannot be drawn (an unexpected shape from the server) must not
 * take the whole page down: it shows a quiet placeholder and the rest of the
 * transcript keeps working.
 */
class Boundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    log.warn(`message ${this.props.messageId} could not be displayed`, error);
  }

  override componentDidUpdate(prev: Props) {
    if (prev.messageId !== this.props.messageId && this.state.failed) this.setState({ failed: false });
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <p role="status" className="px-8 py-1.5 text-center text-xs text-muted-foreground/80">
        {this.props.t("workspace.activity-unavailable")}
      </p>
    );
  }
}

export const MessageBoundary = withTranslation()(Boundary);
