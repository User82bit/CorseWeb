import assert from "node:assert/strict";
import test from "node:test";
import { isLocale, resolveLocale } from "./locale.ts";

const supportedLocales = ["pt-BR", "en", "es"];
const defaultLocale = "pt-BR";

test("prefers a valid saved locale over browser language", () => {
    assert.equal(resolveLocale("es", "en-US", supportedLocales, defaultLocale), "es");
});

test("uses an exact supported browser locale when no saved locale exists", () => {
    assert.equal(resolveLocale(null, "pt-BR", supportedLocales, defaultLocale), "pt-BR");
});

test("matches a supported language from a regional browser locale", () => {
    assert.equal(resolveLocale(undefined, "en-US", supportedLocales, defaultLocale), "en");
    assert.equal(resolveLocale(undefined, "es-MX", supportedLocales, defaultLocale), "es");
});

test("normalizes browser locale casing and underscore separators", () => {
    assert.equal(resolveLocale(null, "PT_br", supportedLocales, defaultLocale), "pt-BR");
});

test("ignores an unsupported saved locale and falls back to the browser language", () => {
    assert.equal(resolveLocale("fr", "es-ES", supportedLocales, defaultLocale), "es");
});

test("uses the configured default when browser locale is missing or unsupported", () => {
    assert.equal(resolveLocale(undefined, undefined, supportedLocales, defaultLocale), "pt-BR");
    assert.equal(resolveLocale(null, "fr-FR", supportedLocales, defaultLocale), "pt-BR");
    assert.equal(resolveLocale(null, "", supportedLocales, defaultLocale), "pt-BR");
});

test("validates stored locale values without coercion", () => {
    assert.equal(isLocale("en", supportedLocales), true);
    assert.equal(isLocale("EN", supportedLocales), false);
    assert.equal(isLocale(42, supportedLocales), false);
    assert.equal(isLocale(null, supportedLocales), false);
});
