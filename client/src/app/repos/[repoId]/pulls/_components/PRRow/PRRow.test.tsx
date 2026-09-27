/** PRRow — the COST column: the PR's total run cost, "—" (never "$0.00") when unpriced. */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { PrMeta } from "@devdigest/shared";
import messages from "../../../../../../../messages/en/prReview.json";
import { PRRow } from "./PRRow";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

function renderRow(o: Partial<PrMeta>) {
  const pr: PrMeta = {
    number: 482,
    title: "Add rate limiting to public API endpoints",
    author: "marisa.koch",
    branch: "feat/rate-limit-public",
    base: "main",
    head_sha: "a1b2c3d4",
    additions: 247,
    deletions: 38,
    files_count: 9,
    status: "needs_review",
    updated_at: new Date().toISOString(),
    score: 61,
    ...o,
  };
  return render(
    <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
      <PRRow pr={pr} repoId="r1" />
    </NextIntlClientProvider>,
  );
}

describe("PRRow — COST column", () => {
  it("shows the PR's total cost", () => {
    renderRow({ cost_usd: 0.0027 });
    expect(screen.getByText("$0.0027")).toBeInTheDocument();
  });

  it("an unpriced PR shows '—', not '$0.00'", () => {
    renderRow({ cost_usd: null });
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });
});
