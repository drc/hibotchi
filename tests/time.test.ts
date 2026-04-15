import { describe, expect, it } from "vitest";
import {
  compareDateStrings,
  formatReminderMessage,
  isBeforeChicagoNoon,
  isChicagoNoon,
  isValidDateString,
} from "@/time";

describe("time helpers", () => {
  it("validates YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-05-10")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("05-10-2026")).toBe(false);
  });

  it("compares date strings lexically", () => {
    expect(compareDateStrings("2026-05-10", "2026-05-10")).toBe(0);
    expect(compareDateStrings("2026-05-09", "2026-05-10")).toBeLessThan(0);
    expect(compareDateStrings("2026-05-11", "2026-05-10")).toBeGreaterThan(0);
  });

  it("detects before noon in Chicago", () => {
    expect(isBeforeChicagoNoon(new Date("2026-04-04T16:30:00.000Z"))).toBe(true);
    expect(isBeforeChicagoNoon(new Date("2026-04-04T17:30:00.000Z"))).toBe(false);
  });

  it("gates scheduled work to the noon quarter hour", () => {
    expect(isChicagoNoon(new Date("2026-04-04T17:05:00.000Z"))).toBe(true);
    expect(isChicagoNoon(new Date("2026-04-04T17:20:00.000Z"))).toBe(false);
  });

  it("formats reminder messages", () => {
    expect(formatReminderMessage("Vacation", "2026-05-10", "2026-05-09")).toContain("<t:");
    expect(formatReminderMessage("Vacation", "2026-05-10", "2026-05-10")).toContain("is today");
    expect(formatReminderMessage("Vacation", "2026-05-10", "2026-05-11")).toBeNull();
  });
});
