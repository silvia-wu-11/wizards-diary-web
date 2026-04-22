/**
 * ConfirmActionModal 组件测试：
 * 覆盖默认英文文案、关闭操作与提交中状态展示。
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmActionModal } from "../ConfirmActionModal";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
    }) => <div {...props}>{children}</div>,
  },
}));

afterEach(() => {
  cleanup();
});

describe("ConfirmActionModal", () => {
  it("在未传 cancelText 时展示默认英文文案，并支持关闭", () => {
    const handleClose = vi.fn();

    render(
      <ConfirmActionModal
        isOpen
        onClose={handleClose}
        onConfirm={vi.fn()}
        isSubmitting={false}
        title="Forget this page?"
        description="This page will be lost to the ashes."
        confirmText="Discard"
      />,
    );

    expect(screen.getByText("Forget this page?")).not.toBeNull();
    expect(
      screen.getByText("This page will be lost to the ashes."),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Keep It" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Discard" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Keep It" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("提交中展示英文加载文案并禁用确认按钮", () => {
    render(
      <ConfirmActionModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isSubmitting
        title="Forget this page?"
        description="This page will be lost to the ashes."
        confirmText="Discard"
      />,
    );

    expect(
      screen.getByRole("button", { name: /Working the Spell/i }),
    ).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Discard" })).toBeNull();
  });
});
