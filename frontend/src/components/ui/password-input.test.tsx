import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("masks the value until the outline eye control is toggled", () => {
    const onChange = vi.fn();
    render(
      <form>
        <label htmlFor="secret">Password</label>
        <PasswordInput
          id="secret"
          autoComplete="current-password"
          value="hidden-value"
          onChange={onChange}
        />
        <button type="submit">Submit</button>
      </form>,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toHaveValue("hidden-value");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("type", "button");
    fireEvent.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("hidden-value");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("hidden-value");
  });
});
