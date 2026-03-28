import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders with default props", () => {
    render(<Badge>Badge Text</Badge>);
    const badge = screen.getByText("Badge Text");
    expect(badge).toBeInTheDocument();
  });

  it("renders with variant prop", () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-destructive");
  });

  it("renders with outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-foreground");
  });

  it("renders with custom className", () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-badge");
  });

  it("has data-slot attribute", () => {
    render(<Badge>Test</Badge>);
    const badge = screen.getByText("Test");
    expect(badge).toHaveAttribute("data-slot", "badge");
  });

  it("renders as span by default", () => {
    render(<Badge data-testid="badge">Span Badge</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.tagName.toLowerCase()).toBe("span");
  });
});
