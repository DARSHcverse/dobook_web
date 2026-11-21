import { test } from "node:test";
import assert from "node:assert/strict";
import { contrastText, sanitizeHex } from "../brandTheme.js";
import { safePaymentLink } from "../paymentLink.js";

test("brand text colour stays readable", () => {
  assert.equal(contrastText("#E8193C"), "#FFFFFF", "DoBook crimson keeps white text");
  assert.equal(contrastText("#1E88E5"), "#FFFFFF");
  assert.equal(contrastText("#000000"), "#FFFFFF");
  assert.equal(contrastText("#FFE600"), "#18181B", "yellow gets dark text");
  assert.equal(contrastText("#A7F3D0"), "#18181B", "pastel gets dark text");
  assert.equal(contrastText("#FFFFFF"), "#18181B");
});

test("brand colour input is validated (it is injected into CSS)", () => {
  assert.equal(sanitizeHex("#1e88e5"), "#1E88E5");
  assert.equal(sanitizeHex("red"), "#E8193C");
  assert.equal(sanitizeHex("#fff;}body{display:none"), "#E8193C");
  assert.equal(sanitizeHex(null), "#E8193C");
});

test("payment links allow http(s) only", () => {
  assert.equal(safePaymentLink("https://buy.stripe.com/abc"), "https://buy.stripe.com/abc");
  assert.equal(safePaymentLink("paypal.me/x"), "https://paypal.me/x", "scheme-less links get https");
  for (const bad of ["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,x", "vbscript:x", "not a url at all", "", null]) {
    assert.equal(safePaymentLink(bad), "", String(bad));
  }
});
