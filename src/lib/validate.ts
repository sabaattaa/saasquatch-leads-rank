import { ValidationFlag } from "./types";

const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

export function validateLead(input: {
  email: string | null;
  domain: string;
  contactName: string;
  title: string;
  company: string;
}): ValidationFlag[] {
  const flags: ValidationFlag[] = [];
  const domain = normalizeDomain(input.domain || "");

  if (!input.email) {
    flags.push("email_missing");
  } else if (!EMAIL_RE.test(input.email)) {
    flags.push("email_invalid");
  } else {
    const emailDomain = input.email.split("@")[1]?.toLowerCase();
    if (emailDomain && DISPOSABLE.has(emailDomain)) {
      flags.push("disposable_domain");
    } else if (emailDomain && domain && emailDomain !== domain) {
      // personal gmail on a company lead isn't always wrong, but flag it
      const free = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
      if (!free.includes(emailDomain)) {
        flags.push("domain_mismatch");
      }
    } else {
      flags.push("email_ok");
    }
  }

  const incomplete =
    !input.contactName?.trim() ||
    !input.title?.trim() ||
    !input.company?.trim() ||
    !domain;
  if (incomplete) flags.push("incomplete_profile");

  return flags;
}
